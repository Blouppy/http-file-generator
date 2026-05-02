"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Copy, Check, Send, RotateCw, RotateCcw, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateHttpFileContent } from "@/lib/generate-http";
import { extractDeclaredVariables } from "@/lib/parse-http-content";
import { ResponsePanel } from "@/components/response-panel";
import { HttpVarsPanel } from "@/components/http-vars-panel";
import { HighlightedHttpEditor } from "@/components/highlighted-http-editor";
import { useHttpSender } from "@/contexts/http-sender-context";
import { useLanguage } from "@/contexts/language-context";
import type { ParsedSpec, ParsedEndpoint } from "@/types/openapi";

interface HttpPreviewProps {
  spec: ParsedSpec;
  endpoints: ParsedEndpoint[];
}

export function HttpPreview({ spec, endpoints }: HttpPreviewProps) {
  const { t } = useLanguage();
  const sender = useHttpSender();
  const [copied, setCopied] = useState(false);
  const [varsOpen, setVarsOpen] = useState(false);

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

  // Variables declared in the (possibly edited) preview content.
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

  const handleSend = useCallback(() => {
    if (!content || !canSend) {
      return;
    }

    sender.sendContent(content);
  }, [content, canSend, sender]);

  // Keyboard shortcut: Ctrl/Cmd+Enter sends the current request.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (canSend && !sender.loading) {
          e.preventDefault();
          handleSend();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canSend, sender.loading, handleSend]);

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="shrink-0 flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="truncate text-base">{t.previewTitle}</CardTitle>
        {hasEndpoints && (
          <div className="flex flex-wrap items-center gap-2">
            {sender.loading ? (
              <Button
                size="sm"
                variant="outline"
                onClick={sender.cancel}
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
            {sender.hasSent && !sender.loading && (
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
            {isEdited && !sender.loading && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditedContent(null)}
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
            <HighlightedHttpEditor
              value={content ?? ""}
              onChange={setEditedContent}
              ariaLabel={t.previewTitle}
            />
          </>
        )}

        {sender.isOpen && (
          <ResponsePanel
            loading={sender.loading}
            error={sender.error}
            errorIsCors={sender.errorIsCors}
            response={sender.response}
            onClose={sender.close}
          />
        )}
      </CardContent>
    </Card>
  );
}
