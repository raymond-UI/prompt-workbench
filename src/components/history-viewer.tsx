"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import {
  History,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  Search,
  ChevronRight,
  ChevronDown,
  Database,
  Hash,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MODELS = [
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku" },
  { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
  { id: "qwen/qwen3-coder-next", label: "Qwen 3 Coder Next" },
] as const;

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

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

type HistoryEntry = {
  cacheKey: string;
  request: unknown;
  response: unknown;
  model: string;
  modelVersion?: string;
  tags?: string[];
  metadata?: unknown;
  storedAt: number;
  isCurrent: boolean;
};

export default function HistoryViewer() {
  const [prompt, setPrompt] = useState(
    "Explain the concept of cache invalidation in one paragraph.",
  );
  const [model, setModel] = useState<string>("openai/gpt-4o-mini");
  const [temperature, setTemperature] = useState("0.7");
  const [submitted, setSubmitted] = useState(false);
  const [request, setRequest] = useState<Record<string, unknown> | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const history = useQuery(api.llm.getHistory, request ? { request } : "skip");

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setRequest({
      messages: [{ role: "user", content: prompt }],
      model,
      temperature: parseFloat(temperature) || 0.7,
    });
    setSubmitted(true);
  }

  const copyResponse = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    toast.success("Response copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="grid grid-cols-[1fr_2fr] gap-4">
      <Card className="border-muted shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/30">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" />
            Request Lookup
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="history-prompt"
                className="text-[10px] uppercase text-muted-foreground font-semibold"
              >
                Prompt
              </Label>
              <textarea
                id="history-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all resize-none font-sans leading-relaxed"
                placeholder="Enter the prompt to look up..."
              />
            </div>

            <div className="flex flex-wrap gap-4 items-end">
              <div className="w-64">
                <Label className="text-[10px] uppercase text-muted-foreground font-semibold mb-1.5 block">
                  Model
                </Label>
                <Select value={model} onValueChange={(v) => v && setModel(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-24">
                <Label
                  htmlFor="history-temp"
                  className="text-[10px] uppercase text-muted-foreground font-semibold mb-1.5 block"
                >
                  Temp
                </Label>
                <Input
                  id="history-temp"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="h-9"
                />
              </div>

              <Button
                type="submit"
                disabled={!prompt.trim()}
                className="h-9 px-6 gap-2 ml-auto"
              >
                <History className="size-4" />
                Find History
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-2 bg-card">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight">
              Response Timeline
            </h2>
            {history && (
              <Badge variant="secondary" className="font-mono text-[10px]">
                {history.length} Version{history.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>

        {history === undefined ? (
          <Card className="border-muted">
            <CardContent className="p-12 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="size-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <p className="text-xs text-muted-foreground">
                  Searching history...
                </p>
              </div>
            </CardContent>
          </Card>
        ) : history.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                <AlertCircle className="size-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">No history found</p>
                <p className="text-xs text-muted-foreground max-w-[250px] mx-auto leading-relaxed">
                  This specific combination of prompt, model, and temperature
                  hasn't been cached yet.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="relative pl-4">
            <div className="absolute left-[15px] top-4 bottom-4 w-px bg-linear-to-b from-primary/50 via-border to-transparent" />

            <div className="space-y-6">
              {history.map((entry: HistoryEntry, i: number) => (
                <div
                  key={`${entry.storedAt}-${i}`}
                  className="relative pl-8 animate-in fade-in slide-in-from-left-2 duration-300"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div
                    className={`absolute left-[-6px] top-1.5 size-4 rounded-full border-2 border-background flex items-center justify-center shadow-sm z-10 ${entry.isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {entry.isCurrent ? (
                      <CheckCircle2 className="size-2.5" />
                    ) : (
                      <Clock className="size-2.5" />
                    )}
                  </div>

                  <Card
                    className={`overflow-hidden transition-all duration-200 hover:shadow-md ${entry.isCurrent ? "border-primary/50 shadow-sm" : "border-muted"}`}
                  >
                    <div
                      className={`px-4 py-2 border-b flex items-center justify-between flex-wrap gap-2 ${entry.isCurrent ? "bg-primary/5" : "bg-muted/10"}`}
                    >
                      <div className="flex items-center gap-3">
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5 cursor-help">
                              <Clock className="size-3" />
                              {formatRelative(entry.storedAt)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-[10px]">
                              {formatDate(entry.storedAt)}
                            </p>
                          </TooltipContent>
                        </Tooltip>

                        <div className="flex gap-1.5">
                          {entry.isCurrent ? (
                            <Badge
                              variant="default"
                              className="text-[9px] h-4 px-1.5 leading-none"
                            >
                              Current
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[9px] h-4 px-1.5 leading-none text-muted-foreground"
                            >
                              Archived
                            </Badge>
                          )}
                          {entry.modelVersion && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] h-4 px-1.5 leading-none bg-muted/50 border-transparent"
                            >
                              v{entry.modelVersion}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {entry.tags?.map((t) => (
                          <Badge
                            key={t}
                            variant="outline"
                            className="text-[9px] h-4 px-1.5 bg-background border-muted text-muted-foreground"
                          >
                            #{t}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-4">
                      <div className="relative group/resp">
                        <div className="absolute right-0 top-0 opacity-0 group-hover/resp:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] gap-1.5 bg-background shadow-sm"
                            onClick={() =>
                              copyResponse(extractContent(entry.response), i)
                            }
                          >
                            {copiedIndex === i ? (
                              <>
                                <Check className="size-3 text-green-500" />{" "}
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" /> Copy
                              </>
                            )}
                          </Button>
                        </div>
                        <div className="text-sm leading-relaxed max-h-80 overflow-y-auto pr-2 custom-scrollbar markdown-content">
                          <Streamdown>
                            {extractContent(entry.response)}
                          </Streamdown>
                        </div>
                      </div>

                      <details className="text-[11px] group">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 list-none font-medium">
                          <ChevronRight className="size-3 group-open:rotate-90 transition-transform" />
                          <span>Raw Data Payload</span>
                        </summary>
                        <div className="mt-3 space-y-2 animate-in slide-in-from-top-1 duration-200">
                          <div className="flex items-center gap-4 text-[10px] text-muted-foreground px-1 pb-1">
                            <div className="flex items-center gap-1">
                              <Database className="size-3" />{" "}
                              {entry.cacheKey.slice(0, 12)}...
                            </div>
                            <div className="flex items-center gap-1">
                              <Hash className="size-3" /> Version:{" "}
                              {entry.modelVersion || "Initial"}
                            </div>
                          </div>
                          <pre className="font-mono bg-muted/30 border rounded-md p-3 overflow-x-auto max-h-48 overflow-y-auto text-[10px] leading-relaxed">
                            {JSON.stringify(entry.response, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
