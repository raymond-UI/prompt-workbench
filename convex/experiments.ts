"use node";

import { action } from "./_generated/server";
import { api, components, internal } from "./_generated/api";
import { LLMCache } from "@mzedstudio/llm-cache";
import { v } from "convex/values";
import OpenAI from "openai";

const cache = new LLMCache(components.llmCache);

// ---------------------------------------------------------------------------
// OpenRouter client
// ---------------------------------------------------------------------------

function getClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Run: npx convex env set OPENROUTER_API_KEY <your-key>",
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });
}

async function callLLM(
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number,
) {
  const client = getClient();
  const start = Date.now();
  const completion = await client.chat.completions.create({
    model,
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
    temperature,
  });
  const latencyMs = Date.now() - start;

  return {
    response: {
      choices: completion.choices.map((c) => ({
        message: {
          role: c.message.role,
          content: c.message.content ?? "",
        },
        finish_reason: c.finish_reason,
      })),
      model: completion.model,
      usage: completion.usage
        ? {
            prompt_tokens: completion.usage.prompt_tokens,
            completion_tokens: completion.usage.completion_tokens,
            total_tokens: completion.usage.total_tokens,
          }
        : undefined,
    },
    latencyMs,
  };
}

// ---------------------------------------------------------------------------
// Run a single prompt against one model (with caching)
// ---------------------------------------------------------------------------

export const runSingle = action({
  args: {
    messages: v.array(v.object({ role: v.string(), content: v.string() })),
    model: v.string(),
    temperature: v.number(),
    tag: v.optional(v.string()),
    pin: v.optional(v.boolean()),
    modelVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Rate limit: 1 LLM call
    await ctx.runMutation(internal.rateLimits.checkLlmCallLimit, { count: 1 });

    const request = {
      messages: args.messages,
      model: args.model,
      temperature: args.temperature,
    };

    const cached = await cache.lookup(ctx, {
      request,
      modelVersion: args.modelVersion,
    });

    if (cached) {
      return {
        model: args.model,
        response: cached.response,
        fromCache: true,
        cacheKey: cached.cacheKey,
        hitCount: cached.hitCount,
        ttlTier: cached.ttlTier,
        latencyMs: 0,
      };
    }

    const { response, latencyMs } = await callLLM(
      args.model,
      args.messages,
      args.temperature,
    );

    const tags = args.tag ? [args.tag] : undefined;
    const cacheKey = await cache.store(ctx, {
      request,
      response,
      tags,
      pin: args.pin,
      modelVersion: args.modelVersion,
    });

    return {
      model: args.model,
      response,
      fromCache: false,
      cacheKey,
      hitCount: 0,
      ttlTier: args.pin ? 2 : 0,
      latencyMs,
    };
  },
});

// ---------------------------------------------------------------------------
// Run the same prompt against multiple models (parallel experiment)
// ---------------------------------------------------------------------------

export const runExperiment = action({
  args: {
    messages: v.array(v.object({ role: v.string(), content: v.string() })),
    models: v.array(v.string()),
    temperature: v.number(),
    tag: v.optional(v.string()),
    pin: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
    modelVersion: v.optional(v.string()),
    forceRefresh: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Rate limit: count = number of models (pessimistic — before cache check)
    const modelCount = args.models.length;
    if (args.forceRefresh) {
      await ctx.runMutation(internal.rateLimits.checkForceRefreshLimit, {
        count: modelCount,
      });
    }
    await ctx.runMutation(internal.rateLimits.checkLlmCallLimit, {
      count: modelCount,
    });

    const results = await Promise.all(
      args.models.map(async (model) => {
        const request = {
          messages: args.messages,
          model,
          temperature: args.temperature,
        };

        // Skip cache lookup when force-refreshing (enables time travel)
        if (!args.forceRefresh) {
          const cached = await cache.lookup(ctx, {
            request,
            modelVersion: args.modelVersion,
          });

          if (cached) {
            // Re-store to update tags/metadata/pin on existing entries
            const tags = args.tag ? [args.tag] : undefined;
            if (tags || args.metadata || args.pin) {
              await cache.store(ctx, {
                request,
                response: cached.response,
                tags,
                pin: args.pin,
                metadata: args.metadata,
                modelVersion: args.modelVersion,
              });
            }

            return {
              model,
              response: cached.response,
              fromCache: true,
              cacheKey: cached.cacheKey,
              hitCount: cached.hitCount,
              ttlTier: args.pin ? 2 : cached.ttlTier,
              latencyMs: 0,
            };
          }
        }

        const { response, latencyMs } = await callLLM(
          model,
          args.messages,
          args.temperature,
        );

        const tags = args.tag ? [args.tag] : undefined;
        const cacheKey = await cache.store(ctx, {
          request,
          response,
          tags,
          pin: args.pin,
          metadata: args.metadata,
          modelVersion: args.modelVersion,
        });

        return {
          model,
          response,
          fromCache: false,
          cacheKey,
          hitCount: 0,
          ttlTier: args.pin ? 2 : 0,
          latencyMs,
        };
      }),
    );

    return results;
  },
});

// ---------------------------------------------------------------------------
// Peek – read-only cache probe (no hit count increment)
// ---------------------------------------------------------------------------

export const peekExperiment = action({
  args: {
    messages: v.array(v.object({ role: v.string(), content: v.string() })),
    models: v.array(v.string()),
    temperature: v.number(),
    modelVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const results = await Promise.all(
      args.models.map(async (model) => {
        const request = {
          messages: args.messages,
          model,
          temperature: args.temperature,
        };

        const cached = await cache.peek(ctx, {
          request,
          modelVersion: args.modelVersion,
        });

        return {
          model,
          cached: !!cached,
          cacheKey: cached?.cacheKey ?? null,
          hitCount: cached?.hitCount ?? 0,
          ttlTier: cached?.ttlTier ?? 0,
        };
      }),
    );

    return results;
  },
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

export const cleanupExpired = action({
  args: {
    batchSize: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await cache.cleanup(ctx, args);
  },
});

// ---------------------------------------------------------------------------
// Model Selection from OpenRouter
// ---------------------------------------------------------------------------

export const getOpenRouterModels = action({
  args: {},
  handler: async (ctx) => {
    // Rate limit: model refresh (3/hour)
    await ctx.runMutation(internal.rateLimits.checkModelRefreshLimit, {});

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not set.");
    }

    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://prompt-workbench.vercel.app",
        "X-Title": "Prompt Workbench",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const { data } = (await response.json()) as { data: any[] };

    // Sync to database for fast query access
    await ctx.runMutation(api.models.syncModels, { models: data });

    return data;
  },
});

