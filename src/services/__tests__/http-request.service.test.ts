import { isAbortError, isLikelyCorsError, sendHttpRequest } from "@/services/http-request.service";
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

/**
 * Builds a minimal duck-typed Response object sufficient for sendHttpRequest.
 * Avoids relying on the global `Response` constructor, which is not always
 * available in the jsdom test environment.
 */
function mockResponse(
  body: string,
  init: { status?: number; statusText?: string; headers?: Record<string, string> } = {},
) {
  const status = init.status ?? 200;
  const statusText = init.statusText ?? "OK";
  const headerEntries = Object.entries(init.headers ?? {});
  const headers = new Headers(headerEntries);

  return {
    status,
    statusText,
    headers,
    text: async () => body,
  };
}

describe("sendHttpRequest", () => {
  it("performs a GET and returns the parsed response", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      mockResponse('{"ok":true}', {
        status: 200,
        statusText: "OK",
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendHttpRequest(makeRequest());

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/x",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result.status).toBe(200);
    expect(result.statusText).toBe("OK");
    expect(result.body).toBe('{"ok":true}');
    expect(result.contentType).toBe("application/json");
    expect(result.size).toBeGreaterThan(0);
    expect(result.headers).toEqual(
      expect.arrayContaining([{ name: "content-type", value: "application/json" }]),
    );
  });

  it("does not send a body for GET requests even when one is set", async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockResponse("", { status: 204 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendHttpRequest(makeRequest({ method: "GET", body: '{"x":1}' }));

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
  });

  it("forwards the body and headers for POST", async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockResponse("", { status: 201 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendHttpRequest(
      makeRequest({
        method: "POST",
        body: '{"x":1}',
        headers: [{ name: "Content-Type", value: "application/json" }],
      }),
    );

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe('{"x":1}');
    expect((init.headers as Headers).get("content-type")).toBe("application/json");
  });

  it("propagates network errors", async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(sendHttpRequest(makeRequest())).rejects.toThrow("Failed to fetch");
  });

  it("forwards an AbortSignal to fetch", async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockResponse(""));
    global.fetch = fetchMock as unknown as typeof fetch;

    const controller = new AbortController();
    await sendHttpRequest(makeRequest(), { signal: controller.signal });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBe(controller.signal);
  });
});

describe("isLikelyCorsError", () => {
  it("matches a TypeError with the canonical 'Failed to fetch' message", () => {
    expect(isLikelyCorsError(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("matches Firefox's NetworkError variant", () => {
    expect(isLikelyCorsError(new TypeError("NetworkError when attempting to fetch"))).toBe(true);
  });

  it("returns false for non-TypeError errors", () => {
    expect(isLikelyCorsError(new Error("Failed to fetch"))).toBe(false);
    expect(isLikelyCorsError(null)).toBe(false);
    expect(isLikelyCorsError("oops")).toBe(false);
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
