"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import type { ParsedSpec } from "@/types/openapi";

interface SelectPageHeaderProps {
  spec: ParsedSpec;
  selectedCount: number;
  onReset: () => void;
  onDownload: () => void;
}

/**
 * Compact header bar shown at the top of the select page.
 * Displays spec metadata (title, version, base URL, endpoint counts)
 * alongside the "Upload new" reset action and the ZIP download button.
 */
export function SelectPageHeader({
  spec,
  selectedCount,
  onReset,
  onDownload,
}: SelectPageHeaderProps) {
  const { t } = useLanguage();
  const isDownloadDisabled = selectedCount === 0;

  return (
    <div className="bg-card flex shrink-0 flex-wrap items-start justify-between gap-3 rounded-lg border px-4 py-3">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold">{spec.title}</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {t.specVersion} {spec.version} &bull; {t.specBaseUrl}:{" "}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">{spec.baseUrl}</code>
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {t.specEndpointCount(spec.endpoints.length)} &bull; {t.specSelectedCount(selectedCount)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onReset}>
          {t.specUploadNew}
        </Button>
        <Button size="sm" onClick={onDownload} disabled={isDownloadDisabled}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {t.download}
        </Button>
      </div>
    </div>
  );
}
