import { parseOpenAPISpec } from "@/lib/parse-openapi";
import type { ParsedSpec, ParsedEndpoint } from "@/types/openapi";

export async function parseSpec(content: string, filename: string): Promise<ParsedSpec> {
  return parseOpenAPISpec(content, filename);
}

export function groupEndpointsByTag(endpoints: ParsedEndpoint[]): Record<string, ParsedEndpoint[]> {
  const groups: Record<string, ParsedEndpoint[]> = {};
  for (const endpoint of endpoints) {
    const tag = endpoint.tags?.[0] || "Other";
    if (!groups[tag]) groups[tag] = [];
    groups[tag].push(endpoint);
  }
  return groups;
}

export function getEndpointId(endpoint: ParsedEndpoint): string {
  return `${endpoint.method}:${endpoint.path}`;
}
