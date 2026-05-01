"use client";

import { Fragment, useMemo, useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { generateHttpFileContent } from "@/lib/generate-http";
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
  const [copied, setCopied] = useState(false);

  const hasEndpoints = endpoints.length > 0;

  // Generate the full file content for all selected endpoints in selection order.
  const content = useMemo(() => {
    if (endpoints.length === 0) {
      return null;
    }

    return generateHttpFileContent(spec, endpoints);
  }, [spec, endpoints]);

  const lines = useMemo(() => (content ? content.split("\n") : []), [content]);

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

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="shrink-0 flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="truncate text-base">{t.previewTitle}</CardTitle>
        {hasEndpoints && (
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? (
              <Check className="mr-1.5 h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="mr-1.5 h-3.5 w-3.5" />
            )}
            {copied ? t.previewCopied : t.previewCopy}
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        {!hasEndpoints ? (
          <div className="text-muted-foreground px-6 py-12 text-center text-sm">
            {t.previewSelectEndpoint}
          </div>
        ) : (
          <pre className="bg-muted/30 h-full overflow-x-auto px-6 py-4 font-mono text-xs leading-relaxed">
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
