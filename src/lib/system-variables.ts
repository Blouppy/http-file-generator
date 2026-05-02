/**
 * Resolves "system" variables in `.http` content — placeholders that start
 * with `$` and produce dynamic values at request time.
 *
 * Inspired by the VSCode REST Client extension. Supported forms:
 *
 *   {{$guid}}                          → RFC 4122 v4 UUID
 *   {{$timestamp}}                     → seconds since epoch
 *   {{$timestamp <offset> <unit>}}     → e.g. {{$timestamp -1 d}} (1 day ago)
 *   {{$datetime iso8601}}              → ISO-8601 timestamp (UTC, ms precision)
 *   {{$datetime iso8601 <off> <unit>}} → ISO-8601 with offset
 *   {{$datetime rfc1123}}              → RFC-1123 date
 *   {{$randomInt min max}}             → integer in [min, max)
 *
 * `unit` accepts: `s`/`m`/`h`/`d`/`w`/`M`/`y` (seconds … years).
 *
 * The resolver is intentionally pure — values are produced from the current
 * clock and `Math.random` / `crypto.randomUUID` only. No env vars, no .env
 * file lookup; those would require additional UI surface.
 */

const SYSTEM_PLACEHOLDER_REGEX = /\{\{\s*\$([A-Za-z]+)([^}]*)\}\}/g;

const UNIT_TO_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
  M: 2_592_000_000, // 30 days, REST Client convention
  y: 31_536_000_000, // 365 days
};

/** Generates a random hex string of the given length. */
function randomHex(length: number): string {
  let out = "";

  for (let i = 0; i < length; i++) {
    out += Math.floor(Math.random() * 16).toString(16);
  }

  return out;
}

/** Returns an RFC 4122 v4 UUID, preferring the platform's crypto API when available. */
function generateGuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // Fallback for environments without crypto.randomUUID.
  return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-${"89ab"[Math.floor(Math.random() * 4)]}${randomHex(3)}-${randomHex(12)}`;
}

/** Parses an integer, returning `fallback` when the value is not a finite integer. */
function parseIntOrDefault(raw: string | undefined, fallback: number): number {
  if (raw === undefined) {
    return fallback;
  }

  const n = Number.parseInt(raw, 10);

  return Number.isFinite(n) ? n : fallback;
}

/** Computes a millisecond offset from an "<amount> <unit>" tuple. */
function offsetMs(amountRaw: string | undefined, unitRaw: string | undefined): number {
  const amount = parseIntOrDefault(amountRaw, 0);

  if (amount === 0 || !unitRaw) {
    return 0;
  }

  const factor = UNIT_TO_MS[unitRaw];

  if (!factor) {
    return 0;
  }

  return amount * factor;
}

/** Resolves a single `$<name> <args>` placeholder; returns `null` when unknown. */
function resolveSystem(name: string, argsRaw: string): string | null {
  const args = argsRaw.trim().split(/\s+/).filter(Boolean);

  switch (name) {
    case "guid":
    case "uuid":
      return generateGuid();

    case "timestamp": {
      const base = Math.floor(Date.now() / 1000);
      const offset = Math.floor(offsetMs(args[0], args[1]) / 1000);

      return String(base + offset);
    }

    case "datetime": {
      const format = args[0]?.toLowerCase() ?? "iso8601";
      const offset = offsetMs(args[1], args[2]);
      const date = new Date(Date.now() + offset);

      if (format === "rfc1123") {
        return date.toUTCString();
      }

      // Default → iso8601
      return date.toISOString();
    }

    case "randomInt": {
      const min = parseIntOrDefault(args[0], 0);
      const max = parseIntOrDefault(args[1], min + 100);

      if (max <= min) {
        return String(min);
      }

      return String(min + Math.floor(Math.random() * (max - min)));
    }

    default:
      return null;
  }
}

/**
 * Replaces every `{{$…}}` placeholder in `input` with its resolved value.
 * Unknown system variables are left untouched so the user can see what
 * failed to resolve.
 */
export function resolveSystemVariables(input: string): string {
  return input.replace(SYSTEM_PLACEHOLDER_REGEX, (match, name: string, argsRaw: string) => {
    const value = resolveSystem(name, argsRaw);

    return value === null ? match : value;
  });
}

/** Returns true when `input` contains at least one `{{$…}}` placeholder. */
export function hasSystemVariables(input: string): boolean {
  // Reset state by constructing a new regex; the module-level one has the `g` flag.
  return /\{\{\s*\$[A-Za-z]+[^}]*\}\}/.test(input);
}
