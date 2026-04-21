"use client";

import { Fragment, useMemo, useState, useCallback } from "react";
import { Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { generateHttpFileContent } from "@/lib/generate-http";
import { slugify } from "@/services/http-file.service";
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
  if (line.startsWith("###")) return "section";
  if (line.startsWith("#")) return "comment";
  if (line.startsWith("@")) return "variable";
  if (/^(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD|TRACE)\s/.test(line)) return "method";
  if (/^[A-Za-z][\w-]*:\s*/.test(line)) return "header";
  return "body";
}

/** Renders one line with inline syntax colouring (no block layout — used inside a <pre>). */
function SyntaxLine({ line }: { line: string }) {
  if (line === "") return null;

  const type = classifyLine(line);

  switch (type) {
    case "section":
      return (
        <span className="text-yellow-500 dark:text-yellow-400 font-semibold">{line}</span>
      );

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
  endpoint: ParsedEndpoint | null;
}

export function HttpPreview({ spec, endpoint }: HttpPreviewProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  // Generate the full file content for the single selected endpoint so the preview
  // includes the @baseUrl / @token header and is immediately copy-pasteable.
  const content = useMemo(() => {
    if (!endpoint) return null;
    return generateHttpFileContent(spec, [endpoint]);
  }, [spec, endpoint]);

  const lines = useMemo(() => (content ? content.split("\n") : []), [content]);

  const handleDownload = () => {
    if (!endpoint || !content) return;
    const rawLabel =
      endpoint.summary ||
      endpoint.operationId ||
      `${endpoint.method}-${endpoint.path.replace(/\//g, "-")}`;
    const filename = `${slugify(rawLabel)}.http`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = useCallback(() => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Clipboard write failed (e.g. permissions denied) — silently ignore
    });
  }, [content]);

  const label = endpoint
    ? endpoint.summary || endpoint.operationId || `${endpoint.method} ${endpoint.path}`
    : null;

  return (
    <Card className="flex flex-col h-[600px] overflow-hidden">
      <CardHeader className="px-6 py-3 flex-row items-center justify-between space-y-0 shrink-0 gap-2 border-b">
        <CardTitle className="text-base truncate">
          {label ?? t.previewTitle}
        </CardTitle>
        {endpoint && (
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? (
                <Check className="w-3.5 h-3.5 mr-1.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 mr-1.5" />
              )}
              {copied ? t.previewCopied : t.previewCopy}
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {t.previewDownload}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0 overflow-hidden flex-1 flex flex-col">
        {!endpoint ? (
          <div className="flex-1 flex items-center justify-center text-center text-sm text-muted-foreground px-6">
            {t.previewSelectEndpoint}
          </div>
        ) : (
          <pre className="flex-1 overflow-auto px-6 py-4 text-xs font-mono leading-relaxed bg-muted/30">
            <code>
              {lines.map((line, i) => (
                <Fragment key={i}>
                  <SyntaxLine line={line} />
                  {i < lines.length - 1 && "\n"}
                </Fragment>
              ))}
            </code>
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
