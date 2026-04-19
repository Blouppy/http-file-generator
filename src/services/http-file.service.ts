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
 * Strategy: strip API/version prefix segments and path-param segments, then compute the
 * common path prefix across all endpoints for this tag. The resulting segments form the
 * folder hierarchy, and the file is named after the tag slug.
 *
 * Examples:
 *   tag="workspaces", path="/api/workspaces"                        → "workspaces/workspaces.http"
 *   tag="labels",     path="/api/workspaces/{workspaceId}/labels"   → "workspaces/labels/labels.http"
 *   tag="other",      path="/"                                      → "other.http"
 */
const API_VERSION_SEG = /^(api|v\d+)$/i;

export function deriveZipPath(tag: string, endpoints: ParsedEndpoint[]): string {
  // Build the list of meaningful segments per endpoint (drop path params and api/version prefixes)
  const allSegmentPaths = endpoints.map((e) =>
    e.path
      .split("/")
      .filter((s) => s && !s.startsWith("{") && !API_VERSION_SEG.test(s))
  );

  if (allSegmentPaths.length === 0 || allSegmentPaths[0].length === 0) {
    return `${slugify(tag)}.http`;
  }

  // Compute the common prefix segments across all endpoint paths for this tag
  const first = allSegmentPaths[0];
  const commonSegs: string[] = [];
  for (let i = 0; i < first.length; i++) {
    if (allSegmentPaths.every((segs) => i < segs.length && segs[i] === first[i])) {
      commonSegs.push(first[i]);
    } else {
      break;
    }
  }

  if (commonSegs.length === 0) {
    return `${slugify(tag)}.http`;
  }

  return `${commonSegs.join("/")}/${slugify(tag)}.http`;
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
