"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { Save, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function msToHours(ms: number): string {
  const h = ms / 3_600_000;
  if (h >= 24) return `${(h / 24).toFixed(1)}d`;
  return `${h.toFixed(1)}h`;
}

function StatsTab() {
  const stats = useQuery(api.llm.getStats);

  if (!stats)
    return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-semibold tabular-nums">
              {stats.totalEntries}
            </p>
            <p className="text-xs text-muted-foreground">Total entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-semibold tabular-nums">
              {stats.totalHits}
            </p>
            <p className="text-xs text-muted-foreground">Total hits</p>
          </CardContent>
        </Card>
      </div>

      {Object.keys(stats.entriesByModel).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">By Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {Object.entries(stats.entriesByModel).map(([model, count]) => (
                <div
                  key={model}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="truncate max-w-[200px]">{model}</span>
                  <div className="flex items-center gap-3 tabular-nums">
                    <span>{count as number} entries</span>
                    <span className="text-muted-foreground">
                      {(stats.hitsByModel[model] as number) ?? 0} hits
                    </span>
                  </div>
                </div>
              ))}
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
    toast.success("Config updated");
    setDefaultTtl("");
    setPromotionTtl("");
  }

  return (
    <div className="space-y-4">
      {config && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Current Config</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-muted-foreground">Default TTL</span>
              <span>
                {config.defaultTtlMs
                  ? msToHours(config.defaultTtlMs)
                  : "24h (default)"}
              </span>
              <span className="text-muted-foreground">Promotion TTL</span>
              <span>
                {config.promotionTtlMs
                  ? msToHours(config.promotionTtlMs)
                  : "7d (default)"}
              </span>
              <span className="text-muted-foreground">Normalization</span>
              <span>{config.normalizeRequests !== false ? "On" : "Off"}</span>
              {config.ttlByModel &&
                Object.entries(config.ttlByModel).map(([m, v]) => (
                  <div key={m} className="contents">
                    <span className="text-muted-foreground pl-2">TTL: {m}</span>
                    <span>{msToHours(v as number)}</span>
                  </div>
                ))}
              {config.ttlByTag &&
                Object.entries(config.ttlByTag).map(([t, v]) => (
                  <div key={t} className="contents">
                    <span className="text-muted-foreground pl-2">
                      TTL tag: {t}
                    </span>
                    <span>{msToHours(v as number)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Update TTLs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="default-ttl">Default TTL (hours)</Label>
              <Input
                id="default-ttl"
                type="number"
                step="0.5"
                value={defaultTtl}
                onChange={(e) => setDefaultTtl(e.target.value)}
                placeholder="24"
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="promo-ttl">Promotion TTL (hours)</Label>
              <Input
                id="promo-ttl"
                type="number"
                step="0.5"
                value={promotionTtl}
                onChange={(e) => setPromotionTtl(e.target.value)}
                placeholder="168"
                className="mt-1"
              />
            </div>
          </div>
          <Button onClick={handleSave} size="sm">
            <Save className="mr-1.5 size-3.5" />
            Save
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function InvalidateTab() {
  const invalidate = useMutation(api.llm.invalidateEntries);
  const [model, setModel] = useState("");
  const [tag, setTag] = useState("");
  const [version, setVersion] = useState("");

  async function handleInvalidate() {
    const args: Record<string, string> = {};
    if (model.trim()) args.model = model.trim();
    if (tag.trim()) args.tag = tag.trim();
    if (version.trim()) args.modelVersion = version.trim();
    if (Object.keys(args).length === 0) {
      toast.error("Provide at least one filter");
      return;
    }
    const count = await invalidate(args);
    toast.success(`Invalidated ${count} entries`);
    setModel("");
    setTag("");
    setVersion("");
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Invalidate Entries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="w-44">
            <Label htmlFor="inv-model">Model</Label>
            <Input
              id="inv-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="openai/gpt-4o-mini"
              className="mt-1"
            />
          </div>
          <div className="w-36">
            <Label htmlFor="inv-tag">Tag</Label>
            <Input
              id="inv-tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="experiment-v1"
              className="mt-1"
            />
          </div>
          <div className="w-28">
            <Label htmlFor="inv-version">Model Version</Label>
            <Input
              id="inv-version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="v1.0"
              className="mt-1"
            />
          </div>
        </div>
        <Button onClick={handleInvalidate} variant="destructive" size="sm">
          <Trash2 className="mr-1.5 size-3.5" />
          Invalidate
        </Button>
      </CardContent>
    </Card>
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
        toast.success(`Deleted ${res.deletedCount} expired entries`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cleanup failed");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Cleanup Expired Entries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button
            onClick={() => handleCleanup(true)}
            disabled={isRunning}
            variant="outline"
            size="sm"
          >
            {isRunning ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : null}
            Dry Run
          </Button>
          <Button
            onClick={() => handleCleanup(false)}
            disabled={isRunning}
            variant="destructive"
            size="sm"
          >
            {isRunning ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 size-3.5" />
            )}
            Run Cleanup
          </Button>
        </div>

        {result && (
          <div className="text-xs space-y-1">
            <div className="flex gap-3">
              <span>
                Deleted: <strong>{result.deletedCount}</strong>
              </span>
              <span>
                Found: <strong>{result.keys.length}</strong>
              </span>
              {result.hasMore && (
                <Badge variant="outline" className="text-[10px]">
                  More remaining
                </Badge>
              )}
            </div>
            {result.keys.length > 0 && (
              <details>
                <summary className="cursor-pointer text-muted-foreground">
                  Keys ({result.keys.length})
                </summary>
                <pre className="mt-1 font-mono text-[10px] bg-muted rounded-md p-2 max-h-32 overflow-y-auto">
                  {result.keys.join("\n")}
                </pre>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPanel() {
  return (
    <Tabs defaultValue="stats" className="flex flex-col">
      <TabsList>
        <TabsTrigger value="stats">Stats</TabsTrigger>
        <TabsTrigger value="config">Config</TabsTrigger>
        <TabsTrigger value="invalidate">Invalidate</TabsTrigger>
        <TabsTrigger value="cleanup">Cleanup</TabsTrigger>
      </TabsList>

      <TabsContent value="stats">
        <StatsTab />
      </TabsContent>
      <TabsContent value="config">
        <ConfigTab />
      </TabsContent>
      <TabsContent value="invalidate">
        <InvalidateTab />
      </TabsContent>
      <TabsContent value="cleanup">
        <CleanupTab />
      </TabsContent>
    </Tabs>
  );
}
