/**
 * Server-side request proxy used by the in-app HTTP request runner to
 * bypass browser CORS restrictions.
 *
 * The browser cannot, for security reasons, call most third-party APIs
 * directly because the response lacks `Access-Control-Allow-*` headers.
 * Forwarding the request through this Next.js route makes the actual call
 * server-side (no CORS at all) and returns the result to the browser.
 *
 * Security notes:
 *   - Only `http://` and `https://` URLs are accepted.
 *   - Requests targeting loopback / private / link-local hosts are rejected
 *     to mitigate SSRF (a malicious user could otherwise have the server
 *     hit `http://169.254.169.254/` cloud metadata or internal services).
 *   - A few hop-by-hop / connection-control request headers are stripped,
 *     because forwarding them verbatim would either be invalid (e.g.
 *     `Host`) or rejected by `fetch` (e.g. `Connection`).
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
// Avoid any caching of proxied responses.
export const dynamic = "force-dynamic";

interface ProxyRequestPayload {
  url: string;
  method: string;
  headers?: Array<{ name: string; value: string }>;
  body?: string;
}

/** Maximum proxied response time (ms). */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Header names that must not be forwarded to the upstream — they are
 * either hop-by-hop, computed by `fetch`, or otherwise unsafe to relay.
 */
const FORBIDDEN_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "keep-alive",
  "upgrade",
  "proxy-authorization",
  "proxy-authenticate",
  "te",
  "trailer",
  "expect",
]);

/**
 * Header names that should be stripped from the upstream response before
 * relaying to the browser — `fetch` will reject the response otherwise.
 */
const FORBIDDEN_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
]);

/**
 * Returns true when the given hostname resolves to (or is literally) a
 * loopback / link-local / private / reserved address. Best-effort check on
 * the literal hostname only; no DNS resolution is performed.
 */
function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();

  if (host === "localhost" || host.endsWith(".localhost") || host === "0.0.0.0") {
    return true;
  }

  // IPv6 loopback / unspecified.
  if (host === "::1" || host === "::" || host === "[::1]" || host === "[::]") {
    return true;
  }

  // IPv6 link-local (fe80::/10) and unique-local (fc00::/7).
  if (
    host.startsWith("[fe8") ||
    host.startsWith("[fe9") ||
    host.startsWith("[fea") ||
    host.startsWith("[feb")
  ) {
    return true;
  }

  if (host.startsWith("[fc") || host.startsWith("[fd")) {
    return true;
  }

  // IPv4 dotted-quad checks.
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);

  if (ipv4) {
    const [, a, b] = ipv4.map((n) => Number(n));

    if (a === 10 || a === 127 || a === 0) {
      return true;
    }

    if (a === 169 && b === 254) {
      return true;
    }

    if (a === 172 && b >= 16 && b <= 31) {
      return true;
    }

    if (a === 192 && b === 168) {
      return true;
    }
  }

  return false;
}

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request): Promise<NextResponse> {
  let payload: ProxyRequestPayload;

  try {
    payload = (await request.json()) as ProxyRequestPayload;
  } catch {
    return badRequest("Invalid JSON payload.");
  }

  if (!payload || typeof payload.url !== "string" || typeof payload.method !== "string") {
    return badRequest("Missing required fields: url, method.");
  }

  let target: URL;

  try {
    target = new URL(payload.url);
  } catch {
    return badRequest("Invalid target URL.");
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return badRequest("Only http and https protocols are supported.");
  }

  if (isPrivateHost(target.hostname)) {
    return badRequest("Refusing to proxy to a private / loopback host.");
  }

  const headers = new Headers();

  for (const { name, value } of payload.headers ?? []) {
    if (typeof name !== "string" || typeof value !== "string") {
      continue;
    }

    if (FORBIDDEN_REQUEST_HEADERS.has(name.toLowerCase())) {
      continue;
    }

    headers.append(name, value);
  }

  const init: RequestInit = {
    method: payload.method.toUpperCase(),
    headers,
    // Do not forward credentials — the upstream is server-side, the
    // browser's cookies / TLS client certs are irrelevant here.
    redirect: "follow",
  };

  // Body is only meaningful for methods that allow one.
  const methodsWithoutBody = new Set(["GET", "HEAD"]);

  if (typeof payload.body === "string" && !methodsWithoutBody.has(init.method as string)) {
    init.body = payload.body;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  init.signal = controller.signal;

  let upstream: Response;

  try {
    upstream = await fetch(target.toString(), init);
  } catch (err) {
    clearTimeout(timeout);

    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = err instanceof DOMException && err.name === "AbortError";

    return NextResponse.json(
      { error: isTimeout ? `Upstream request timed out after ${REQUEST_TIMEOUT_MS}ms.` : message },
      { status: 502 },
    );
  }

  clearTimeout(timeout);

  const responseHeaders: Array<{ name: string; value: string }> = [];

  upstream.headers.forEach((value, name) => {
    if (FORBIDDEN_RESPONSE_HEADERS.has(name.toLowerCase())) {
      return;
    }

    responseHeaders.push({ name, value });
  });

  const text = await upstream.text();

  return NextResponse.json({
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
    body: text,
    contentType: upstream.headers.get("content-type"),
  });
}
