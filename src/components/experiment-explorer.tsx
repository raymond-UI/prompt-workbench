"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Trash2,
  Search,
  Zap,
  Database,
  Clock,
  ArrowUpRight,
  Check,
  AlertCircle,
  Hash,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TIER_LABELS: Record<
  number,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  0: { label: "Default", variant: "outline" },
  1: { label: "Promoted", variant: "secondary" },
  2: { label: "Pinned", variant: "default" },
};

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 0) return `in ${Math.round(-diff / 1000)}s`;
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${(diff / 3_600_000).toFixed(1)}h ago`;
  return `${(diff / 86_400_000).toFixed(1)}d ago`;
}

function extractContent(response: unknown): string {
  if (
    response &&
    typeof response === "object" &&
    "choices" in (response as Record<string, unknown>)
  ) {
    const choices = (
      response as { choices: Array<{ message: { content: string } }> }
    ).choices;
    return choices[0]?.message?.content ?? "";
  }
  return JSON.stringify(response, null, 2);
}

function extractPrompt(request: unknown): string {
  if (
    request &&
    typeof request === "object" &&
    "messages" in (request as Record<string, unknown>)
  ) {
    const messages = (
      request as { messages: Array<{ role: string; content: string }> }
    ).messages;
    const userMsg = messages.find((m) => m.role === "user");
    return userMsg?.content ?? "";
  }
  return "";
}

type CacheEntry = {
  _id: string;
  cacheKey: string;
  model: string;
  hitCount: number;
  ttlTier: number;
  createdAt: number;
  expiresAt?: number;
  lastAccessedAt: number;
  request: unknown;
  response: unknown;
  tags?: string[];
  metadata?: unknown;
  modelVersion?: string;
};

function EntryRow({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: CacheEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [isInvalidating, setIsInvalidating] = useState(false);
  const invalidate = useMutation(api.llm.invalidateEntries);

  const tier = TIER_LABELS[entry.ttlTier] ?? TIER_LABELS[0];
  const prompt = extractPrompt(entry.request);
  const response = extractContent(entry.response);

  const copyKey = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(entry.cacheKey);
    setCopied(true);
    toast.success("Cache key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvalidate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to invalidate this cache entry?"))
      return;

    setIsInvalidating(true);
    try {
      await invalidate({ cacheKey: entry.cacheKey });
      toast.success("Entry invalidated");
    } catch (err) {
      toast.error("Failed to invalidate entry");
      setIsInvalidating(false);
    }
  };

  return (
    <div
      className={`border-b last:border-b-0 overflow-hidden transition-colors ${isInvalidating ? "opacity-40 grayscale" : ""}`}
    >
      <div
        onClick={onToggle}
        className="group w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-muted/50 transition-all cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isExpanded ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          )}

          <Tooltip>
            <TooltipTrigger>
              <div
                onClick={copyKey}
                className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-background border border-transparent hover:border-border transition-all group/key"
              >
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-tight">
                  {entry.cacheKey.slice(0, 8)}
                </span>
                {copied ? (
                  <Check className="size-2.5 text-green-500" />
                ) : (
                  <Copy className="size-2.5 text-muted-foreground opacity-0 group-hover/key:opacity-100 transition-opacity" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-[10px]">Copy full key: {entry.cacheKey}</p>
            </TooltipContent>
          </Tooltip>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium truncate max-w-[150px]">
                {entry.model.split("/").pop()}
              </span>
              <Badge variant={tier.variant} className="text-[9px] h-4 px-1">
                {tier.label}
              </Badge>
            </div>
            {prompt && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[200px] italic">
                "{prompt.slice(0, 50)}..."
              </span>
            )}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 shrink-0 mx-4">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] uppercase text-muted-foreground tracking-widest font-semibold">
              Hits
            </span>
            <span className="text-xs font-mono tabular-nums leading-none">
              {entry.hitCount}
            </span>
          </div>

          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] uppercase text-muted-foreground tracking-widest font-semibold">
              Age
            </span>
            <span className="text-xs text-muted-foreground tabular-nums leading-none">
              {formatRelative(entry.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 ml-auto shrink-0">
          {entry.tags && entry.tags.length > 0 && (
            <Badge
              variant="outline"
              className="hidden sm:inline-flex text-[9px] h-4 max-w-[80px] truncate"
            >
              #{entry.tags[0]}
            </Badge>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="size-7 opacity-20 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
            onClick={handleInvalidate}
            disabled={isInvalidating}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 bg-muted/20 border-t border-muted animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Request Detail
                </Label>
                <div className="mt-1 rounded-md border bg-background p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Prompt
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {prompt || "No prompt content found"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="rounded-md border bg-background px-2 py-1 flex items-center gap-2">
                  <Database className="size-3 text-muted-foreground" />
                  <span className="text-[10px]">
                    <span className="text-muted-foreground">Key:</span>{" "}
                    <code className="font-mono">{entry.cacheKey}</code>
                  </span>
                </div>
                {entry.modelVersion && (
                  <div className="rounded-md border bg-background px-2 py-1 flex items-center gap-2">
                    <Hash className="size-3 text-muted-foreground" />
                    <span className="text-[10px]">
                      <span className="text-muted-foreground">Version:</span>{" "}
                      {entry.modelVersion}
                    </span>
                  </div>
                )}
                <div className="rounded-md border bg-background px-2 py-1 flex items-center gap-2">
                  <Clock className="size-3 text-muted-foreground" />
                  <span className="text-[10px]">
                    <span className="text-muted-foreground">Last Access:</span>{" "}
                    {formatRelative(entry.lastAccessedAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Response
                </Label>
                <div className="mt-1 rounded-md border bg-background p-3 relative group/resp">
                  <div className="absolute right-2 top-2 opacity-0 group-hover/resp:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] gap-1"
                      onClick={() => {
                        navigator.clipboard.writeText(response);
                        toast.success("Response copied");
                      }}
                    >
                      <Copy className="size-3" /> Copy
                    </Button>
                  </div>
                  <p className="text-sm max-h-80 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                    {response}
                  </p>
                </div>
              </div>

              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {entry.tags.map((t) => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="text-[10px] px-1.5"
                    >
                      #{t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <details className="text-[11px] group">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 list-none">
              <ChevronRight className="size-3 group-open:rotate-90 transition-transform" />
              <span>Full JSON Payload</span>
            </summary>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground px-1">
                  Request
                </span>
                <pre className="font-mono bg-background border rounded-md p-3 overflow-x-auto max-h-48 overflow-y-auto text-[10px] leading-relaxed">
                  {JSON.stringify(entry.request, null, 2)}
                </pre>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground px-1">
                  Response
                </span>
                <pre className="font-mono bg-background border rounded-md p-3 overflow-x-auto max-h-48 overflow-y-auto text-[10px] leading-relaxed">
                  {JSON.stringify(entry.response, null, 2)}
                </pre>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function StatsHeader({ stats }: { stats: any }) {
  if (!stats) return <Skeleton className="h-24 w-full" />;

  const totalHits = stats.totalHits ?? 0;
  const totalEntries = stats.totalEntries ?? 0;
  const hitRate =
    totalEntries + totalHits > 0
      ? (totalHits / (totalHits + totalEntries)) * 100
      : 0;
  const uniqueModels = Object.keys(stats.entriesByModel).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-linear-to-br from-background to-muted/20 border-muted">
        <CardContent className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Entries
            </span>
          </div>
          <span className="text-2xl font-bold tracking-tight">
            {totalEntries}
          </span>
        </CardContent>
      </Card>

      <Card className="bg-linear-to-br from-background to-muted/20 border-muted">
        <CardContent className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-primary">
            <Zap className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Total Hits
            </span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-primary">
            {totalHits}
          </span>
        </CardContent>
      </Card>

      <Card className="bg-linear-to-br from-background to-muted/20 border-muted">
        <CardContent className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ArrowUpRight className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Hit Rate
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight">
              {hitRate.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-linear-to-br from-background to-muted/20 border-muted">
        <CardContent className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Models
            </span>
          </div>
          <span className="text-2xl font-bold tracking-tight">
            {uniqueModels}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ExperimentExplorer() {
  const [modelFilter, setModelFilter] = useState("__all__");
  const [tagFilter, setTagFilter] = useState("__all__");
  const [searchTerm, setSearchTerm] = useState("");
  const [limit, setLimit] = useState("30");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const stats = useQuery(api.llm.getStats);

  // Pull all entries unfiltered to extract unique tags
  const allEntries = useQuery(api.llm.queryEntries, { limit: 200 });
  const availableTags = useMemo(() => {
    if (!allEntries) return [];
    const tagSet = new Set<string>();
    for (const entry of allEntries) {
      const e = entry as CacheEntry;
      if (e.tags) {
        for (const t of e.tags) tagSet.add(t);
      }
    }
    return Array.from(tagSet).sort();
  }, [allEntries]);

  const availableModels = useMemo(() => {
    if (!stats) return [];
    return Object.keys(stats.entriesByModel).sort();
  }, [stats]);

  const queryArgs = useMemo(() => {
    const args: { model?: string; tag?: string; limit?: number } = {};
    if (modelFilter !== "__all__") args.model = modelFilter;
    if (tagFilter !== "__all__") args.tag = tagFilter;
    const l = parseInt(limit);
    if (l > 0) args.limit = l;
    return args;
  }, [modelFilter, tagFilter, limit]);

  const entriesData = useQuery(api.llm.queryEntries, queryArgs);

  const filteredEntries = useMemo(() => {
    if (!entriesData) return undefined;
    if (!searchTerm.trim()) return entriesData;

    const term = searchTerm.toLowerCase();
    return entriesData.filter((e: CacheEntry) => {
      const prompt = extractPrompt(e.request).toLowerCase();
      const response = extractContent(e.response).toLowerCase();
      const tags = (e.tags ?? []).join(" ").toLowerCase();
      return (
        e.cacheKey.toLowerCase().includes(term) ||
        e.model.toLowerCase().includes(term) ||
        prompt.includes(term) ||
        response.includes(term) ||
        tags.includes(term)
      );
    });
  }, [entriesData, searchTerm]);

  return (
    <div className="space-y-6">
      <StatsHeader stats={stats} />

      <Card className="border-muted shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              Manage Cache
            </CardTitle>
            <div className="flex items-center gap-2">
              {entriesData && (
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {entriesData.length} Loaded
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[240px]">
              <Label
                htmlFor="search"
                className="text-[10px] uppercase text-muted-foreground font-semibold mb-1.5 block"
              >
                Search Entries
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Filter by content, key, or tag..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            <div className="w-48">
              <Label className="text-[10px] uppercase text-muted-foreground font-semibold mb-1.5 block">
                Model
              </Label>
              <Select
                value={modelFilter}
                onValueChange={(v) => v && setModelFilter(v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All models" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All models</SelectItem>
                  {availableModels.map((m: string) => (
                    <SelectItem key={m} value={m}>
                      {m.split("/").pop()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <Label className="text-[10px] uppercase text-muted-foreground font-semibold mb-1.5 block">
                Tag
              </Label>
              <Select
                value={tagFilter}
                onValueChange={(v) => v && setTagFilter(v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All tags</SelectItem>
                  {availableTags.map((t: string) => (
                    <SelectItem key={t} value={t}>
                      #{t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-20">
              <Label
                htmlFor="limit"
                className="text-[10px] uppercase text-muted-foreground font-semibold mb-1.5 block"
              >
                Limit
              </Label>
              <Input
                id="limit"
                type="number"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-muted shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {filteredEntries === undefined ? (
            <div className="p-6 space-y-4">
              <div className="flex gap-4">
                <Skeleton className="size-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
              <div className="flex gap-4">
                <Skeleton className="size-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                <AlertCircle className="size-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">No results found</p>
                <p className="text-xs text-muted-foreground max-w-[250px] mx-auto">
                  Try adjusting your filters or search terms to find what you're
                  looking for.
                </p>
              </div>
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setSearchTerm("")}
                >
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-muted">
              {filteredEntries.map((entry: CacheEntry) => (
                <EntryRow
                  key={entry.cacheKey}
                  entry={entry}
                  isExpanded={expandedKey === entry.cacheKey}
                  onToggle={() =>
                    setExpandedKey(
                      expandedKey === entry.cacheKey ? null : entry.cacheKey,
                    )
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
