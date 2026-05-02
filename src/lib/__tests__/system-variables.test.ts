import { hasSystemVariables, resolveSystemVariables } from "@/lib/system-variables";

describe("resolveSystemVariables", () => {
  it("leaves text without placeholders untouched", () => {
    expect(resolveSystemVariables("plain text")).toBe("plain text");
  });

  it("returns a v4 GUID for {{$guid}}", () => {
    const out = resolveSystemVariables("{{$guid}}");

    expect(out).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("supports the {{$uuid}} alias", () => {
    const out = resolveSystemVariables("{{$uuid}}");

    expect(out).toMatch(/^[0-9a-f]{8}-/i);
  });

  it("returns a unix timestamp for {{$timestamp}}", () => {
    const before = Math.floor(Date.now() / 1000);
    const out = Number.parseInt(resolveSystemVariables("{{$timestamp}}"), 10);
    const after = Math.floor(Date.now() / 1000);

    expect(out).toBeGreaterThanOrEqual(before);
    expect(out).toBeLessThanOrEqual(after);
  });

  it("applies an offset to {{$timestamp <amount> <unit>}}", () => {
    const now = Math.floor(Date.now() / 1000);
    const out = Number.parseInt(resolveSystemVariables("{{$timestamp -1 d}}"), 10);

    // 1 day = 86 400 s. Allow a tiny tolerance for clock drift between calls.
    expect(now - out).toBeGreaterThanOrEqual(86_399);
    expect(now - out).toBeLessThanOrEqual(86_401);
  });

  it("returns ISO-8601 by default for {{$datetime iso8601}}", () => {
    const out = resolveSystemVariables("{{$datetime iso8601}}");

    // Either ISO-8601 with milliseconds or without (depends on locale): both are fine.
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(out.endsWith("Z")).toBe(true);
  });

  it("returns RFC-1123 for {{$datetime rfc1123}}", () => {
    const out = resolveSystemVariables("{{$datetime rfc1123}}");

    expect(out).toMatch(/^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
  });

  it("returns an integer in [min, max) for {{$randomInt min max}}", () => {
    for (let i = 0; i < 50; i++) {
      const out = Number.parseInt(resolveSystemVariables("{{$randomInt 5 10}}"), 10);

      expect(out).toBeGreaterThanOrEqual(5);
      expect(out).toBeLessThan(10);
    }
  });

  it("substitutes multiple placeholders independently", () => {
    const out = resolveSystemVariables("a={{$randomInt 0 1}} b={{$randomInt 0 1}}");

    expect(out).toMatch(/^a=0 b=0$/);
  });

  it("leaves unknown system variables untouched", () => {
    expect(resolveSystemVariables("{{$unknownThing}}")).toBe("{{$unknownThing}}");
  });

  it("hasSystemVariables returns true only when a $-placeholder is present", () => {
    expect(hasSystemVariables("plain")).toBe(false);
    expect(hasSystemVariables("{{userVar}}")).toBe(false);
    expect(hasSystemVariables("{{$guid}}")).toBe(true);
  });
});
