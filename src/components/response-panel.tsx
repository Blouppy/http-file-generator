"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import type { HttpResponseResult } from "@/services/http-request.service";

interface ResponsePanelProps {
  loading: boolean;
  error?: string | null;
  /** When true, shows a CORS-specific hint alongside the error message. */
  errorIsCors?: boolean;
  response?: HttpResponseResult | null;
  onClose: () => void;
}

/**
 * Returns the colour classes used for the status badge based on the HTTP status code.
 * 1xx info, 2xx success, 3xx redirect, 4xx client error, 5xx server error.
 */
function statusColorClasses(status: number): string {
  if (status >= 200 && status < 300) {
    return "bg-green-600 text-white dark:bg-green-700";
  }

  if (status >= 300 && status < 400) {
    return "bg-blue-600 text-white dark:bg-blue-700";
  }

  if (status >= 400 && status < 500) {
    return "bg-orange-600 text-white dark:bg-orange-700";
  }

  if (status >= 500) {
    return "bg-red-600 text-white dark:bg-red-700";
  }

  return "bg-muted text-foreground";
}

/** Pretty-prints JSON; falls back to the raw text on parse failure. */
function formatBody(body: string, contentType: string | null): string {
  if (!body) {
    return "";
  }

  if (contentType && contentType.toLowerCase().includes("json")) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }

  return body;
}

/** Formats response size in B / KB. */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function ResponsePanel({
  loading,
  error,
  errorIsCors,
  response,
  onClose,
}: ResponsePanelProps) {
  const { t } = useLanguage();
  const [headersOpen, setHeadersOpen] = useState(false);

  const formattedBody = useMemo(
    () => (response ? formatBody(response.body, response.contentType) : ""),
    [response],
  );

  return (
    <div className="bg-background flex max-h-[50%] shrink-0 flex-col overflow-hidden border-t">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-sm font-semibold">{t.responseTitle}</span>

          {loading && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t.responseSending}
            </span>
          )}

          {response && !loading && (
            <>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 font-mono text-xs font-bold",
                  statusColorClasses(response.status),
                )}
              >
                {response.status} {response.statusText}
              </span>
              <span className="text-muted-foreground font-mono text-xs">
                {response.durationMs} ms · {formatSize(response.size)}
              </span>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 shrink-0 p-0"
          onClick={onClose}
          aria-label={t.responseClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && !loading && (
          <div className="flex flex-col gap-2 px-4 py-3">
            <div className="text-destructive font-mono text-xs whitespace-pre-wrap">{error}</div>
            {errorIsCors && (
              <div className="bg-muted/50 text-muted-foreground rounded-md border px-3 py-2 text-xs">
                <p className="text-foreground mb-1 font-semibold">{t.responseCorsHintTitle}</p>
                <p>{t.responseCorsHintBody}</p>
              </div>
            )}
          </div>
        )}

        {response && !loading && (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => setHeadersOpen((prev) => !prev)}
              className="text-muted-foreground hover:bg-muted/50 flex items-center gap-1 px-4 py-2 text-left text-xs font-medium"
            >
              {headersOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              {t.responseHeaders} ({response.headers.length})
            </button>

            {headersOpen && (
              <pre className="bg-muted/30 overflow-x-auto px-4 py-2 font-mono text-xs">
                <code>{response.headers.map((h) => `${h.name}: ${h.value}`).join("\n")}</code>
              </pre>
            )}

            <div className="text-muted-foreground border-t px-4 py-2 text-xs font-medium">
              {t.responseBody}
            </div>
            <pre className="bg-muted/30 flex-1 overflow-x-auto px-4 py-2 font-mono text-xs leading-relaxed">
              <code>{formattedBody || <span className="italic">{t.responseEmptyBody}</span>}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
