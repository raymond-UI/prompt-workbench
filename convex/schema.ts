import { defineSchema } from "convex/server";

// App-level schema — the cache component has its own internal tables.
// We keep the app schema minimal; all cache data lives in the component.
export default defineSchema({});
