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

export interface EndpointFilters {
  searchText: string;
  methods: Set<string>;
  tags: Set<string>;
}

export function filterEndpoints(
  endpoints: ParsedEndpoint[],
  filters: EndpointFilters
): ParsedEndpoint[] {
  const { searchText, methods, tags } = filters;
  const lowerSearch = searchText.toLowerCase().trim();

  return endpoints.filter((endpoint) => {
    if (lowerSearch) {
      const searchable = [
        endpoint.path,
        endpoint.summary,
        endpoint.operationId,
        endpoint.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(lowerSearch)) return false;
    }

    if (methods.size > 0 && !methods.has(endpoint.method)) {
      return false;
    }

    if (tags.size > 0) {
      const endpointTag = endpoint.tags?.[0] || "Other";
      if (!tags.has(endpointTag)) return false;
    }

    return true;
  });
}
