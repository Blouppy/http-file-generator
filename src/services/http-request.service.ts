/**
 * Executes a parsed `.http` request from the browser using `fetch`.
 *
 * Note: requests are subject to CORS — APIs that do not allow cross-origin
 * requests from the browser will fail with a network error. The thrown
 * `Error.message` is surfaced verbatim in the response panel so the user
 * understands what happened.
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
  /**
   * When true, the request is forwarded through the app's own
   * `/api/proxy` endpoint, which performs the actual call server-side.
   * This bypasses browser CORS restrictions — most public APIs do not
   * advertise the necessary `Access-Control-Allow-*` headers and are
   * therefore unreachable directly from the browser.
   */
  useProxy?: boolean;
}

/** Methods for which a body is never sent (per the fetch / HTTP spec). */
const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

/** Path of the in-app server proxy (relative to the current origin). */
const PROXY_ENDPOINT = "/api/proxy";

export async function sendHttpRequest(
  request: ParsedHttpRequest,
  options: SendHttpRequestOptions = {},
): Promise<HttpResponseResult> {
  if (options.useProxy) {
    return sendHttpRequestViaProxy(request, options.signal);
  }

  const headers = new Headers();

  for (const { name, value } of request.headers) {
    headers.append(name, value);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    signal: options.signal,
  };

  if (request.body !== undefined && !METHODS_WITHOUT_BODY.has(request.method)) {
    init.body = request.body;
  }

  const start = performance.now();
  const response = await fetch(request.url, init);
  const text = await response.text();
  const durationMs = Math.round(performance.now() - start);

  const responseHeaders: Array<{ name: string; value: string }> = [];
  response.headers.forEach((value, name) => {
    responseHeaders.push({ name, value });
  });

  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body: text,
    contentType: response.headers.get("content-type"),
    durationMs,
    size: new Blob([text]).size,
  };
}

/**
 * Forwards the request through the app's `/api/proxy` route. The proxy
 * runs server-side (no CORS) and returns the upstream response in a JSON
 * envelope: `{ status, statusText, headers, body, contentType }`.
 */
async function sendHttpRequestViaProxy(
  request: ParsedHttpRequest,
  signal: AbortSignal | undefined,
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
    signal,
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

/**
 * Returns true when the given error indicates a likely cross-origin (CORS)
 * failure — useful for showing a helpful hint to the user. Browsers report
 * all CORS rejections as a generic "Failed to fetch" `TypeError`, so we
 * pattern-match on the message.
 */
export function isLikelyCorsError(err: unknown): boolean {
  if (!(err instanceof TypeError)) {
    return false;
  }

  const msg = err.message.toLowerCase();

  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("load failed") ||
    msg.includes("cors")
  );
}

/** Returns true when the given error is an AbortError thrown by `fetch`. */
export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}
