import JSZip from "jszip";
import { generateHttpFileContent } from "@/lib/generate-http";
import { groupEndpointsByTag } from "@/services/openapi.service";
import type { ParsedSpec, ParsedEndpoint } from "@/types/openapi";

export function generateForEndpoints(spec: ParsedSpec, endpoints: ParsedEndpoint[]): string {
  return generateHttpFileContent(spec, endpoints);
}

export async function buildZip(spec: ParsedSpec, endpointsByTag: Record<string, ParsedEndpoint[]>): Promise<Blob> {
  const zip = new JSZip();
  for (const [tag, endpoints] of Object.entries(endpointsByTag)) {
    const content = generateHttpFileContent(spec, endpoints);
    zip.file(`${slugify(tag)}.http`, content);
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
