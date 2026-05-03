/**
 * Executes a parsed `.http` request from the browser.
 *
 * Requests are always routed through the app's own `/api/proxy` endpoint,
 * which performs the actual call server-side. This bypasses browser CORS
 * restrictions — most public APIs do not advertise the necessary
 * `Access-Control-Allow-*` headers and would otherwise be unreachable
 * directly from the browser.
 */

import type { ParsedHttpRequest } from "@/lib/parse-http-content";

export interface HttpResponseResult {
  status: number;
  statusText: string;
  headers: Array<{ name: string; value: string }>;
  body: string;
  contentType: string | null;
  durationMs: number;
  /** Total bytes of the response body, when measurable. */
  size: number;
}

export interface SendHttpRequestOptions {
  /**
   * Allows the caller to cancel an in-flight request. When aborted, the
   * resulting promise rejects with a `DOMException` whose `name` is
   * `"AbortError"` (the standard `fetch` behaviour).
   */
  signal?: AbortSignal;
}

/** Methods for which a body is never sent (per the fetch / HTTP spec). */
const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

/** Path of the in-app server proxy (relative to the current origin). */
const PROXY_ENDPOINT = "/api/proxy";

export async function sendHttpRequest(
  request: ParsedHttpRequest,
  options: SendHttpRequestOptions = {},
): Promise<HttpResponseResult> {
  const payload = {
    url: request.url,
    method: request.method,
    headers: request.headers,
    body:
      request.body !== undefined && !METHODS_WITHOUT_BODY.has(request.method)
        ? request.body
        : undefined,
  };

  const start = performance.now();
  const proxyResponse = await fetch(PROXY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: options.signal,
  });
  const data = (await proxyResponse.json()) as {
    status?: number;
    statusText?: string;
    headers?: Array<{ name: string; value: string }>;
    body?: string;
    contentType?: string | null;
    error?: string;
  };
  const durationMs = Math.round(performance.now() - start);

  // The proxy itself failed (bad URL, blocked host, upstream timeout, …).
  if (!proxyResponse.ok || typeof data.status !== "number") {
    throw new Error(data.error ?? `Proxy request failed (${proxyResponse.status})`);
  }

  const body = data.body ?? "";

  return {
    status: data.status,
    statusText: data.statusText ?? "",
    headers: data.headers ?? [],
    body,
    contentType: data.contentType ?? null,
    durationMs,
    size: new Blob([body]).size,
  };
}

/** Returns true when the given error is an AbortError thrown by `fetch`. */
export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}
