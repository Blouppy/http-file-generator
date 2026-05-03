import { isAbortError, sendHttpRequest } from "@/services/http-request.service";
import type { ParsedHttpRequest } from "@/lib/parse-http-content";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

function makeRequest(overrides: Partial<ParsedHttpRequest> = {}): ParsedHttpRequest {
  return {
    method: "GET",
    url: "https://api.example.com/x",
    headers: [],
    unresolvedVariables: [],
    ...overrides,
  };
}

/** Builds a minimal duck-typed Response object for a successful proxy reply. */
function mockProxyResponse(envelope: unknown, init: { ok?: boolean; status?: number } = {}) {
  const ok = init.ok ?? true;
  const status = init.status ?? 200;

  return {
    ok,
    status,
    json: async () => envelope,
  };
}

describe("sendHttpRequest", () => {
  it("forwards the request to /api/proxy and returns the parsed response", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      mockProxyResponse({
        status: 200,
        statusText: "OK",
        headers: [{ name: "content-type", value: "application/json" }],
        body: '{"ok":true}',
        contentType: "application/json",
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendHttpRequest(makeRequest());

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/proxy",
      expect.objectContaining({ method: "POST" }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(init.body as string) as { url: string; method: string };
    expect(payload.url).toBe("https://api.example.com/x");
    expect(payload.method).toBe("GET");

    expect(result.status).toBe(200);
    expect(result.statusText).toBe("OK");
    expect(result.body).toBe('{"ok":true}');
    expect(result.contentType).toBe("application/json");
    expect(result.size).toBeGreaterThan(0);
    expect(result.headers).toEqual([{ name: "content-type", value: "application/json" }]);
  });

  it("does not send a body for GET requests even when one is set", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(mockProxyResponse({ status: 204, statusText: "", headers: [], body: "" }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendHttpRequest(makeRequest({ method: "GET", body: '{"x":1}' }));

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(init.body as string) as { body?: string };
    expect(payload.body).toBeUndefined();
  });

  it("forwards the body for POST", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(mockProxyResponse({ status: 201, statusText: "", headers: [], body: "" }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendHttpRequest(
      makeRequest({
        method: "POST",
        body: '{"x":1}',
        headers: [{ name: "Content-Type", value: "application/json" }],
      }),
    );

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(init.body as string) as {
      body: string;
      headers: Array<{ name: string; value: string }>;
    };
    expect(payload.body).toBe('{"x":1}');
    expect(payload.headers).toEqual([{ name: "Content-Type", value: "application/json" }]);
  });

  it("throws when the proxy itself returns an error envelope", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(mockProxyResponse({ error: "blocked host" }, { ok: false, status: 400 }));

    await expect(sendHttpRequest(makeRequest())).rejects.toThrow("blocked host");
  });

  it("forwards an AbortSignal to fetch", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(mockProxyResponse({ status: 200, statusText: "", headers: [], body: "" }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const controller = new AbortController();
    await sendHttpRequest(makeRequest(), { signal: controller.signal });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBe(controller.signal);
  });
});

describe("isAbortError", () => {
  it("returns true for a DOMException named AbortError", () => {
    const err = new DOMException("aborted", "AbortError");

    expect(isAbortError(err)).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(isAbortError(new Error("nope"))).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});
