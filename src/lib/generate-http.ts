import type { ParsedEndpoint, ParsedSpec } from "@/types/openapi";

interface VarEntry {
  name: string;
  value: string;
}

/**
 * Maximum nesting depth for recursive body object generation.
 * Guards against runaway recursion on circular or deeply-nested schemas.
 * Properties beyond this depth fall back to the property name as a string value.
 */
const MAX_NESTING_DEPTH = 10;

/** Converts a PascalCase string to camelCase by lowercasing the first character. */
export function toCamelCase(str: string): string {
  if (!str) {
    return str;
  }

  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Returns the first non-nullish (`!== undefined && !== null`) candidate.
 */
function firstNonNullish(...candidates: unknown[]): unknown {
  for (const c of candidates) {
    if (c !== undefined && c !== null) {
      return c;
    }
  }
  return undefined;
}

/**
 * Resolves a single effective JSON Schema type. JSON Schema (and OpenAPI 3.1)
 * allow `type` to be an array of types — in that case we prefer numeric/boolean
 * types over string so that an `["integer", "string"]` schema (commonly used
 * for IDs that may serialize as either) is treated as numeric.
 */
function effectiveSchemaType(schema: Record<string, unknown> | undefined): string | undefined {
  if (!schema) {
    return undefined;
  }
  const t = schema.type;
  if (typeof t === "string") {
    return t;
  }

  if (Array.isArray(t)) {
    const preference = ["integer", "number", "boolean", "array", "object", "string"];
    for (const candidate of preference) {
      if (t.includes(candidate)) {
        return candidate;
      }
    }
    const first = t.find((entry) => typeof entry === "string");
    return typeof first === "string" ? first : undefined;
  }
  return undefined;
}

/**
 * Converts a value to its raw URL/query-string representation.
 * Objects/arrays are JSON-stringified.
 */
function toUrlString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Returns the default variable value for a given schema type and parameter.
 *
 * Priority:
 *   1. Explicit parameter-level `example`
 *   2. Schema `example`
 *   3. Schema `default`
 *   4. First enum value
 *   5. Type-based fallback. When the schema's effective type is `string` (or
 *      no schema is given), the parameter's own name is used as the value
 *      (e.g. `@sort = sort`) instead of a generic placeholder. Path params
 *      without a schema continue to default to `1` since they are usually IDs.
 */
function getVariableDefault(
  schema: Record<string, unknown> | undefined,
  paramContext: "path" | "query",
  paramName: string,
  paramExample?: unknown,
): string {
  const specValue = firstNonNullish(paramExample, schema?.example, schema?.default);
  if (specValue !== undefined) {
    return toUrlString(specValue);
  }

  if (schema) {
    if (Array.isArray(schema.enum) && schema.enum.length > 0) {
      return String(schema.enum[0]);
    }

    switch (effectiveSchemaType(schema)) {
      case "integer":
      case "number":
        return "1";
      case "boolean":
        return "true";
      case "string":
        return paramName;
      case "array":
        // URL-encoded comma-separated format for array query/path params (curl %2C encoding)
        return `${paramName}1%2C${paramName}2`;
      case "object":
        return "{}";
    }
  }

  // Path params are most commonly numeric IDs; query/unknown params fall back
  // to the parameter name itself when we have no other information.
  return paramContext === "path" ? "1" : paramName;
}

/**
 * Recursively builds the body value for a given schema property.
 *
 * - `object` schemas → nested plain object built from their properties (via {@link buildBodyObject}).
 * - `array` schemas whose `items` resolve to an object → single-element array `[{ … }]`.
 * - `array` schemas with primitive items → `["name1", "name2"]` fallback.
 * - Primitive types → typed literal (number `1`, boolean `true`, string uses property name).
 *
 * Priority: schema `example` → schema `default` → first enum value → type-based fallback.
 *
 * The `depth` parameter guards against circular/infinitely-nested schemas (cap: {@link MAX_NESTING_DEPTH} levels).
 */
function buildBodyLiteralValue(
  schema: Record<string, unknown> | undefined,
  propertyName: string,
  depth: number,
): unknown {
  if (depth > MAX_NESTING_DEPTH) {
    return propertyName;
  }

  const specValue = firstNonNullish(schema?.example, schema?.default);
  if (specValue !== undefined) {
    return specValue;
  }

  if (schema) {
    if (Array.isArray(schema.enum) && schema.enum.length > 0) {
      return schema.enum[0];
    }

    switch (effectiveSchemaType(schema)) {
      case "integer":
      case "number":
        return 1;
      case "boolean":
        return true;
      case "object": {
        const nested = buildBodyObject(schema, depth + 1);
        return nested ?? {};
      }
      case "array": {
        const items = schema.items as Record<string, unknown> | undefined;
        if (items) {
          const itemType = effectiveSchemaType(items);
          if (itemType === "object" || itemType === undefined) {
            // Object (or untyped) items: recursively build a template object.
            // Fall back to [{}] when no properties can be resolved (e.g. free-form object).
            const nestedItem = buildBodyObject(items, depth + 1);
            return [nestedItem ?? {}];
          }
          // Primitive items — honour spec values first
          const itemSpecValue = firstNonNullish(items.example, items.default);
          if (itemSpecValue !== undefined) {
            return [itemSpecValue];
          }

          if (Array.isArray(items.enum) && items.enum.length > 0) {
            return [items.enum[0]];
          }
        }
        // Plain primitive array without spec values: use name-based placeholders
        // to signal that multiple values are expected.
        return [`${propertyName}1`, `${propertyName}2`];
      }
      case "string":
        return propertyName;
    }
  }

  return propertyName;
}

/**
 * Recursively builds a plain JS object that acts as the body template for a given
 * JSON Schema object schema. Each property value is produced by {@link buildBodyLiteralValue},
 * which handles nesting for `object` and `array` properties.
 *
 * Returns `undefined` when no properties can be extracted (e.g. schema is missing or
 * has no resolvable `properties` / `allOf` / `anyOf` / `oneOf`).
 */
function buildBodyObject(
  schema: Record<string, unknown> | undefined,
  depth: number = 0,
): Record<string, unknown> | undefined {
  const properties = extractProperties(schema);
  if (!properties) {
    return undefined;
  }

  const result: Record<string, unknown> = {};
  for (const [key, propSchema] of Object.entries(properties)) {
    result[key] = buildBodyLiteralValue(propSchema as Record<string, unknown>, key, depth);
  }

  return result;
}

/**
 * Extracts a flat properties map from a JSON Schema object, handling:
 *  - direct `properties` merged with `allOf` sub-schema properties
 *  - `allOf` alone (merges all sub-schema properties)
 *  - `anyOf` / `oneOf` (uses the first sub-schema that has properties)
 *
 * When both `properties` and `allOf` are present (e.g. a schema that extends a
 * base model via `allOf` and adds its own `properties`), both sources are merged
 * so the generated body template includes fields from all of them.
 */
function extractProperties(
  schema: Record<string, unknown> | undefined,
): Record<string, Record<string, unknown>> | undefined {
  if (!schema) {
    return undefined;
  }

  // Collect direct `properties` and `allOf` together so that a schema which has
  // both (e.g. extends a base via allOf and adds its own properties) is fully merged.
  const hasDirectProperties = schema.properties && typeof schema.properties === "object";
  const hasAllOf = Array.isArray(schema.allOf);

  if (hasDirectProperties || hasAllOf) {
    const merged: Record<string, Record<string, unknown>> = {};

    if (hasDirectProperties) {
      Object.assign(merged, schema.properties as Record<string, Record<string, unknown>>);
    }

    if (hasAllOf) {
      for (const sub of schema.allOf as Record<string, unknown>[]) {
        const subProps = extractProperties(sub);
        if (subProps) {
          Object.assign(merged, subProps);
        }
      }
    }

    return Object.keys(merged).length > 0 ? merged : undefined;
  }

  if (Array.isArray(schema.anyOf)) {
    for (const sub of schema.anyOf as Record<string, unknown>[]) {
      const subProps = extractProperties(sub);

      if (subProps) {
        return subProps;
      }
    }
  }

  if (Array.isArray(schema.oneOf)) {
    for (const sub of schema.oneOf as Record<string, unknown>[]) {
      const subProps = extractProperties(sub);

      if (subProps) {
        return subProps;
      }
    }
  }

  return undefined;
}

/**
 * Returns the first example from an OpenAPI `examples` map, if any. The map
 * values are `{ value: ... }` per the OpenAPI 3 spec; raw values (including
 * arrays) are accepted defensively as a fall-through.
 */
function firstExampleFromMap(examples: unknown): unknown {
  if (!examples || typeof examples !== "object") {
    return undefined;
  }
  const values = Object.values(examples as Record<string, unknown>);
  if (values.length === 0) {
    return undefined;
  }

  const first = values[0];
  if (
    first !== null &&
    typeof first === "object" &&
    !Array.isArray(first) &&
    "value" in (first as Record<string, unknown>)
  ) {
    return (first as Record<string, unknown>).value;
  }
  return first;
}

// ── generateHttpFile helpers ────────────────────────────────────────────────

/** Derives the display label for the `###` block. */
function buildLabel(endpoint: ParsedEndpoint): string {
  return endpoint.summary ?? endpoint.operationId ?? `${endpoint.method} ${endpoint.path}`;
}

/**
 * Builds `@var = value` declaration entries for all path and query parameters.
 * Path params are declared first, then query params. Duplicate variable names are skipped.
 */
function buildVarDeclarations(endpoint: ParsedEndpoint): VarEntry[] {
  const pathParams = (endpoint.parameters ?? []).filter((p) => p.in === "path");
  const queryParams = (endpoint.parameters ?? []).filter((p) => p.in === "query");
  const declarations: VarEntry[] = [];
  const declared = new Set<string>();

  const addParam = (
    param: NonNullable<ParsedEndpoint["parameters"]>[number],
    context: "path" | "query",
  ) => {
    const varName = toCamelCase(param.name);
    if (declared.has(varName)) {
      return;
    }
    declared.add(varName);
    declarations.push({
      name: varName,
      value: getVariableDefault(
        param.schema as Record<string, unknown> | undefined,
        context,
        varName,
        param.example,
      ),
    });
  };

  for (const p of pathParams) {
    addParam(p, "path");
  }

  for (const p of queryParams) {
    addParam(p, "query");
  }

  return declarations;
}

/**
 * Builds the full request URL from the base URL, path (with param substitutions)
 * and query string.
 */
function buildRequestUrl(spec: ParsedSpec, endpoint: ParsedEndpoint): string {
  const baseUrl =
    spec.baseUrl.startsWith("http") || spec.baseUrl.startsWith("{{")
      ? spec.baseUrl
      : `https://${spec.baseUrl}`;

  const pathParams = (endpoint.parameters ?? []).filter((p) => p.in === "path");
  const queryParams = (endpoint.parameters ?? []).filter((p) => p.in === "query");

  let urlPath = endpoint.path;
  for (const param of pathParams) {
    urlPath = urlPath.replace(`{${param.name}}`, `{{${toCamelCase(param.name)}}}`);
  }

  const queryString =
    queryParams.length > 0
      ? "?" +
        queryParams
          .map((p) => {
            const name = toCamelCase(p.name);
            return `${name}={{${name}}}`;
          })
          .join("&")
      : "";

  return `${baseUrl}${urlPath}${queryString}`;
}

/**
 * Finds the JSON content entry from the request body using a fuzzy content-type match.
 * Handles variants like `application/json; charset=utf-8` and `application/vnd.api+json`.
 */
function resolveJsonContent(endpoint: ParsedEndpoint): Record<string, unknown> | undefined {
  const content = endpoint.requestBody?.content ?? {};
  const key = Object.keys(content).find((k) => {
    const lower = k.toLowerCase();
    return (
      lower.startsWith("application/json") ||
      (lower.startsWith("application/") && lower.includes("+json"))
    );
  });
  return key ? (content[key] as Record<string, unknown>) : undefined;
}

/**
 * Resolves the body value to emit. Returns a spec-provided example when one is
 * available (media `example` → `examples` map → schema `example`), or builds a
 * typed template object from the schema otherwise.
 */
function resolveBodyValue(jsonContent: Record<string, unknown>): unknown {
  const schema = jsonContent.schema as Record<string, unknown> | undefined;

  const specExample = firstNonNullish(
    jsonContent.example,
    firstExampleFromMap(jsonContent.examples),
    schema?.example,
  );
  if (specExample !== undefined) {
    return specExample;
  }

  if (schema && effectiveSchemaType(schema) === "array") {
    // Top-level body is an array — build a single template item from the items schema.
    const items = schema.items as Record<string, unknown> | undefined;
    const itemObj = items ? buildBodyObject(items, 1) : undefined;
    return [itemObj ?? {}];
  }

  return buildBodyObject(schema) ?? {};
}

/**
 * Builds the header lines for a request: Authorization, optional Content-Type,
 * and any custom `header` parameters defined on the endpoint.
 */
function buildHttpHeaders(endpoint: ParsedEndpoint): string[] {
  const headers: string[] = ["Authorization: Bearer {{token}}"];

  // Only add Content-Type for methods that typically carry a request body
  const methodsWithBody = ["POST", "PUT", "PATCH"];
  if (methodsWithBody.includes(endpoint.method) || endpoint.requestBody) {
    headers.push("Content-Type: application/json");
  }

  for (const param of (endpoint.parameters ?? []).filter((p) => p.in === "header")) {
    headers.push(`${param.name}: {{${param.name}}}`);
  }

  return headers;
}

/**
 * Builds the body section lines (blank separator + serialised body) for a request.
 * Returns an empty array when there is no request body.
 */
function buildBodyLines(
  endpoint: ParsedEndpoint,
  jsonContent: Record<string, unknown> | undefined,
): string[] {
  if (!endpoint.requestBody) {
    return [];
  }

  if (jsonContent) {
    // Emit body with literal typed values — no {{var}} substitutions.
    return ["", JSON.stringify(resolveBodyValue(jsonContent), null, 2)];
  }

  return ["", "{}"];
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateHttpFile(spec: ParsedSpec, endpoint: ParsedEndpoint): string {
  const varDeclarations = buildVarDeclarations(endpoint);
  const url = buildRequestUrl(spec, endpoint);
  const jsonContent = resolveJsonContent(endpoint);
  const headers = buildHttpHeaders(endpoint);
  const bodyLines = buildBodyLines(endpoint, jsonContent);

  const lines: string[] = [
    `### ${buildLabel(endpoint)}`,
    ...varDeclarations.map((v) => `@${v.name} = ${v.value}`),
    `${endpoint.method} ${url}`,
    ...headers,
    ...bodyLines,
    "",
  ];

  return lines.join("\n");
}

export function generateHttpFileContent(spec: ParsedSpec, endpoints: ParsedEndpoint[]): string {
  const header = `# ${spec.title} v${spec.version}\n# Base URL: ${spec.baseUrl}\n\n@baseUrl = ${spec.baseUrl}\n@token = your_token_here\n\n`;
  // Separate blocks with an extra blank line so the per-block "Send Request"
  // link in the preview has a visible gap above it (visually separating each
  // endpoint from the previous one).
  const body = endpoints.map((e) => generateHttpFile(spec, e)).join("\n\n");

  return header + body;
}
