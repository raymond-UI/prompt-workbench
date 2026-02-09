"use node";

import { action } from "./_generated/server";
import { components } from "./_generated/api";
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

        const cached = await cache.lookup(ctx, {
          request,
          modelVersion: args.modelVersion,
        });

        if (cached) {
          return {
            model,
            response: cached.response,
            fromCache: true,
            cacheKey: cached.cacheKey,
            hitCount: cached.hitCount,
            ttlTier: cached.ttlTier,
            latencyMs: 0,
          };
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
          modelVersion: args.modelVersion,
        });

        return {
          model,
          response,
          fromCache: false,
          cacheKey,
          hitCount: 0,
          ttlTier: 0,
          latencyMs,
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
