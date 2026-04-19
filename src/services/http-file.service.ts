import JSZip from "jszip";
import { generateHttpFileContent } from "@/lib/generate-http";
import { groupEndpointsByTag } from "@/services/openapi.service";
import type { ParsedSpec, ParsedEndpoint } from "@/types/openapi";

export function generateForEndpoints(spec: ParsedSpec, endpoints: ParsedEndpoint[]): string {
  return generateHttpFileContent(spec, endpoints);
}

/**
 * Derives the ZIP file path for a tag group by examining the URL paths of its endpoints.
 *
 * Strategy: strip API/version prefix segments, then use the first remaining path segment
 * as the parent folder. The file is named after the tag slug.
 *
 * Examples:
 *   tag="workspaces", path="/api/workspaces"            → "workspaces/workspaces.http"
 *   tag="labels",     path="/api/workspaces/{id}/labels" → "workspaces/labels.http"
 *   tag="other",      path="/"                           → "other.http"
 */
const API_VERSION_SEG = /^(api|v\d+)$/i;

export function deriveZipPath(tag: string, endpoints: ParsedEndpoint[]): string {
  // Collect the first meaningful path segment (after removing path params and api/version prefixes)
  const firstSegments = endpoints
    .map((e) =>
      e.path
        .replace(/\{[^}]+\}/g, "") // remove path params
        .replace(/\/+/g, "/") // collapse multiple slashes
        .replace(/^\//, "") // strip leading slash
        .replace(/\/$/, "") // strip trailing slash
    )
    .map((normalized) =>
      normalized.split("/").filter((s) => s && !API_VERSION_SEG.test(s))
    )
    .map((segs) => segs[0])
    .filter((s): s is string => !!s);

  if (firstSegments.length === 0) {
    return `${slugify(tag)}.http`;
  }

  // Use the most frequently occurring first segment as the root folder
  const counts = firstSegments.reduce<Record<string, number>>((acc, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return `${slugify(tag)}.http`;
  }
  const rootFolder = entries.sort((a, b) => b[1] - a[1])[0][0];

  return `${rootFolder}/${slugify(tag)}.http`;
}

export async function buildZip(spec: ParsedSpec, endpointsByTag: Record<string, ParsedEndpoint[]>): Promise<Blob> {
  const zip = new JSZip();
  for (const [tag, endpoints] of Object.entries(endpointsByTag)) {
    const content = generateHttpFileContent(spec, endpoints);
    zip.file(deriveZipPath(tag, endpoints), content);
  }
  return zip.generateAsync({ type: "blob" });
}

export function buildZipFromEndpoints(spec: ParsedSpec, endpoints: ParsedEndpoint[]): Promise<Blob> {
  const byTag = groupEndpointsByTag(endpoints);
  return buildZip(spec, byTag);
}

export function slugify(name: string): string {
  return name.replace(/\s+/g, "-").toLowerCase();
}
