import JSZip from "jszip";
import { generateHttpFileContent } from "@/lib/generate-http";
import { groupEndpointsByTag } from "@/services/openapi.service";
import type { ParsedSpec, ParsedEndpoint } from "@/types/openapi";

export function generateForEndpoints(spec: ParsedSpec, endpoints: ParsedEndpoint[]): string {
  return generateHttpFileContent(spec, endpoints);
}

const API_VERSION_SEG = /^(api|v\d+)$/i;

/**
 * Groups endpoints by their parent path context and returns one entry per unique context.
 * A single tag can therefore produce multiple files in the ZIP when its endpoints live
 * under different parent paths.
 *
 * The parent context is computed by:
 *   1. Splitting the path and removing empty segments, path-param segments, and api/version prefixes.
 *   2. Dropping the LAST segment (the resource itself), leaving the ancestor segments as the "parent".
 *
 * Examples:
 *   tag="issues", paths=["/api/v1/issues", "/api/v1/issues/{id}"]
 *     → [{ zipPath: "issues/issues.http", endpoints: [...] }]
 *
 *   tag="issues", paths=["/api/v1/issues", "/api/v1/projects/{id}/issues"]
 *     → [
 *         { zipPath: "issues/issues.http",          endpoints: ["/api/v1/issues"] },
 *         { zipPath: "projects/issues/issues.http", endpoints: ["/api/v1/projects/{id}/issues"] },
 *       ]
 *
 *   tag="labels", paths=["/api/v1/workspaces/{id}/labels"]
 *     → [{ zipPath: "workspaces/labels/labels.http", endpoints: [...] }]
 */
export function splitEndpointsByParentPath(
  tag: string,
  endpoints: ParsedEndpoint[],
): Array<{ zipPath: string; endpoints: ParsedEndpoint[] }> {
  const slug = slugify(tag);
  const groups = new Map<string, ParsedEndpoint[]>();

  for (const endpoint of endpoints) {
    const segs = endpoint.path
      .split("/")
      .filter((s) => s && !s.startsWith("{") && !API_VERSION_SEG.test(s));

    // Parent = all meaningful segments except the last resource segment.
    const parent = segs.slice(0, -1).join("/");

    if (!groups.has(parent)) {
      groups.set(parent, []);
    }

    groups.get(parent)!.push(endpoint);
  }

  // Stable order: root (empty parent) first, then alphabetical.
  const sorted = Array.from(groups.entries()).sort(([a], [b]) =>
    a === b ? 0 : a === "" ? -1 : b === "" ? 1 : a.localeCompare(b),
  );

  return sorted.map(([parent, eps]) => {
    const folder = parent ? `${parent}/${slug}` : slug;

    return { zipPath: `${folder}/${slug}.http`, endpoints: eps };
  });
}

export async function buildZip(
  spec: ParsedSpec,
  endpointsByTag: Record<string, ParsedEndpoint[]>,
): Promise<Blob> {
  const zip = new JSZip();
  for (const [tag, endpoints] of Object.entries(endpointsByTag)) {
    for (const { zipPath, endpoints: eps } of splitEndpointsByParentPath(tag, endpoints)) {
      const content = generateHttpFileContent(spec, eps);
      zip.file(zipPath, content);
    }
  }

  return zip.generateAsync({ type: "blob" });
}

export function buildZipFromEndpoints(
  spec: ParsedSpec,
  endpoints: ParsedEndpoint[],
): Promise<Blob> {
  const byTag = groupEndpointsByTag(endpoints);

  return buildZip(spec, byTag);
}

export function slugify(name: string): string {
  return name.replace(/\s+/g, "-").toLowerCase();
}
