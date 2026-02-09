"use client";

import HistoryViewer from "@/components/history-viewer";

export default function HistoryPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-4">
      <div className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">Time Travel</h1>
        <p className="text-xs text-muted-foreground">
          See how a model&apos;s response to the same prompt has changed over
          time. Each time you re-run an experiment and get a different answer,
          the old one is archived.
        </p>
      </div>
      <HistoryViewer />
    </div>
  );
}
