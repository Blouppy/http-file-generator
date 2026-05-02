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

/** Methods for which a body is never sent (per the fetch / HTTP spec). */
const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

export async function sendHttpRequest(request: ParsedHttpRequest): Promise<HttpResponseResult> {
  const headers = new Headers();

  for (const { name, value } of request.headers) {
    headers.append(name, value);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
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
