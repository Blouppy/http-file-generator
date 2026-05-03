"use client";

import {
  Fragment,
  useCallback,
  useRef,
  type ChangeEvent,
  type ReactNode,
  type UIEvent,
} from "react";
import { cn } from "@/lib/utils";

// Fixed typography metrics so per-line decorations can be positioned exactly
// over the corresponding text row. Both the <pre> and the <textarea> use these
// inline styles instead of Tailwind shorthands so the values are deterministic.
const FONT_SIZE_PX = 12;
const LINE_HEIGHT_PX = 20;
const PAD_X_PX = 24;
const PAD_Y_PX = 16;

// Text colours that mirror the MethodBadge background palette, adapted for dark mode.
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
    // Render a zero-width space so the line still occupies vertical space and
    // matches the textarea's blank lines exactly.
    return <span>{"\u200B"}</span>;
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

interface LineDecoration {
  /** 0-based line index the decoration should sit on. */
  line: number;
  /** Rendered content (typically a button). Will be `pointer-events-auto`. */
  node: ReactNode;
}

interface HighlightedHttpEditorProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  /**
   * Per-line decorations rendered in a scroll-synced overlay above the textarea.
   * Used to put a "Send Request" button next to each `### …` separator
   * (mirroring VSCode REST Client's CodeLens links).
   */
  decorations?: LineDecoration[];
}

/**
 * Editable HTTP preview with syntax highlighting.
 *
 * Implementation: a transparent <textarea> sits on top of a coloured <pre>.
 * Both share identical font, padding, line-height and whitespace handling so
 * each glyph in the textarea lines up exactly with the corresponding coloured
 * glyph in the <pre>. The textarea owns scroll; we mirror its scrollLeft /
 * scrollTop onto the <pre> so the colours stay in sync while the user scrolls.
 *
 * A third (decorations) layer scrolls vertically with the textarea but stays
 * pinned to the right edge horizontally, so per-block "Send Request" buttons
 * remain visible regardless of horizontal scroll.
 */
export function HighlightedHttpEditor({
  value,
  onChange,
  ariaLabel,
  className,
  decorations,
}: HighlightedHttpEditorProps) {
  const preRef = useRef<HTMLPreElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = useCallback((e: UIEvent<HTMLTextAreaElement>) => {
    const pre = preRef.current;
    const overlay = overlayRef.current;
    const scrollTop = e.currentTarget.scrollTop;
    const scrollLeft = e.currentTarget.scrollLeft;

    if (pre) {
      pre.scrollTop = scrollTop;
      pre.scrollLeft = scrollLeft;
    }

    if (overlay) {
      overlay.scrollTop = scrollTop;
    }
  }, []);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const lines = value.split("\n");

  // Inline typography styles must stay identical between the <pre> and the
  // <textarea> so glyphs align perfectly.
  const sharedTypographyStyle = {
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: `${FONT_SIZE_PX}px`,
    lineHeight: `${LINE_HEIGHT_PX}px`,
    padding: `${PAD_Y_PX}px ${PAD_X_PX}px`,
    margin: 0,
    border: 0,
    whiteSpace: "pre" as const,
  };

  // Total scrollable content height — keeps the overlay's inner sizer in sync
  // with the textarea so vertical scroll positions match.
  const contentHeight = lines.length * LINE_HEIGHT_PX + PAD_Y_PX * 2;

  return (
    <div className={cn("bg-muted/30 relative flex-1 overflow-hidden", className)}>
      <pre
        ref={preRef}
        aria-hidden="true"
        style={sharedTypographyStyle}
        className="pointer-events-none absolute inset-0 overflow-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <code>
          {lines.map((line, i) => (
            <Fragment key={i}>
              <SyntaxLine line={line} />
              {i < lines.length - 1 && "\n"}
            </Fragment>
          ))}
        </code>
      </pre>
      <textarea
        value={value}
        onChange={handleChange}
        onScroll={handleScroll}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        aria-label={ariaLabel}
        style={sharedTypographyStyle}
        className="caret-foreground absolute inset-0 h-full w-full resize-none overflow-auto bg-transparent text-transparent focus:outline-none focus-visible:ring-0"
      />
      {decorations && decorations.length > 0 && (
        <div
          ref={overlayRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ overflowY: "scroll" }}
        >
          <div style={{ position: "relative", height: contentHeight }}>
            {decorations.map((d, i) => (
              <div
                key={i}
                className="pointer-events-auto absolute"
                style={{
                  top: PAD_Y_PX + d.line * LINE_HEIGHT_PX,
                  right: PAD_X_PX,
                  height: LINE_HEIGHT_PX,
                }}
              >
                {d.node}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
