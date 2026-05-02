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
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

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
 * Returns true when the given hostname literal is an obviously private /
 * loopback / link-local address. Best-effort string-based check — used as
 * a fast pre-filter before DNS resolution.
 */
function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();

  if (host === "localhost" || host.endsWith(".localhost") || host === "0.0.0.0") {
    return true;
  }

  // IPv6 literals may arrive bracketed (`[::1]`) or unbracketed.
  const stripped = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;

  if (isIP(stripped) > 0) {
    return isPrivateIp(stripped);
  }

  return false;
}

/**
 * Returns true when the given literal IP address (v4 or v6) belongs to a
 * range that should not be reachable from the proxy: loopback, link-local,
 * private, unspecified, multicast, or reserved.
 */
function isPrivateIp(ip: string): boolean {
  const family = isIP(ip);

  if (family === 4) {
    const octets = ip.split(".").map((n) => Number(n));

    if (octets.length !== 4 || octets.some((n) => Number.isNaN(n))) {
      return true;
    }

    const [a, b] = octets;

    // 0.0.0.0/8 (unspecified), 10.0.0.0/8, 127.0.0.0/8 (loopback).
    if (a === 0 || a === 10 || a === 127) {
      return true;
    }

    // 169.254.0.0/16 (link-local — includes cloud metadata 169.254.169.254).
    if (a === 169 && b === 254) {
      return true;
    }

    // 172.16.0.0/12.
    if (a === 172 && b >= 16 && b <= 31) {
      return true;
    }

    // 192.168.0.0/16.
    if (a === 192 && b === 168) {
      return true;
    }

    // 224.0.0.0/4 (multicast), 240.0.0.0/4 (reserved).
    if (a >= 224) {
      return true;
    }

    return false;
  }

  if (family === 6) {
    const lower = ip.toLowerCase();

    if (lower === "::" || lower === "::1") {
      return true;
    }

    // IPv4-mapped IPv6 address (::ffff:a.b.c.d) — recurse on the v4 part.
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);

    if (mapped) {
      return isPrivateIp(mapped[1]);
    }

    // Link-local (fe80::/10), unique-local (fc00::/7), site-local
    // (fec0::/10, deprecated), multicast (ff00::/8).
    if (
      lower.startsWith("fe8") ||
      lower.startsWith("fe9") ||
      lower.startsWith("fea") ||
      lower.startsWith("feb") ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fec") ||
      lower.startsWith("fed") ||
      lower.startsWith("fee") ||
      lower.startsWith("fef") ||
      lower.startsWith("ff")
    ) {
      return true;
    }

    return false;
  }

  // Unknown / malformed — refuse.
  return true;
}

/**
 * Resolves the hostname and returns true when ANY of the resolved
 * addresses is a private / loopback / link-local IP. This defeats trivial
 * DNS-rebinding attacks where a public-looking hostname resolves to an
 * internal address (e.g. cloud metadata at 169.254.169.254).
 */
async function resolvesToPrivateIp(hostname: string): Promise<boolean> {
  const stripped =
    hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;

  if (isIP(stripped) > 0) {
    return isPrivateIp(stripped);
  }

  try {
    const addresses = await lookup(hostname, { all: true });

    return addresses.some((addr) => isPrivateIp(addr.address));
  } catch {
    // DNS lookup failed — refuse to be safe (the upstream call would
    // also fail; this just gives a clearer error).
    return true;
  }
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

  // Fast literal check first, then a DNS-resolved check to defeat trivial
  // DNS-rebinding attacks (a public-looking name pointing at 127.0.0.1 etc).
  if (isPrivateHost(target.hostname) || (await resolvesToPrivateIp(target.hostname))) {
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
