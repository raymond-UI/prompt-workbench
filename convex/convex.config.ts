import { defineApp } from "convex/server";
import llmCache from "@mzedstudio/llm-cache/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";

const app = defineApp();
app.use(llmCache, { name: "llmCache" });
app.use(rateLimiter);
export default app;
