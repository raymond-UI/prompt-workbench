import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRateLimitMessage(err: unknown): string | null {
  if (!(err instanceof Error)) return null;
  const msg = err.message;
  if (!msg.includes("RateLimited") && !msg.includes("rate limit")) return null;
  const match = msg.match(/retryAfter[":}\s]+(\d+)/);
  if (match) {
    const sec = Math.ceil(parseInt(match[1], 10) / 1000);
    return `Rate limited. Try again in ${sec}s.`;
  }
  return "Rate limited. Please wait before trying again.";
}
