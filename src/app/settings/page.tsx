"use client";

import SettingsPanel from "@/components/settings-panel";

export default function SettingsPage() {
  return (
    <div className="flex flex-col p-4">
      <div className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground">
          Configure cache TTLs, run cleanup, and invalidate entries.
        </p>
      </div>
      <SettingsPanel />
    </div>
  );
}
