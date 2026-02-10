"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { Play, Zap, Clock, Pin, Loader2, Eye, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ModelSelector } from "@/components/model-selector";
import { useQuery } from "convex/react";
import { X, Plus } from "lucide-react";

const TIER_LABELS: Record<
  number,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  0: { label: "Default TTL", variant: "outline" },
  1: { label: "Promoted", variant: "secondary" },
  2: { label: "Pinned", variant: "default" },
};

type ExperimentResult = {
  model: string;
  response: unknown;
  fromCache: boolean;
  cacheKey: string;
  hitCount: number;
  ttlTier: number;
  latencyMs: number;
};

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

function getModelLabel(id: string, allModels?: any[]): string {
  const m = allModels?.find((m) => m.id === id);
  return m?.name ?? id.split("/").pop() ?? id;
}

export default function Workbench() {
  const [prompt, setPrompt] = useState(
    "Explain the concept of cache invalidation in one paragraph.",
  );
  const [selectedModels, setSelectedModels] = useState<string[]>([
    "openai/gpt-4o-mini",
    "anthropic/claude-3.5-haiku",
  ]);
  const [temperature, setTemperature] = useState("0.7");
  const [tag, setTag] = useState("");
  const [modelVersion, setModelVersion] = useState("");
  const [pinResults, setPinResults] = useState(false);
  const [metadata, setMetadata] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  const [peekResults, setPeekResults] = useState<
    Array<{ model: string; cached: boolean; cacheKey: string | null; hitCount: number; ttlTier: number }> | null
  >(null);
  const [results, setResults] = useState<ExperimentResult[]>([]);

  const runExperiment = useAction(api.experiments.runExperiment);
  const peekExperiment = useAction(api.experiments.peekExperiment);

  function toggleModel(id: string) {
    setSelectedModels((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  async function handlePeek() {
    if (!prompt.trim() || selectedModels.length === 0 || isPeeking) return;
    setIsPeeking(true);
    setPeekResults(null);
    try {
      const res = await peekExperiment({
        messages: [{ role: "user", content: prompt }],
        models: selectedModels,
        temperature: parseFloat(temperature) || 0.7,
        modelVersion: modelVersion.trim() || undefined,
      });
      setPeekResults(res as typeof peekResults);
      const cached = (res as any[]).filter((r) => r.cached).length;
      toast.success(`Peek: ${cached}/${selectedModels.length} cached (no hit count incremented)`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Peek failed");
    } finally {
      setIsPeeking(false);
    }
  }

  async function handleRun(e?: React.FormEvent, forceRefresh = false) {
    e?.preventDefault();
    if (!prompt.trim() || selectedModels.length === 0 || isRunning) return;

    setIsRunning(true);
    setResults([]);
    setPeekResults(null);
    const parsedMeta = metadata.trim() ? { notes: metadata.trim() } : undefined;
    try {
      const res = await runExperiment({
        messages: [{ role: "user", content: prompt }],
        models: selectedModels,
        temperature: parseFloat(temperature) || 0.7,
        tag: tag.trim() || undefined,
        pin: pinResults || undefined,
        metadata: parsedMeta,
        modelVersion: modelVersion.trim() || undefined,
        forceRefresh: forceRefresh || undefined,
      });
      setResults(res as ExperimentResult[]);
      if (forceRefresh) {
        toast.success("Forced refresh — check Time Travel for response diffs");
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Experiment failed");
    } finally {
      setIsRunning(false);
    }
  }

  const allCached = results.length > 0 && results.every((r) => r.fromCache);

  return (
    <div className="grid grid-cols-[1fr_3fr] gap-4">
      {/* Prompt input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Experiment Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRun} className="space-y-4">
            <div>
              <Label htmlFor="prompt">Prompt</Label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Enter your prompt..."
              />
            </div>

            {/* Model selection */}
            <div>
              <Label className="mb-2 block">Models</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedModels.map((id) => (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="pl-2 pr-1 h-7 gap-1"
                  >
                    <span className="max-w-[120px] truncate">
                      {id.split("/").pop()}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-4 hover:bg-transparent"
                      onClick={() => toggleModel(id)}
                    >
                      <X className="size-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <ModelSelector
                value=""
                onValueChange={(id) => {
                  if (!selectedModels.includes(id)) {
                    setSelectedModels((prev) => [...prev, id]);
                  }
                }}
              />
            </div>

            <div className="flex flex-wrap gap-3 items-end">
              <div className="w-24">
                <Label htmlFor="temp">Temperature</Label>
                <Input
                  id="temp"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex-1 min-w-[120px]">
                <Label htmlFor="tag">Experiment Tag</Label>
                <Input
                  id="tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="e.g. cache-explainer-v2"
                  className="mt-1"
                />
              </div>

              <div className="w-28">
                <Label htmlFor="version">Model Version</Label>
                <Input
                  id="version"
                  value={modelVersion}
                  onChange={(e) => setModelVersion(e.target.value)}
                  placeholder="v1.0"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="metadata">Metadata / Notes</Label>
              <Input
                id="metadata"
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                placeholder="e.g. testing tone variations"
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={pinResults}
                  onCheckedChange={(v) => setPinResults(v === true)}
                />
                <span className="text-xs flex items-center gap-1">
                  <Pin className="size-3" />
                  Pin results (never expire)
                </span>
              </label>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPeeking || isRunning || !prompt.trim() || selectedModels.length === 0}
                  onClick={handlePeek}
                  className="gap-1.5"
                >
                  {isPeeking ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                  Peek
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isRunning || !prompt.trim() || selectedModels.length === 0}
                  onClick={() => handleRun(undefined, true)}
                  className="gap-1.5"
                >
                  <RefreshCw className="size-3.5" />
                  Force Refresh
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                isRunning || !prompt.trim() || selectedModels.length === 0
              }
            >
              {isRunning ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Play className="mr-1.5 size-3.5" />
              )}
              {isRunning
                ? "Running..."
                : `Run (${selectedModels.length} model${selectedModels.length !== 1 ? "s" : ""})`}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-card/50 p-2 px-3 rounded-lg border shadow-sm">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Results</h2>
            {results.length > 0 && (
              <Badge variant="outline" className="text-[10px] bg-background">
                {results.length} of {selectedModels.length} active
              </Badge>
            )}
          </div>
          {allCached && (
            <Badge
              variant="default"
              className="text-[10px] bg-emerald-500 hover:bg-emerald-600 transition-colors border-none"
            >
              <Zap className="mr-1 size-2.5 fill-current" />
              Fully Cached
            </Badge>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {selectedModels.map((modelId) => {
            const r = results.find((res) => res.model === modelId);
            const peek = peekResults?.find((p) => p.model === modelId);
            const isSelected = true;
            const tier = r ? (TIER_LABELS[r.ttlTier] ?? TIER_LABELS[0]) : null;
            const modelName = modelId.split("/").pop();

            return (
              <Card
                key={modelId}
                className={`flex flex-col min-h-[300px] transition-all duration-300 border ${
                  !isSelected
                    ? "opacity-40 border-transparent bg-muted/30 grayscale"
                    : r
                      ? "border-primary/20 shadow-md bg-card"
                      : isRunning
                        ? "border-primary/10 animate-pulse bg-muted/10"
                        : "border-dashed border-muted-foreground/20 bg-muted/5"
                }`}
              >
                <CardHeader className="pb-2 border-b bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`size-2 rounded-full shrink-0 ${
                          isSelected
                            ? "bg-emerald-500 animate-pulse"
                            : "bg-muted-foreground/30"
                        }`}
                      />
                      <CardTitle className="text-xs font-bold tracking-tight truncate">
                        {modelName}
                      </CardTitle>
                    </div>
                    {r && (
                      <div className="flex items-center gap-1 shrink-0">
                        {r.fromCache ? (
                          <Badge
                            variant="default"
                            className="h-5 text-[9px] px-1.5 bg-sky-500 border-none"
                          >
                            <Zap className="mr-0.5 size-2.5 fill-current" />
                            HIT
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="h-5 text-[9px] px-1.5"
                          >
                            <Clock className="mr-0.5 size-2.5" />
                            {r.latencyMs}ms
                          </Badge>
                        )}
                        <Badge
                          variant={tier?.variant}
                          className="h-5 text-[9px] px-1.5"
                        >
                          {tier?.label}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 p-0 overflow-hidden relative flex flex-col">
                  {!r ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <div
                        className={`p-3 rounded-2xl ${
                          peek?.cached
                            ? "bg-sky-500/10 text-sky-600"
                            : isSelected
                              ? "bg-primary/5 text-primary"
                              : "bg-muted text-muted-foreground/30"
                        }`}
                      >
                        {isSelected ? (
                          isRunning ? (
                            <Loader2 className="size-5 animate-spin" />
                          ) : peek?.cached ? (
                            <Eye className="size-5" />
                          ) : (
                            <Play className="size-5" />
                          )
                        ) : (
                          <Pin className="size-5" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                          {isSelected
                            ? isRunning
                              ? "Processing"
                              : peek
                                ? peek.cached
                                  ? "Cached"
                                  : "Not cached"
                                : "Standby"
                            : "Disabled"}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 px-4 leading-normal">
                          {isSelected
                            ? isRunning
                              ? "Waiting for model response..."
                              : peek
                                ? peek.cached
                                  ? `${peek.hitCount} hits — run to increment`
                                  : "No cache entry — will call LLM"
                                : "Ready to test this model"
                            : "Enable in setup to compare"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col h-full">
                      <div className="flex-1 p-4 text-sm leading-relaxed text-foreground/90 overflow-y-auto max-h-[400px] markdown-content">
                        <Streamdown>{extractContent(r.response)}</Streamdown>
                      </div>

                      <div className="mt-auto p-3 border-t bg-muted/5 flex items-center justify-between text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">
                        <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded border">
                          KEY: {r.cacheKey.slice(0, 10)}
                        </span>
                        {r.hitCount > 0 && (
                          <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                            <Zap className="size-2.5 fill-current" />
                            {r.hitCount} CACHE HITS
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
