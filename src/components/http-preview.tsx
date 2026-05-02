"use client";

import { Fragment, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Copy, Check, Send, RotateCw, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { generateHttpFileContent } from "@/lib/generate-http";
import { extractDeclaredVariables, parseHttpContent } from "@/lib/parse-http-content";
import {
  isAbortError,
  isLikelyCorsError,
  sendHttpRequest,
  type HttpResponseResult,
} from "@/services/http-request.service";
import { ResponsePanel } from "@/components/response-panel";
import { HttpVarsPanel } from "@/components/http-vars-panel";
import { useHttpVars } from "@/contexts/http-vars-context";
import { useLanguage } from "@/contexts/language-context";
import type { ParsedSpec, ParsedEndpoint } from "@/types/openapi";

// Text colours that mirror the MethodBadge background palette, adapted for dark mode
const METHOD_TEXT_COLORS: Record<string, string> = {
  GET: "text-blue-600 dark:text-blue-400",
  POST: "text-green-600 dark:text-green-400",
  PUT: "text-yellow-600 dark:text-yellow-400",
  PATCH: "text-orange-600 dark:text-orange-400",
  DELETE: "text-red-600 dark:text-red-400",
  HEAD: "text-purple-600 dark:text-purple-400",
  OPTIONS: "text-gray-600 dark:text-gray-400",
};

type LineType = "section" | "comment" | "variable" | "method" | "header" | "body";

function classifyLine(line: string): LineType {
  if (line.startsWith("###")) {
    return "section";
  }

  if (line.startsWith("#")) {
    return "comment";
  }

  if (line.startsWith("@")) {
    return "variable";
  }

  if (/^(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD|TRACE)\s/.test(line)) {
    return "method";
  }

  if (/^[A-Za-z][\w-]*:\s*/.test(line)) {
    return "header";
  }

  return "body";
}

/** Renders one line with inline syntax colouring (no block layout — used inside a <pre>). */
function SyntaxLine({ line }: { line: string }) {
  if (line === "") {
    return null;
  }

  const type = classifyLine(line);

  switch (type) {
    case "section":
      return <span className="font-semibold text-yellow-500 dark:text-yellow-400">{line}</span>;

    case "comment":
      return <span className="text-muted-foreground">{line}</span>;

    case "variable": {
      const eqIdx = line.indexOf("=");

      if (eqIdx > 0) {
        return (
          <>
            <span className="text-cyan-600 dark:text-cyan-400">{line.slice(0, eqIdx)}</span>
            <span className="text-muted-foreground">{"=" + line.slice(eqIdx + 1)}</span>
          </>
        );
      }

      return <span className="text-cyan-600 dark:text-cyan-400">{line}</span>;
    }

    case "method": {
      const spaceIdx = line.indexOf(" ");
      const method = line.slice(0, spaceIdx);
      const url = line.slice(spaceIdx);
      const methodColor = METHOD_TEXT_COLORS[method] ?? "text-foreground";

      return (
        <>
          <span className={cn("font-bold", methodColor)}>{method}</span>
          <span className="text-foreground">{url}</span>
        </>
      );
    }

    case "header": {
      const colonIdx = line.indexOf(":");

      return (
        <>
          <span className="text-blue-600 dark:text-blue-400">{line.slice(0, colonIdx)}</span>
          <span className="text-muted-foreground">{line.slice(colonIdx)}</span>
        </>
      );
    }

    default:
      // body / JSON
      return <span className="text-green-700 dark:text-green-400">{line}</span>;
  }
}

interface HttpPreviewProps {
  spec: ParsedSpec;
  endpoints: ParsedEndpoint[];
}

export function HttpPreview({ spec, endpoints }: HttpPreviewProps) {
  const { t } = useLanguage();
  const { overrides } = useHttpVars();
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<HttpResponseResult | null>(null);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [responseErrorIsCors, setResponseErrorIsCors] = useState(false);
  const [responseOpen, setResponseOpen] = useState(false);
  const [varsOpen, setVarsOpen] = useState(false);
  // Tracks whether at least one Send has succeeded (or failed) — controls Resend visibility.
  const [hasSent, setHasSent] = useState(false);

  // Holds the AbortController for the in-flight fetch, so the user can cancel it.
  const abortRef = useRef<AbortController | null>(null);

  const hasEndpoints = endpoints.length > 0;
  // Sending is only meaningful when exactly one endpoint is selected — otherwise
  // it's ambiguous which request the user wants to execute.
  const canSend = endpoints.length === 1;

  // Generate the full file content for all selected endpoints in selection order.
  const content = useMemo(() => {
    if (endpoints.length === 0) {
      return null;
    }

    return generateHttpFileContent(spec, endpoints);
  }, [spec, endpoints]);

  const lines = useMemo(() => (content ? content.split("\n") : []), [content]);

  // Variables declared in the current preview content (including the auto-emitted
  // `@baseUrl` / `@token`). The Variables panel uses this to show editable rows.
  const declaredVars = useMemo(() => (content ? extractDeclaredVariables(content) : {}), [content]);

  const handleCopy = useCallback(() => {
    if (!content) {
      return;
    }

    navigator.clipboard
      .writeText(content)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Clipboard write failed (e.g. permissions denied) — silently ignore
      });
  }, [content]);

  const handleSend = useCallback(async () => {
    if (!content || !canSend) {
      return;
    }

    const { requests } = parseHttpContent(content, { overrides });

    if (requests.length === 0) {
      return;
    }

    // Cancel any in-flight request before starting a new one.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSending(true);
    setResponseOpen(true);
    setResponse(null);
    setResponseError(null);
    setResponseErrorIsCors(false);
    setHasSent(true);

    try {
      const result = await sendHttpRequest(requests[0], { signal: controller.signal });
      setResponse(result);
    } catch (err) {
      // Aborts are user-initiated cancellations — don't render them as errors.
      if (isAbortError(err)) {
        setResponseError(t.responseCancelled);
        setResponseErrorIsCors(false);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        setResponseError(message);
        setResponseErrorIsCors(isLikelyCorsError(err));
      }
    } finally {
      // Only clear the controller if it's still the active one (a follow-up
      // Send may have already replaced it).
      if (abortRef.current === controller) {
        abortRef.current = null;
      }

      setSending(false);
    }
  }, [content, canSend, overrides, t.responseCancelled]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleCloseResponse = useCallback(() => {
    abortRef.current?.abort();
    setResponseOpen(false);
    setResponse(null);
    setResponseError(null);
    setResponseErrorIsCors(false);
  }, []);

  // Cancel any in-flight request on unmount to avoid setting state after unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Keyboard shortcut: Ctrl/Cmd+Enter sends the current request.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (canSend && !sending) {
          e.preventDefault();
          handleSend();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canSend, sending, handleSend]);

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="shrink-0 flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="truncate text-base">{t.previewTitle}</CardTitle>
        {hasEndpoints && (
          <div className="flex items-center gap-2">
            {sending ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                title={t.previewCancel}
                className="text-destructive hover:text-destructive"
              >
                <XIcon className="mr-1.5 h-3.5 w-3.5" />
                {t.previewCancel}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSend}
                disabled={!canSend}
                title={!canSend ? t.previewSendDisabledHint : t.previewSendShortcutHint}
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {t.previewSend}
              </Button>
            )}
            {hasSent && !sending && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSend}
                disabled={!canSend}
                title={t.previewResend}
                aria-label={t.previewResend}
              >
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? (
                <Check className="mr-1.5 h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="mr-1.5 h-3.5 w-3.5" />
              )}
              {copied ? t.previewCopied : t.previewCopy}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
        {!hasEndpoints ? (
          <div className="text-muted-foreground px-6 py-12 text-center text-sm">
            {t.previewSelectEndpoint}
          </div>
        ) : (
          <>
            <HttpVarsPanel
              declared={declaredVars}
              open={varsOpen}
              onToggle={() => setVarsOpen((prev) => !prev)}
            />
            <pre className="bg-muted/30 flex-1 overflow-auto px-6 py-4 font-mono text-xs leading-relaxed">
              <code>
                {lines.map((line, i) => (
                  <Fragment key={i}>
                    <SyntaxLine line={line} />
                    {i < lines.length - 1 && "\n"}
                  </Fragment>
                ))}
              </code>
            </pre>
          </>
        )}

        {responseOpen && (
          <ResponsePanel
            loading={sending}
            error={responseError}
            errorIsCors={responseErrorIsCors}
            response={response}
            onClose={handleCloseResponse}
          />
        )}
      </CardContent>
    </Card>
  );
}
