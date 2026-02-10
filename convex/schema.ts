import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// App-level schema — the cache component has its own internal tables.
// We keep the app schema minimal; all cache data lives in the component.
export default defineSchema({
  models: defineTable({
    id: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    pricing: v.optional(v.any()),
    context_length: v.optional(v.number()),
    architecture: v.optional(v.any()),
    top_provider: v.optional(v.any()),
    per_token_billing: v.optional(v.boolean()),
    updatedat: v.number(),
  }).index("by_model_id", ["id"]),
});
