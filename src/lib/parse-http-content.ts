/**
 * Minimal `.http` file parser used by the in-browser request runner.
 *
 * Supports the subset of the REST Client / .http format that this app emits:
 *   - File-level and per-request `@var = value` declarations.
 *   - One or more request blocks separated by `### …` headers.
 *   - A request line `METHOD URL`, optional header lines `Name: value`, and
 *     an optional body (separated from the headers by a blank line).
 *   - `{{var}}` placeholder substitution in the URL, header values and body.
 *   - User-provided variable overrides (passed via `ParseOptions.overrides`),
 *     which take precedence over `@var` declarations — used by the Variables
 *     panel so the user can change e.g. `baseUrl` without editing the
 *     read-only preview.
 *   - System variables: `{{$guid}}`, `{{$timestamp}}`, `{{$datetime …}}`,
 *     `{{$randomInt min max}}`. Resolved AFTER user variables so a user
 *     can still bind `@id = {{$guid}}` if they wish.
 *
 * Lines starting with `#` (other than `###`) are treated as comments and skipped.
 */

import { resolveSystemVariables } from "@/lib/system-variables";

const METHOD_LINE_REGEX = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE)\s+(\S.*)$/i;
const VAR_DECLARATION_REGEX = /^@([A-Za-z_][\w-]*)\s*=\s*(.*)$/;
const PLACEHOLDER_REGEX = /\{\{\s*([A-Za-z_][\w-]*)\s*\}\}/g;

export interface ParsedHttpRequest {
  /** Optional label coming from the `### Label` separator. */
  label?: string;
  method: string;
  url: string;
  headers: Array<{ name: string; value: string }>;
  body?: string;
  /** Variable names referenced by the request that were not resolved. */
  unresolvedVariables: string[];
}

export interface ParseHttpContentResult {
  /** Variables declared at the top of the file (before the first `###`). */
  globalVariables: Record<string, string>;
  requests: ParsedHttpRequest[];
}

export interface ParseHttpContentOptions {
  /**
   * User-provided variable values that override `@var` declarations from
   * the file. Used by the Variables panel — e.g. to point `baseUrl` at
   * a different environment without editing the read-only preview.
   */
  overrides?: Record<string, string>;
}

/**
 * Substitutes `{{var}}` placeholders in the input string using the given
 * variable map. Records every placeholder name that has no matching entry
 * in the map (the placeholder itself is left in the output untouched so
 * the caller can still display the un-substituted string).
 */
function substituteVariables(
  input: string,
  variables: Record<string, string>,
  unresolved: Set<string>,
): string {
  return input.replace(PLACEHOLDER_REGEX, (match, name: string) => {
    if (Object.prototype.hasOwnProperty.call(variables, name)) {
      return variables[name];
    }

    unresolved.add(name);

    return match;
  });
}

/**
 * Splits the file into raw request blocks (each block is the lines between
 * two `###` separators). Lines that appear before the first `###` are
 * collected into a "global" preamble used for file-level variable declarations.
 */
function splitIntoBlocks(content: string): {
  preamble: string[];
  blocks: { label?: string; lines: string[] }[];
} {
  const lines = content.split(/\r?\n/);
  const preamble: string[] = [];
  const blocks: { label?: string; lines: string[] }[] = [];
  let current: { label?: string; lines: string[] } | null = null;

  for (const line of lines) {
    if (line.startsWith("###")) {
      const label = line.replace(/^###\s*/, "").trim() || undefined;
      current = { label, lines: [] };
      blocks.push(current);

      continue;
    }

    if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }

  return { preamble, blocks };
}

/** Extracts `@var = value` declarations from a list of lines. */
function collectVariables(lines: string[]): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const raw of lines) {
    const match = raw.match(VAR_DECLARATION_REGEX);

    if (match) {
      vars[match[1]] = match[2].trim();
    }
  }

  return vars;
}

/**
 * Parses a single request block (the lines between two `###` separators).
 * Returns `null` when the block contains no recognisable request line.
 */
function parseRequestBlock(
  label: string | undefined,
  lines: string[],
  globalVariables: Record<string, string>,
): ParsedHttpRequest | null {
  const localVariables = collectVariables(lines);
  // Note: `globalVariables` is already merged with user overrides by the
  // caller, so local declarations win over both global declarations and
  // user overrides — matching REST Client's precedence.
  const variables = { ...globalVariables, ...localVariables };

  let methodLineIdx = -1;
  let methodMatch: RegExpMatchArray | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === "" || line.startsWith("#") || line.startsWith("@")) {
      continue;
    }

    const m = line.match(METHOD_LINE_REGEX);

    if (m) {
      methodLineIdx = i;
      methodMatch = m;
      break;
    }
  }

  if (!methodMatch || methodLineIdx === -1) {
    return null;
  }

  const unresolved = new Set<string>();
  const method = methodMatch[1].toUpperCase();
  const url = resolveSystemVariables(
    substituteVariables(methodMatch[2].trim(), variables, unresolved),
  );

  const headers: Array<{ name: string; value: string }> = [];
  let bodyStartIdx = -1;

  for (let i = methodLineIdx + 1; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (trimmed === "") {
      bodyStartIdx = i + 1;
      break;
    }

    if (trimmed.startsWith("#")) {
      continue;
    }

    const colonIdx = raw.indexOf(":");

    if (colonIdx > 0) {
      const name = raw.slice(0, colonIdx).trim();
      const value = resolveSystemVariables(
        substituteVariables(raw.slice(colonIdx + 1).trim(), variables, unresolved),
      );
      headers.push({ name, value });
    }
  }

  let body: string | undefined;

  if (bodyStartIdx !== -1 && bodyStartIdx < lines.length) {
    const bodyLines = lines.slice(bodyStartIdx);

    while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === "") {
      bodyLines.pop();
    }

    if (bodyLines.length > 0) {
      body = resolveSystemVariables(
        substituteVariables(bodyLines.join("\n"), variables, unresolved),
      );
    }
  }

  return {
    label,
    method,
    url,
    headers,
    body,
    unresolvedVariables: Array.from(unresolved),
  };
}

/**
 * Parses a `.http` file content string into a list of executable requests.
 *
 * `options.overrides` are user-provided values that take precedence over
 * `@var` declarations in the file. They are applied at the global-variable
 * level so per-request `@var` declarations still win (matching REST Client's
 * scope rules).
 */
export function parseHttpContent(
  content: string,
  options: ParseHttpContentOptions = {},
): ParseHttpContentResult {
  const { preamble, blocks } = splitIntoBlocks(content);
  const declaredGlobals = collectVariables(preamble);
  // User overrides win over file-level declarations but lose to per-block declarations.
  const globalVariables = { ...declaredGlobals, ...(options.overrides ?? {}) };

  const requests: ParsedHttpRequest[] = [];

  for (const block of blocks) {
    const parsed = parseRequestBlock(block.label, block.lines, globalVariables);

    if (parsed) {
      requests.push(parsed);
    }
  }

  return { globalVariables: declaredGlobals, requests };
}

/**
 * Extracts the *declared* `@var = value` entries from the file (file-level
 * and per-block), without resolving placeholders or running requests. Used
 * by the Variables panel to know which fields to render and what default
 * values to suggest.
 *
 * The map is keyed by variable name; later declarations win over earlier
 * ones, mirroring the runtime precedence used by `parseHttpContent`.
 */
export function extractDeclaredVariables(content: string): Record<string, string> {
  const { preamble, blocks } = splitIntoBlocks(content);
  const declared: Record<string, string> = { ...collectVariables(preamble) };

  for (const block of blocks) {
    Object.assign(declared, collectVariables(block.lines));
  }

  return declared;
}
