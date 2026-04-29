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

/**
 * Recursively collects every schema name referenced via `$ref: #/components/schemas/<name>`
 * in a raw (non-dereferenced) value. Returns the shared refs Set.
 */
function collectSchemaRefs(obj: unknown, refs: Set<string> = new Set()): Set<string> {
  if (!obj || typeof obj !== "object") {
    return refs;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      collectSchemaRefs(item, refs);
    }

    return refs;
  }

  const record = obj as Record<string, unknown>;

  if (typeof record["$ref"] === "string") {
    const ref = record["$ref"] as string;
    const prefix = "#/components/schemas/";

    if (ref.startsWith(prefix)) {
      refs.add(ref.slice(prefix.length));
    }

    return refs;
  }

  for (const value of Object.values(record)) {
    collectSchemaRefs(value, refs);
  }

  return refs;
}

/**
 * Expands a set of directly referenced schema names to include all transitively
 * referenced schemas by walking the raw (pre-deref) component schemas.
 */
function expandTransitiveRefs(
  directRefs: string[],
  rawSchemas: Record<string, unknown>,
): string[] {
  const all = new Set(directRefs);
  const queue = [...directRefs];

  while (queue.length > 0) {
    const name = queue.shift()!;
    const rawSchema = rawSchemas[name];

    if (!rawSchema) {
      continue;
    }

    for (const nested of collectSchemaRefs(rawSchema)) {
      if (!all.has(nested)) {
        all.add(nested);
        queue.push(nested);
      }
    }
  }

  return [...all];
}

/** Builds a single {@link ParsedEndpoint} from a path, HTTP method and operation object. */
function buildEndpoint(
  path: string,
  method: string,
  operation: Record<string, unknown>,
  schemaRefs?: string[],
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
    schemaRefs: schemaRefs && schemaRefs.length > 0 ? schemaRefs : undefined,
  };
}

/** Iterates over all paths and HTTP methods, collecting every defined endpoint. */
function extractEndpoints(
  paths: Record<string, Record<string, unknown>>,
  rawRefsByKey: Map<string, string[]>,
): ParsedEndpoint[] {
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
        const schemaRefs = rawRefsByKey.get(`${method}:${path}`);
        endpoints.push(buildEndpoint(path, method, operation, schemaRefs));
      }
    }
  }

  return endpoints;
}

export async function parseOpenAPISpec(content: string, filename: string): Promise<ParsedSpec> {
  const rawSpec = parseRawContent(content, filename);

  // Collect $ref schema names BEFORE dereferencing — refs are erased by SwaggerParser.dereference.
  const rawPaths = (rawSpec as RawSpec).paths ?? {};
  const rawSchemas = ((rawSpec as RawSpec).components?.schemas ?? {}) as Record<string, unknown>;
  const rawRefsByKey = new Map<string, string[]>();

  for (const [path, pathItem] of Object.entries(rawPaths)) {
    if (!pathItem || typeof pathItem !== "object") {
      continue;
    }

    for (const method of HTTP_METHODS) {
      const rawOp = (pathItem as Record<string, unknown>)[method];

      if (rawOp) {
        const directRefs = [...collectSchemaRefs(rawOp)];

        if (directRefs.length > 0) {
          rawRefsByKey.set(`${method}:${path}`, expandTransitiveRefs(directRefs, rawSchemas));
        }
      }
    }
  }

  const api = await SwaggerParser.dereference(rawSpec as OpenAPI.Document);
  const spec = api as RawSpec;

  const { title, version, baseUrl } = extractSpecMetadata(spec);
  const endpoints = extractEndpoints(spec.paths ?? {}, rawRefsByKey);
  const schemas = (spec.components?.schemas ?? {}) as Record<string, SchemaObject>;

  return { title, version, baseUrl, endpoints, schemas };
}
