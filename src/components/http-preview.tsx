"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Copy, Check, Send, RotateCw, RotateCcw, X as XIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateHttpFileContent } from "@/lib/generate-http";
import { extractRequestBlock, findRequestBlockLines } from "@/lib/parse-http-content";
import { ResponsePanel } from "@/components/response-panel";
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

  const hasEndpoints = endpoints.length > 0;
  // Sending the whole previewed file (toolbar Send) is only meaningful when
  // exactly one endpoint is selected — otherwise it's ambiguous which
  // request the user wants to execute. Per-block Send Request links work
  // regardless of how many endpoints are selected.
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
  const [editedContent, setEditedContent] = useState<string | null>(null);

  // Whenever the generated baseline changes (selection / spec change), drop any
  // user edits — they almost certainly no longer make sense for the new content.
  useEffect(() => {
    setEditedContent(null);
  }, [generatedContent]);

  // The effective content used by Send / Copy. Falls back to the generated
  // baseline when the user hasn't edited anything.
  const content = editedContent ?? generatedContent;
  const isEdited = editedContent !== null && editedContent !== generatedContent;

  // Track which block (if any) is currently being sent so we can show a spinner
  // on the matching per-block Send button. `null` means no per-block send is in flight.
  const [pendingBlockIdx, setPendingBlockIdx] = useState<number | null>(null);

  // Reset the per-block "in flight" indicator once the sender finishes.
  useEffect(() => {
    if (!sender.loading) {
      setPendingBlockIdx(null);
    }
  }, [sender.loading]);

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

  const handleSendBlock = useCallback(
    (blockIdx: number) => {
      if (!content || sender.loading) {
        return;
      }

      const blockContent = extractRequestBlock(content, blockIdx);

      if (!blockContent) {
        return;
      }

      setPendingBlockIdx(blockIdx);
      sender.sendContent(blockContent);
    },
    [content, sender],
  );

  // Build per-line decorations for the editor: a "Send Request" link rendered
  // ABOVE every `### …` separator (left-aligned, like VSCode REST Client's
  // CodeLens). Each link sends only its own block regardless of selection.
  const decorations = useMemo(() => {
    if (!content) {
      return [];
    }

    const blockLines = findRequestBlockLines(content);

    return blockLines.map((line, blockIdx) => ({
      line,
      node: (
        <button
          type="button"
          onClick={() => handleSendBlock(blockIdx)}
          disabled={sender.loading}
          title={t.previewSendRequest}
          aria-label={t.previewSendRequest}
          className="text-primary hover:bg-primary/10 inline-flex h-5 cursor-pointer items-center gap-1 rounded px-1.5 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sender.loading && pendingBlockIdx === blockIdx ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Send className="h-3 w-3" />
          )}
          <span>{t.previewSendRequest}</span>
        </button>
      ),
    }));
  }, [content, sender.loading, pendingBlockIdx, handleSendBlock, t.previewSendRequest]);

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
          <div className="flex min-h-0 flex-1 flex-col">
            <HighlightedHttpEditor
              value={content ?? ""}
              onChange={setEditedContent}
              ariaLabel={t.previewTitle}
              decorations={decorations}
            />
          </div>
        )}

        {sender.isOpen && (
          <ResponsePanel
            loading={sender.loading}
            error={sender.error}
            response={sender.response}
            onClose={sender.close}
          />
        )}
      </CardContent>
    </Card>
  );
}
