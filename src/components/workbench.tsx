"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { Play, Zap, Clock, Pin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MODELS = [
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku" },
  { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
  { id: "qwen/qwen3-coder-next", label: "Qwen 3 Coder Next" },
] as const;

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

function getModelLabel(id: string): string {
  return MODELS.find((m) => m.id === id)?.label ?? id.split("/").pop() ?? id;
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
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ExperimentResult[]>([]);

  const runExperiment = useAction(api.experiments.runExperiment);

  function toggleModel(id: string) {
    setSelectedModels((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || selectedModels.length === 0 || isRunning) return;

    setIsRunning(true);
    setResults([]);
    try {
      const res = await runExperiment({
        messages: [{ role: "user", content: prompt }],
        models: selectedModels,
        temperature: parseFloat(temperature) || 0.7,
        tag: tag.trim() || undefined,
        modelVersion: modelVersion.trim() || undefined,
      });
      setResults(res as ExperimentResult[]);
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
              <div className="flex flex-wrap gap-2">
                {MODELS.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-1.5 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedModels.includes(m.id)}
                      onCheckedChange={() => toggleModel(m.id)}
                    />
                    <span className="text-xs">{m.label}</span>
                  </label>
                ))}
              </div>
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

              <Button
                type="submit"
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
            </div>
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
          {MODELS.map((m) => {
            const r = results.find((res) => res.model === m.id);
            const isSelected = selectedModels.includes(m.id);
            const tier = r ? (TIER_LABELS[r.ttlTier] ?? TIER_LABELS[0]) : null;

            return (
              <Card
                key={m.id}
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
                        {m.label}
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
                          isSelected
                            ? "bg-primary/5 text-primary"
                            : "bg-muted text-muted-foreground/30"
                        }`}
                      >
                        {isSelected ? (
                          isRunning ? (
                            <Loader2 className="size-5 animate-spin" />
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
                              : "Standby"
                            : "Disabled"}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 px-4 leading-normal">
                          {isSelected
                            ? isRunning
                              ? "Waiting for model response..."
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
