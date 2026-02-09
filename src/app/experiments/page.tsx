"use client";

import ExperimentExplorer from "@/components/experiment-explorer";

export default function ExperimentsPage() {
  return (
    <div className="flex flex-col p-4">
      <div className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">Explorer</h1>
        <p className="text-xs text-muted-foreground">
          Browse all cached responses. Filter by model, experiment tag, or time
          range. Pin the best results to keep them forever.
        </p>
      </div>
      <ExperimentExplorer />
    </div>
  );
}
