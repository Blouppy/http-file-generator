import SwaggerParser from "@apidevtools/swagger-parser";
import YAML from "yaml";
import type {
  ParsedSpec,
  ParsedEndpoint,
  ParsedResponseInfo,
  Parameter,
  RequestBody,
  SchemaObject,
  SchemaProperty,
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
function expandTransitiveRefs(directRefs: string[], rawSchemas: Record<string, unknown>): string[] {
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

/**
 * Returns the `$ref` schema name from the first JSON-typed content entry of a raw request body,
 * or `undefined` if the body has no JSON content with a named `$ref`.
 */
function extractRequestBodySchemaRef(rawOperation: unknown): string | undefined {
  if (!rawOperation || typeof rawOperation !== "object") {
    return undefined;
  }

  const operation = rawOperation as Record<string, unknown>;
  const body = operation["requestBody"] as Record<string, unknown> | undefined;

  if (!body) {
    return undefined;
  }

  const content = body["content"] as Record<string, unknown> | undefined;

  if (!content) {
    return undefined;
  }

  const prefix = "#/components/schemas/";

  for (const [ct, media] of Object.entries(content)) {
    if (
      !ct.startsWith("application/json") &&
      !(ct.startsWith("application/") && ct.includes("+json"))
    ) {
      continue;
    }

    if (!media || typeof media !== "object") {
      continue;
    }

    const schema = (media as Record<string, unknown>)["schema"] as
      | Record<string, unknown>
      | undefined;

    if (typeof schema?.["$ref"] === "string" && schema["$ref"].startsWith(prefix)) {
      return schema["$ref"].slice(prefix.length);
    }
  }

  return undefined;
}

/**
 * Returns the first 2xx response info from a raw operation's `responses`, including the
 * schema name when the response body is a direct `$ref` or an `array` of a `$ref`.
 */
function extractPrimaryResponse(rawOperation: unknown): ParsedResponseInfo | undefined {
  if (!rawOperation || typeof rawOperation !== "object") {
    return undefined;
  }

  const operation = rawOperation as Record<string, unknown>;
  const responses = operation["responses"] as Record<string, unknown> | undefined;

  if (!responses) {
    return undefined;
  }

  const statusCode = Object.keys(responses).find((code) => /^2/.test(code));

  if (!statusCode) {
    return undefined;
  }

  const response = responses[statusCode] as Record<string, unknown> | undefined;

  if (!response) {
    return undefined;
  }

  const description = response["description"] as string | undefined;
  const content = response["content"] as Record<string, unknown> | undefined;

  if (!content) {
    return { statusCode, description };
  }

  const prefix = "#/components/schemas/";

  for (const [ct, media] of Object.entries(content)) {
    if (
      !ct.startsWith("application/json") &&
      !(ct.startsWith("application/") && ct.includes("+json"))
    ) {
      continue;
    }

    if (!media || typeof media !== "object") {
      continue;
    }

    const schema = (media as Record<string, unknown>)["schema"] as
      | Record<string, unknown>
      | undefined;

    if (!schema) {
      continue;
    }

    // Direct $ref — object response.
    if (typeof schema["$ref"] === "string" && schema["$ref"].startsWith(prefix)) {
      return { statusCode, description, schemaRef: schema["$ref"].slice(prefix.length) };
    }

    // Array response whose items are a $ref.
    if (schema["type"] === "array" && schema["items"] && typeof schema["items"] === "object") {
      const items = schema["items"] as Record<string, unknown>;

      if (typeof items["$ref"] === "string" && items["$ref"].startsWith(prefix)) {
        return { statusCode, description, itemSchemaRef: items["$ref"].slice(prefix.length) };
      }
    }
  }

  return { statusCode, description };
}

/** Builds a single {@link ParsedEndpoint} from a path, HTTP method and operation object. */
function buildEndpoint(
  path: string,
  method: string,
  operation: Record<string, unknown>,
  schemaRefs?: string[],
  requestBodySchemaRef?: string,
  primaryResponse?: ParsedResponseInfo,
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
    requestBodySchemaRef,
    primaryResponse,
  };
}

/** Iterates over all paths and HTTP methods, collecting every defined endpoint. */
function extractEndpoints(
  paths: Record<string, Record<string, unknown>>,
  rawRefsByKey: Map<string, string[]>,
  rawBodyRefByKey: Map<string, string>,
  rawResponseByKey: Map<string, ParsedResponseInfo>,
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
        const key = `${method}:${path}`;
        const schemaRefs = rawRefsByKey.get(key);
        const requestBodySchemaRef = rawBodyRefByKey.get(key);
        const primaryResponse = rawResponseByKey.get(key);
        endpoints.push(
          buildEndpoint(path, method, operation, schemaRefs, requestBodySchemaRef, primaryResponse),
        );
      }
    }
  }

  return endpoints;
}

/**
 * Collects every `$ref` schema name reachable from a single (raw) schema-shaped value, looking
 * at the top-level `$ref` and at `oneOf`/`anyOf` entries. Returns an ordered, de-duplicated array
 * of schema names (without the `#/components/schemas/` prefix). Used to support polymorphism:
 * a property declared as `oneOf: [{ $ref: A }, { $ref: B }]` yields `["A", "B"]`.
 */
function collectDirectRefs(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const prefix = "#/components/schemas/";
  const refs: string[] = [];
  const seen = new Set<string>();
  const record = value as Record<string, unknown>;

  const tryAdd = (raw: unknown): void => {
    if (typeof raw !== "string" || !raw.startsWith(prefix)) {
      return;
    }

    const name = raw.slice(prefix.length);

    if (!seen.has(name)) {
      seen.add(name);
      refs.push(name);
    }
  };

  tryAdd(record["$ref"]);

  const composedOf = (record["oneOf"] ?? record["anyOf"]) as unknown[] | undefined;

  if (Array.isArray(composedOf)) {
    for (const entry of composedOf) {
      if (entry && typeof entry === "object") {
        tryAdd((entry as Record<string, unknown>)["$ref"]);
      }
    }
  }

  return refs;
}

/**
 * Builds a map from `"SchemaName.propName"` → ref schema name(s) for properties that resolve to a
 * component schema (direct `$ref` or `oneOf`/`anyOf`), and `"SchemaName.propName.items"` → ref
 * schema name(s) for array properties whose items are a `$ref` or composed of refs.
 *
 * When a property is polymorphic (multiple non-null `$ref`s in `oneOf`/`anyOf`), names are joined
 * with `" | "` — purely a display label. Must be called on the raw (pre-deref) schemas because
 * `SwaggerParser.dereference` erases `$ref`s.
 */
function buildPropRefMap(rawSchemas: Record<string, unknown>): Map<string, string> {
  const map = new Map<string, string>();

  for (const [schemaName, rawSchema] of Object.entries(rawSchemas)) {
    if (!rawSchema || typeof rawSchema !== "object") {
      continue;
    }

    const props = (rawSchema as Record<string, unknown>).properties;

    if (!props || typeof props !== "object") {
      continue;
    }

    for (const [propName, rawProp] of Object.entries(props as Record<string, unknown>)) {
      if (!rawProp || typeof rawProp !== "object") {
        continue;
      }

      const prop = rawProp as Record<string, unknown>;

      // Direct refs on the property itself ($ref or oneOf/anyOf with refs).
      const directRefs = collectDirectRefs(prop);

      if (directRefs.length > 0) {
        map.set(`${schemaName}.${propName}`, directRefs.join(" | "));
      }

      // Refs reachable from array items.
      if (prop["type"] === "array" && prop["items"] && typeof prop["items"] === "object") {
        const itemRefs = collectDirectRefs(prop["items"]);

        if (itemRefs.length > 0) {
          map.set(`${schemaName}.${propName}.items`, itemRefs.join(" | "));
        }
      }
    }
  }

  return map;
}

/**
 * Annotates dereferenced `SchemaProperty` objects in `schemas` with `schemaName`
 * using the `propRefMap` built from the raw spec. Because `SwaggerParser.dereference`
 * shares object references, annotations written here propagate to all request-body
 * schemas that transitively reference the same component schema.
 */
function annotateSchemaNamesAfterDeref(
  schemas: Record<string, SchemaObject>,
  propRefMap: Map<string, string>,
): void {
  for (const [schemaName, schema] of Object.entries(schemas)) {
    if (!schema.properties) {
      continue;
    }

    for (const [propName, prop] of Object.entries(schema.properties)) {
      const directRef = propRefMap.get(`${schemaName}.${propName}`);

      if (directRef) {
        prop.schemaName = directRef;

        // If the property used a oneOf/anyOf nullable pattern and has no top-level type or
        // properties (the post-deref shape), promote the referenced schema's fields so that
        // rendering can display the type label and expand properties/enum correctly.
        const composed = ((prop as Record<string, unknown>)["oneOf"] ??
          (prop as Record<string, unknown>)["anyOf"]) as SchemaProperty[] | undefined;

        if (Array.isArray(composed) && !prop.type && !prop.properties) {
          const referencedSchema = schemas[directRef];

          if (referencedSchema) {
            if (referencedSchema.type !== undefined) {
              prop.type = referencedSchema.type;
            }
            if (referencedSchema.properties !== undefined) {
              prop.properties = referencedSchema.properties;
            }
            if (referencedSchema.required !== undefined) {
              prop.required = referencedSchema.required;
            }
            if (referencedSchema.enum !== undefined) {
              prop.enum = referencedSchema.enum;
            }
          }
        }

        continue;
      }

      const itemsRef = propRefMap.get(`${schemaName}.${propName}.items`);

      if (itemsRef && prop.items) {
        prop.items.schemaName = itemsRef;

        // If items lacks `properties` (e.g. partially-dereferenced specs where the items `$ref`
        // wasn't resolved, or test mocks), promote the referenced schema's fields. Polymorphic
        // joined names (e.g. "A | B") naturally skip this lookup since `schemas["A | B"]` is
        // undefined.
        if (!prop.items.properties && !prop.items.type) {
          const referencedSchema = schemas[itemsRef];

          if (referencedSchema) {
            if (referencedSchema.type !== undefined) {
              prop.items.type = referencedSchema.type;
            }
            if (referencedSchema.properties !== undefined) {
              prop.items.properties = referencedSchema.properties;
            }
            if (referencedSchema.required !== undefined) {
              prop.items.required = referencedSchema.required;
            }
            if (referencedSchema.enum !== undefined) {
              prop.items.enum = referencedSchema.enum;
            }
          }
        }
      }
    }
  }
}

export async function parseOpenAPISpec(content: string, filename: string): Promise<ParsedSpec> {
  const rawSpec = parseRawContent(content, filename);

  // Collect $ref schema names BEFORE dereferencing — refs are erased by SwaggerParser.dereference.
  const rawPaths = (rawSpec as RawSpec).paths ?? {};
  const rawSchemas = ((rawSpec as RawSpec).components?.schemas ?? {}) as Record<string, unknown>;
  const rawRefsByKey = new Map<string, string[]>();
  const rawBodyRefByKey = new Map<string, string>();
  const rawResponseByKey = new Map<string, ParsedResponseInfo>();

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

        const bodyRef = extractRequestBodySchemaRef(rawOp);

        if (bodyRef !== undefined) {
          rawBodyRefByKey.set(`${method}:${path}`, bodyRef);
        }

        const primaryResponse = extractPrimaryResponse(rawOp);

        if (primaryResponse !== undefined) {
          rawResponseByKey.set(`${method}:${path}`, primaryResponse);
        }
      }
    }
  }

  // Build property-level ref map before dereferencing.
  const propRefMap = buildPropRefMap(rawSchemas);

  const api = await SwaggerParser.dereference(rawSpec as OpenAPI.Document);
  const spec = api as RawSpec;

  const { title, version, baseUrl } = extractSpecMetadata(spec);
  const endpoints = extractEndpoints(
    spec.paths ?? {},
    rawRefsByKey,
    rawBodyRefByKey,
    rawResponseByKey,
  );
  const schemas = (spec.components?.schemas ?? {}) as Record<string, SchemaObject>;

  // Annotate schema properties with their original $ref names.
  annotateSchemaNamesAfterDeref(schemas, propRefMap);

  return { title, version, baseUrl, endpoints, schemas };
}
