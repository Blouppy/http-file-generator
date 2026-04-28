import SwaggerParser from "@apidevtools/swagger-parser";
import YAML from "yaml";
import type {
  ParsedSpec,
  ParsedEndpoint,
  Parameter,
  RequestBody,
  SchemaObject,
} from "@/types/openapi";
import type { OpenAPI } from "openapi-types";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options", "trace"] as const;

type RawSpec = Record<string, unknown> & {
  info?: { title?: string; version?: string };
  servers?: Array<{ url: string }>;
  paths?: Record<string, Record<string, unknown>>;
  components?: {
    schemas?: Record<string, unknown>;
  };
};

/** Parses raw file content as JSON or YAML based on the file extension. */
function parseRawContent(content: string, filename: string): unknown {
  if (filename.endsWith(".yaml") || filename.endsWith(".yml")) {
    return YAML.parse(content);
  }
  return JSON.parse(content);
}

/** Extracts title, version and baseUrl metadata from a dereferenced spec. */
function extractSpecMetadata(spec: RawSpec): Pick<ParsedSpec, "title" | "version" | "baseUrl"> {
  return {
    title: spec.info?.title || "API",
    version: spec.info?.version || "1.0.0",
    baseUrl: spec.servers?.[0]?.url || "{{baseUrl}}",
  };
}

/** Builds a single {@link ParsedEndpoint} from a path, HTTP method and operation object. */
function buildEndpoint(
  path: string,
  method: string,
  operation: Record<string, unknown>,
): ParsedEndpoint {
  return {
    path,
    method: method.toUpperCase(),
    operationId: operation.operationId as string | undefined,
    summary: operation.summary as string | undefined,
    description: operation.description as string | undefined,
    tags: operation.tags as string[] | undefined,
    parameters: operation.parameters as Parameter[] | undefined,
    requestBody: operation.requestBody as RequestBody | undefined,
  };
}

/** Iterates over all paths and HTTP methods, collecting every defined endpoint. */
function extractEndpoints(paths: Record<string, Record<string, unknown>>): ParsedEndpoint[] {
  const endpoints: ParsedEndpoint[] = [];

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") {
      continue;
    }

    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Record<string, unknown>)[method] as
        | Record<string, unknown>
        | undefined;

      if (operation) {
        endpoints.push(buildEndpoint(path, method, operation));
      }
    }
  }

  return endpoints;
}

export async function parseOpenAPISpec(content: string, filename: string): Promise<ParsedSpec> {
  const rawSpec = parseRawContent(content, filename);
  const api = await SwaggerParser.dereference(rawSpec as OpenAPI.Document);
  const spec = api as RawSpec;

  const { title, version, baseUrl } = extractSpecMetadata(spec);
  const endpoints = extractEndpoints(spec.paths ?? {});
  const schemas = (spec.components?.schemas ?? {}) as Record<string, SchemaObject>;

  return { title, version, baseUrl, endpoints, schemas };
}
