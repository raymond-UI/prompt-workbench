import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const syncModels = mutation({
  args: {
    models: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const model of args.models) {
      const existing = await ctx.db
        .query("models")
        .withIndex("by_model_id", (q) => q.eq("id", model.id))
        .unique();

      const modelData = {
        id: model.id,
        name: model.name,
        description: model.description,
        pricing: model.pricing,
        context_length: model.context_length,
        architecture: model.architecture,
        top_provider: model.top_provider,
        per_token_billing: model.per_token_billing,
        updatedat: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, modelData);
      } else {
        await ctx.db.insert("models", modelData);
      }
    }

    // Optional: cleanup very old models
    const oldModels = await ctx.db
      .query("models")
      .filter((q) => q.lt(q.field("updatedat"), now - 1000 * 60 * 60 * 24))
      .collect();
    for (const old of oldModels) {
      await ctx.db.delete(old._id);
    }
  },
});

export const getModels = query({
  args: {
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("models").order("desc");

    const models = await query.collect();

    if (args.searchTerm) {
      const term = args.searchTerm.toLowerCase();
      return models.filter(
        (m) =>
          m.id.toLowerCase().includes(term) ||
          m.name.toLowerCase().includes(term),
      );
    }

    return models;
  },
});
