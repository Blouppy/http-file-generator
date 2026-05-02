"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Copy, Check, Send, RotateCw, RotateCcw, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  // This is the "baseline" — what the file would look like if the user hadn't edited it.
  const generatedContent = useMemo(() => {
    if (endpoints.length === 0) {
      return null;
    }

    return generateHttpFileContent(spec, endpoints);
  }, [spec, endpoints]);

  // User-edited content. `null` means "unmodified — use generatedContent as-is".
  // Tracking edits separately means typing in the textarea doesn't disrupt the
  // selection-driven regeneration: when the user changes selection we know to
  // reset the edit, otherwise the edit persists across re-renders.
  const [editedContent, setEditedContent] = useState<string | null>(null);

  // Whenever the generated baseline changes (selection / spec change), drop any
  // user edits — they almost certainly no longer make sense for the new content.
  useEffect(() => {
    setEditedContent(null);
  }, [generatedContent]);

  // The effective content used by Send / Copy / variable extraction. Falls back
  // to the generated baseline when the user hasn't edited anything.
  const content = editedContent ?? generatedContent;
  const isEdited = editedContent !== null && editedContent !== generatedContent;

  // Variables declared in the (possibly edited) preview content. The Variables
  // panel uses this to know which fields to render — so adding `@myVar = …` in
  // the textarea makes a row appear, just like with file-declared variables.
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

  const handleResetEdits = useCallback(() => {
    setEditedContent(null);
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
            {isEdited && !sending && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleResetEdits}
                title={t.previewResetEdits}
                aria-label={t.previewResetEdits}
              >
                <RotateCcw className="h-3.5 w-3.5" />
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
            <textarea
              value={content ?? ""}
              onChange={(e) => setEditedContent(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              aria-label={t.previewTitle}
              className="bg-muted/30 text-foreground caret-foreground flex-1 resize-none overflow-auto border-0 px-6 py-4 font-mono text-xs leading-relaxed whitespace-pre focus:outline-none focus-visible:ring-0"
            />
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
