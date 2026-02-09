"use client";

import Workbench from "@/components/workbench";

export default function HomePage() {
  return (
    <div className="flex flex-col p-4">
      <div className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">Workbench</h1>
        <p className="text-xs text-muted-foreground">
          Run the same prompt across multiple models and temperatures. Results
          are cached automatically — re-runs are instant.
        </p>
      </div>
      <Workbench />
    </div>
  );
}
