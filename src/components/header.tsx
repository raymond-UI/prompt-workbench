"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Workbench" },
  { href: "/experiments", label: "Explorer" },
  { href: "/history", label: "Time Travel" },
  { href: "/settings", label: "Settings" },
] as const;

function StatsBadge() {
  const stats = useQuery(api.llm.getStats);
  if (!stats) return null;

  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {stats.totalEntries} cached
      <span className="ml-1.5 text-[10px]">
        ({stats.totalHits} hits)
      </span>
    </span>
  );
}

export default function Header() {
  const pathname = usePathname();

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-4 py-2">
        <div className="flex items-center gap-5">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Prompt Workbench
          </Link>
          <nav className="flex gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-md transition-colors",
                  pathname === href
                    ? "bg-secondary text-secondary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <StatsBadge />
      </div>
      <hr />
    </div>
  );
}
