/**
 * Minimal `.http` file parser used by the in-browser request runner.
 *
 * Supports the subset of the REST Client / .http format that this app emits:
 *   - File-level and per-request `@var = value` declarations.
 *   - One or more request blocks separated by `### …` headers.
 *   - A request line `METHOD URL`, optional header lines `Name: value`, and
 *     an optional body (separated from the headers by a blank line).
 *   - `{{var}}` placeholder substitution in the URL, header values and body.
 *
 * Lines starting with `#` (other than `###`) are treated as comments and skipped.
 */

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
  const url = substituteVariables(methodMatch[2].trim(), variables, unresolved);

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
      const value = substituteVariables(raw.slice(colonIdx + 1).trim(), variables, unresolved);
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
      body = substituteVariables(bodyLines.join("\n"), variables, unresolved);
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

/** Parses a `.http` file content string into a list of executable requests. */
export function parseHttpContent(content: string): ParseHttpContentResult {
  const { preamble, blocks } = splitIntoBlocks(content);
  const globalVariables = collectVariables(preamble);

  const requests: ParsedHttpRequest[] = [];

  for (const block of blocks) {
    const parsed = parseRequestBlock(block.label, block.lines, globalVariables);

    if (parsed) {
      requests.push(parsed);
    }
  }

  return { globalVariables, requests };
}

/**
 * Returns the line indices (0-based, in `content`) of every `### …` separator.
 * Used by the HTTP preview to render a per-request "Send Request" affordance
 * directly above each request block in the right pane (mirroring VSCode REST
 * Client's CodeLens).
 */
export function findRequestBlockLines(content: string): number[] {
  const lines = content.split(/\r?\n/);
  const indices: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("###")) {
      indices.push(i);
    }
  }

  return indices;
}

/**
 * Returns a self-contained `.http` document containing only the request block
 * at `blockIndex`, with the file-level preamble (comments + `@var` declarations
 * before the first `###`) preserved so variables still resolve.
 *
 * `blockIndex` is the index of the block in document order (0-based). Returns
 * `null` when `blockIndex` is out of range.
 */
export function extractRequestBlock(content: string, blockIndex: number): string | null {
  const lines = content.split(/\r?\n/);
  const blockStarts: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("###")) {
      blockStarts.push(i);
    }
  }

  if (blockIndex < 0 || blockIndex >= blockStarts.length) {
    return null;
  }

  const start = blockStarts[blockIndex];
  const end = blockIndex + 1 < blockStarts.length ? blockStarts[blockIndex + 1] : lines.length;
  const preamble = lines.slice(0, blockStarts[0]);
  const block = lines.slice(start, end);

  return [...preamble, ...block].join("\n");
}
