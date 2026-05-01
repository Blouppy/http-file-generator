import { parseOpenAPISpec } from "@/lib/parse-openapi";
import type { ParsedSpec, ParsedEndpoint } from "@/types/openapi";

export const URL_VALIDATION_ERROR = "INVALID_URL";
export const URL_FETCH_ERROR = "URL_FETCH_ERROR";

export async function parseSpec(content: string, filename: string): Promise<ParsedSpec> {
  return parseOpenAPISpec(content, filename);
}

export async function parseSpecFromUrl(url: string): Promise<ParsedSpec> {
  const trimmedUrl = url.trim();
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    throw new Error(URL_VALIDATION_ERROR);
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(URL_VALIDATION_ERROR);
  }

  let response: Response;

  try {
    response = await fetch(trimmedUrl);
  } catch {
    throw new Error(URL_FETCH_ERROR);
  }

  if (!response.ok) {
    throw new Error(URL_FETCH_ERROR);
  }

  const lastSegment = parsedUrl.pathname.split("/").filter(Boolean).pop() ?? "";
  const contentType = response.headers.get("content-type") ?? "";
  const isYamlByUrl = /\.(ya?ml)$/i.test(lastSegment);
  const isYamlByContentType =
    contentType.startsWith("application/yaml") ||
    contentType.startsWith("application/x-yaml") ||
    contentType.startsWith("text/yaml") ||
    contentType.startsWith("text/x-yaml");
  const filename = isYamlByUrl || isYamlByContentType ? "spec.yaml" : "spec.json";

  const content = await response.text();

  return parseSpec(content, filename);
}

export function groupEndpointsByTag(endpoints: ParsedEndpoint[]): Record<string, ParsedEndpoint[]> {
  const groups: Record<string, ParsedEndpoint[]> = {};

  for (const endpoint of endpoints) {
    const tag = endpoint.tags?.[0] || "Other";

    if (!groups[tag]) {
      groups[tag] = [];
    }

    groups[tag].push(endpoint);
  }

  return groups;
}

export function getEndpointId(endpoint: ParsedEndpoint): string {
  return `${endpoint.method}:${endpoint.path}`;
}

export interface EndpointFilterOptions {
  searchText: string;
  methods: Set<string>;
  tags: Set<string>;
}

export function filterEndpoints(
  endpoints: ParsedEndpoint[],
  filters: EndpointFilterOptions,
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

      if (!searchable.includes(lowerSearch)) {
        return false;
      }
    }

    if (methods.size > 0 && !methods.has(endpoint.method)) {
      return false;
    }

    if (tags.size > 0) {
      const endpointTag = endpoint.tags?.[0] || "Other";

      if (!tags.has(endpointTag)) {
        return false;
      }
    }

    return true;
  });
}
