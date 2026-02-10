import { RateLimiter, MINUTE, HOUR } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Rate limiter instance & definitions
// ---------------------------------------------------------------------------

const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Standard LLM API calls — token bucket allows bursts up to capacity
  llmCall: { kind: "token bucket", rate: 20, period: MINUTE, capacity: 5 },
  // Force refresh — stricter since it always bypasses cache
  forceRefresh: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 2 },
  // OpenRouter model list refresh
  modelRefresh: { kind: "fixed window", rate: 3, period: HOUR },
});

// ---------------------------------------------------------------------------
// Internal mutations — callable from actions via ctx.runMutation()
// ---------------------------------------------------------------------------

export const checkLlmCallLimit = internalMutation({
  args: { count: v.number() },
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "llmCall", {
      count: args.count,
      throws: true,
    });
  },
});

export const checkForceRefreshLimit = internalMutation({
  args: { count: v.number() },
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "forceRefresh", {
      count: args.count,
      throws: true,
    });
  },
});

export const checkModelRefreshLimit = internalMutation({
  args: {},
  handler: async (ctx) => {
    await rateLimiter.limit(ctx, "modelRefresh", { throws: true });
  },
});
