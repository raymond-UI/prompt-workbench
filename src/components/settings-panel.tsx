"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import {
  Save,
  Trash2,
  Loader2,
  Activity,
  Settings2,
  Database,
  ShieldCheck,
  Zap,
  Info,
  Clock,
  ArrowUpRight,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function msToHours(ms: number): string {
  const h = ms / 3_600_000;
  if (h >= 24) return `${(h / 24).toFixed(1)}d`;
  return `${h.toFixed(1)}h`;
}

function StatsTab() {
  const stats = useQuery(api.llm.getStats);

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const totalHits = stats.totalHits ?? 0;
  const totalEntries = stats.totalEntries ?? 0;
  const hitRate =
    totalHits + totalEntries > 0
      ? (totalHits / (totalHits + totalEntries)) * 100
      : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-linear-to-br from-background to-muted/20 border-muted">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Database className="size-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Storage
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight">
                {totalEntries}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                Entries
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-background to-muted/20 border-muted">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-primary">
              <Zap className="size-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Performance
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight text-primary">
                {totalHits}
              </span>
              <span className="text-[10px] text-primary/70 font-medium">
                Hits
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-background to-muted/20 border-muted">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="size-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Efficiency
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight">
                {hitRate.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                % Rate
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {Object.keys(stats.entriesByModel).length > 0 && (
        <Card className="border-muted shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b bg-muted/30">
            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Activity className="size-3.5 text-muted-foreground" />
              Model Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-muted">
              {Object.entries(stats.entriesByModel).map(([model, count]) => {
                const modelHits = (stats.hitsByModel[model] as number) ?? 0;
                const modelEntries = count as number;
                const modelRate =
                  modelHits + modelEntries > 0
                    ? (modelHits / (modelHits + modelEntries)) * 100
                    : 0;

                return (
                  <div
                    key={model}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold font-mono">
                        {model.split("/").pop()}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[250px]">
                        {model}
                      </span>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[9px] uppercase text-muted-foreground tracking-tighter">
                          Hits/Entries
                        </span>
                        <span className="text-xs font-mono font-medium">
                          {modelHits}{" "}
                          <span className="text-muted-foreground">/</span>{" "}
                          {modelEntries}
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[9px] uppercase text-muted-foreground tracking-tighter">
                          Rate
                        </span>
                        <Badge
                          variant={modelRate > 50 ? "default" : "outline"}
                          className="text-[10px] h-4 px-1"
                        >
                          {modelRate.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ConfigTab() {
  const config = useQuery(api.llm.getConfig);
  const updateConfig = useMutation(api.llm.updateConfig);

  const [defaultTtl, setDefaultTtl] = useState("");
  const [promotionTtl, setPromotionTtl] = useState("");

  async function handleSave() {
    const update: Record<string, unknown> = {};
    if (defaultTtl.trim()) {
      update.defaultTtlMs = parseFloat(defaultTtl) * 3_600_000;
    }
    if (promotionTtl.trim()) {
      update.promotionTtlMs = parseFloat(promotionTtl) * 3_600_000;
    }
    if (Object.keys(update).length === 0) {
      toast.error("No changes to save");
      return;
    }
    await updateConfig({ config: update });
    toast.success("Settings updated");
    setDefaultTtl("");
    setPromotionTtl("");
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="border-muted shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/30">
          <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <Settings2 className="size-3.5 text-muted-foreground" />
            Cache Policies
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="default-ttl"
                    className="text-xs font-semibold"
                  >
                    General Default (TTL)
                  </Label>
                  {config && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                      Currently:{" "}
                      {config.defaultTtlMs
                        ? msToHours(config.defaultTtlMs)
                        : "24h"}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="default-ttl"
                    type="number"
                    step="0.5"
                    value={defaultTtl}
                    onChange={(e) => setDefaultTtl(e.target.value)}
                    placeholder="e.g. 24"
                    className="h-9"
                  />
                  <div className="bg-muted px-3 flex items-center justify-center rounded-md border text-[10px] font-bold text-muted-foreground h-9">
                    HRS
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  The default expiration time for all new cached LLM responses.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="promo-ttl" className="text-xs font-semibold">
                    Promotion (TTL)
                  </Label>
                  {config && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                      Currently:{" "}
                      {config.promotionTtlMs
                        ? msToHours(config.promotionTtlMs)
                        : "7d"}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="promo-ttl"
                    type="number"
                    step="0.5"
                    value={promotionTtl}
                    onChange={(e) => setPromotionTtl(e.target.value)}
                    placeholder="e.g. 168"
                    className="h-9"
                  />
                  <div className="bg-muted px-3 flex items-center justify-center rounded-md border text-[10px] font-bold text-muted-foreground h-9">
                    HRS
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Extended lifetime for manually promoted or pinned entries.
                </p>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-4 border border-dashed flex flex-col justify-center gap-3">
              <div className="flex items-center gap-2 text-primary">
                <Info className="size-4" />
                <span className="text-xs font-bold uppercase tracking-tight">
                  Active Rules
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    Request Normalization:
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] h-4 lowercase"
                  >
                    {config?.normalizeRequests !== false
                      ? "enabled"
                      : "disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    Automatic Eviction:
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] h-4 lowercase"
                  >
                    active
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t flex justify-end">
            <Button onClick={handleSave} className="gap-2 px-6">
              <Save className="size-4" />
              Sync Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {config && (config.ttlByModel || config.ttlByTag) && (
        <Card className="border-muted shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b bg-muted/30">
            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="size-3.5 text-muted-foreground" />
              Override Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-muted">
            {config.ttlByModel &&
              Object.entries(config.ttlByModel).map(([m, v]) => (
                <div
                  key={m}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] h-4">
                      Model
                    </Badge>
                    <span className="text-xs font-mono font-medium">{m}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="size-3 text-muted-foreground" />
                    <span className="font-mono">{msToHours(v as number)}</span>
                  </div>
                </div>
              ))}
            {config.ttlByTag &&
              Object.entries(config.ttlByTag).map(([t, v]) => (
                <div
                  key={t}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] h-4">
                      Tag
                    </Badge>
                    <span className="text-xs font-mono font-medium">#{t}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="size-3 text-muted-foreground" />
                    <span className="font-mono">{msToHours(v as number)}</span>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InvalidateTab() {
  const invalidate = useMutation(api.llm.invalidateEntries);
  const [model, setModel] = useState("");
  const [tag, setTag] = useState("");
  const [version, setVersion] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleInvalidate() {
    const args: Record<string, string> = {};
    if (model.trim()) args.model = model.trim();
    if (tag.trim()) args.tag = tag.trim();
    if (version.trim()) args.modelVersion = version.trim();
    if (Object.keys(args).length === 0) {
      toast.error("Set at least one target for invalidation");
      return;
    }

    if (
      !confirm(
        "This will permanently remove matching entries from the cache. Continue?",
      )
    )
      return;

    setIsDeleting(true);
    try {
      const count = await invalidate(args);
      toast.success(`Purged ${count} entries`);
      setModel("");
      setTag("");
      setVersion("");
    } catch (err) {
      toast.error("Invalidation failed");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="border-muted shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/30">
          <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-destructive">
            <Trash2 className="size-3.5" />
            Cache Purge
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/20 flex items-start gap-3">
            <Info className="size-4 text-destructive mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-destructive underline decoration-destructive/30 underline-offset-4">
                Warning: Destruction Zone
              </p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Purging will immediately invalidate and delete all cached items
                matching your criteria. This cannot be undone.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <Label
                htmlFor="inv-model"
                className="text-[10px] uppercase text-muted-foreground font-bold"
              >
                LLM Model
              </Label>
              <Input
                id="inv-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="openai/gpt-4o-mini"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="inv-tag"
                className="text-[10px] uppercase text-muted-foreground font-bold"
              >
                Experiment Tag
              </Label>
              <Input
                id="inv-tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="experiment-v1"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="inv-version"
                className="text-[10px] uppercase text-muted-foreground font-bold"
              >
                Model Version
              </Label>
              <Input
                id="inv-version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0"
                className="h-9"
              />
            </div>
          </div>

          <div className="pt-6 border-t flex justify-end">
            <Button
              onClick={handleInvalidate}
              variant="destructive"
              className="gap-2 px-8"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Execute Purge
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-muted/30 rounded-lg p-4 border border-dashed text-center space-y-2">
          <Badge
            variant="outline"
            className="text-[8px] uppercase tracking-tighter h-3"
          >
            Logic
          </Badge>
          <p className="text-[10px] text-muted-foreground">
            Filters are additive. If multiple are set, only entries matching{" "}
            <strong>all</strong> will be purged.
          </p>
        </div>
        <div className="bg-muted/30 rounded-lg p-4 border border-dashed text-center space-y-2">
          <Badge
            variant="outline"
            className="text-[8px] uppercase tracking-tighter h-3"
          >
            Scope
          </Badge>
          <p className="text-[10px] text-muted-foreground">
            Use the <strong>Explorer</strong> to preview matches before running
            a mass purge here.
          </p>
        </div>
      </div>
    </div>
  );
}

function CleanupTab() {
  const cleanup = useAction(api.experiments.cleanupExpired);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    deletedCount: number;
    keys: string[];
    hasMore: boolean;
  } | null>(null);

  async function handleCleanup(dryRun: boolean) {
    setIsRunning(true);
    try {
      const res = await cleanup({ batchSize: 200, dryRun });
      setResult(res);
      if (dryRun) {
        toast.info(`${res.keys.length} entries would be deleted`);
      } else {
        toast.success(`Pruned ${res.deletedCount} expired entries`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Pruning process failed",
      );
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="border-muted shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/30">
          <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-muted-foreground" />
            Entropy Management
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">
                Automatic background tasks generally handle expiration, but you
                can manually trigger a high-priority pruning cycle to free up
                space or enforce strict TTL adherence.
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleCleanup(true)}
                  disabled={isRunning}
                  variant="outline"
                  className="h-10 flex-1 px-6 gap-2"
                >
                  {isRunning ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Activity className="size-4" />
                  )}
                  Analyze Scope
                </Button>
                <Button
                  onClick={() => handleCleanup(false)}
                  disabled={isRunning}
                  variant="destructive"
                  className="h-10 flex-1 px-6 gap-2"
                >
                  {isRunning ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Run Pruning
                </Button>
              </div>
            </div>

            <div className="md:w-64 bg-muted/30 rounded-lg border p-4 flex flex-col items-center justify-center text-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                Status
              </span>
              <div className="flex items-center gap-2">
                <div
                  className={`size-2 rounded-full ${isRunning ? "bg-amber-500 animate-pulse" : "bg-green-500"}`}
                />
                <span className="text-xs font-semibold">
                  {isRunning ? "Pruning Active" : "Operational"}
                </span>
              </div>
            </div>
          </div>

          {result && (
            <div className="mt-4 animate-in zoom-in-95 duration-200">
              <Card className="border-muted bg-muted/20">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground">
                      Process Results
                    </span>
                    <div className="flex gap-4">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-muted-foreground uppercase">
                          Pruned
                        </span>
                        <span className="text-sm font-mono font-bold">
                          {result.deletedCount}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-muted-foreground uppercase">
                          Identified
                        </span>
                        <span className="text-sm font-mono font-bold">
                          {result.keys.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {result.keys.length > 0 && (
                    <details className="group">
                      <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 list-none font-medium">
                        <ChevronRight className="size-3 group-open:rotate-90 transition-transform" />
                        View Cache Keys
                      </summary>
                      <div className="relative mt-2">
                        <pre className="font-mono text-[10px] bg-background border rounded-md p-3 max-h-48 overflow-y-auto leading-relaxed custom-scrollbar">
                          {result.keys.map((k) => (
                            <div
                              key={k}
                              className="py-0.5 border-b border-muted/50 last:border-0 hover:bg-muted/30 px-1 rounded transition-colors"
                            >
                              {k}
                            </div>
                          ))}
                        </pre>
                      </div>
                    </details>
                  )}

                  {result.hasMore && (
                    <div className="pt-2 flex items-center gap-2 text-[10px] text-amber-600 font-medium">
                      <Info className="size-3" />
                      <span>
                        The process capped at batch size. Additional expired
                        entries remain.
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPanel() {
  return (
    <div className="w-full">
      <Tabs
        defaultValue="stats"
        className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8"
      >
        <div className="space-y-4">
          <div className="px-2">
            <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground">
              Management
            </h3>
          </div>
          <TabsList className="bg-transparent border-0 flex flex-col h-auto w-full items-stretch gap-1 p-0">
            <TabsTrigger
              value="stats"
              className="justify-start gap-3 h-10 px-3 data-[state=active]:bg-primary/5 data-[state=active]:text-primary border-transparent border-l-2 data-[state=active]:border-primary transition-all text-xs font-medium rounded-r-md rounded-l-none bg-transparent"
            >
              <Activity className="size-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="config"
              className="justify-start gap-3 h-10 px-3 data-[state=active]:bg-primary/5 data-[state=active]:text-primary border-transparent border-l-2 data-[state=active]:border-primary transition-all text-xs font-medium rounded-r-md rounded-l-none bg-transparent"
            >
              <Settings2 className="size-4" />
              Policies
            </TabsTrigger>
            <TabsTrigger
              value="invalidate"
              className="justify-start gap-3 h-10 px-3 data-[state=active]:bg-destructive/5 data-[state=active]:text-destructive border-transparent border-l-2 data-[state=active]:border-destructive transition-all text-xs font-medium rounded-r-md rounded-l-none bg-transparent"
            >
              <Trash2 className="size-4" />
              Purge
            </TabsTrigger>
            <TabsTrigger
              value="cleanup"
              className="justify-start gap-3 h-10 px-3 data-[state=active]:bg-primary/5 data-[state=active]:text-primary border-transparent border-l-2 data-[state=active]:border-primary transition-all text-xs font-medium rounded-r-md rounded-l-none bg-transparent"
            >
              <ShieldCheck className="size-4" />
              Cleanup
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="min-w-0">
          <TabsContent
            value="stats"
            className="mt-0 focus-visible:outline-none"
          >
            <StatsTab />
          </TabsContent>
          <TabsContent
            value="config"
            className="mt-0 focus-visible:outline-none"
          >
            <ConfigTab />
          </TabsContent>
          <TabsContent
            value="invalidate"
            className="mt-0 focus-visible:outline-none"
          >
            <InvalidateTab />
          </TabsContent>
          <TabsContent
            value="cleanup"
            className="mt-0 focus-visible:outline-none"
          >
            <CleanupTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
