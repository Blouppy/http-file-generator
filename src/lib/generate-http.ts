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
    if (c !== undefined && c !== null) return c;
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
  if (!schema) return undefined;
  const t = schema.type;
  if (typeof t === "string") return t;
  if (Array.isArray(t)) {
    const preference = ["integer", "number", "boolean", "array", "object", "string"];
    for (const candidate of preference) {
      if (t.includes(candidate)) return candidate;
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
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
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
  if (!properties) return undefined;

  const result: Record<string, unknown> = {};
  for (const [key, propSchema] of Object.entries(properties)) {
    result[key] = buildBodyLiteralValue(propSchema as Record<string, unknown>, key, depth);
  }

  return result;
}

/**
 * Extracts a flat properties map from a JSON Schema object, handling:
 *  - direct `properties`
 *  - `allOf` (merges all sub-schema properties)
 *  - `anyOf` / `oneOf` (uses the first sub-schema that has properties)
 */
function extractProperties(
  schema: Record<string, unknown> | undefined,
): Record<string, Record<string, unknown>> | undefined {
  if (!schema) {
    return undefined;
  }

  if (schema.properties) {
    return schema.properties as Record<string, Record<string, unknown>>;
  }

  if (Array.isArray(schema.allOf)) {
    const merged: Record<string, Record<string, unknown>> = {};

    for (const sub of schema.allOf as Record<string, unknown>[]) {
      const subProps = extractProperties(sub);
      if (subProps) Object.assign(merged, subProps);
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
  if (!examples || typeof examples !== "object") return undefined;
  const values = Object.values(examples as Record<string, unknown>);
  if (values.length === 0) return undefined;

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

export function generateHttpFile(spec: ParsedSpec, endpoint: ParsedEndpoint): string {
  const lines: string[] = [];
  const baseUrl =
    spec.baseUrl.startsWith("http") || spec.baseUrl.startsWith("{{")
      ? spec.baseUrl
      : `https://${spec.baseUrl}`;

  const label = endpoint.summary || endpoint.operationId || `${endpoint.method} ${endpoint.path}`;
  lines.push(`### ${label}`);

  const pathParams = (endpoint.parameters || []).filter((p) => p.in === "path");
  const queryParams = (endpoint.parameters || []).filter((p) => p.in === "query");

  // Collect @var declarations — path params first, then query params.
  const varDeclarations: VarEntry[] = [];
  const declaredNames = new Set<string>();

  for (const param of pathParams) {
    const varName = toCamelCase(param.name);

    if (!declaredNames.has(varName)) {
      declaredNames.add(varName);
      varDeclarations.push({
        name: varName,
        value: getVariableDefault(
          param.schema as Record<string, unknown> | undefined,
          "path",
          varName,
          param.example,
        ),
      });
    }
  }

  for (const param of queryParams) {
    const varName = toCamelCase(param.name);

    if (!declaredNames.has(varName)) {
      declaredNames.add(varName);
      varDeclarations.push({
        name: varName,
        value: getVariableDefault(
          param.schema as Record<string, unknown> | undefined,
          "query",
          varName,
          param.example,
        ),
      });
    }
  }

  // Resolve the JSON content entry using a fuzzy match on the content-type key so that
  // variants like "application/json; charset=utf-8" or "application/vnd.api+json" are handled.
  const requestBodyContent = endpoint.requestBody?.content ?? {};
  const jsonContentKey = Object.keys(requestBodyContent).find((k) => {
    const lower = k.toLowerCase();

    return (
      lower.startsWith("application/json") ||
      (lower.startsWith("application/") && lower.includes("+json"))
    );
  });
  const jsonContent = jsonContentKey
    ? (requestBodyContent[jsonContentKey] as Record<string, unknown>)
    : undefined;

  // Resolve a body example from the spec, in order of precedence:
  //   media `example` → media `examples` (first) → schema `example`
  let resolvedBodyExample: unknown = undefined;
  let resolvedBodyObject: Record<string, unknown> | undefined = undefined;

  if (jsonContent) {
    const schema = jsonContent.schema as Record<string, unknown> | undefined;

    resolvedBodyExample = firstNonNullish(
      jsonContent.example,
      firstExampleFromMap(jsonContent.examples),
      schema?.example,
    );

    if (resolvedBodyExample === undefined) {
      if (schema && effectiveSchemaType(schema) === "array") {
        // Top-level body is an array — build a single template item from the items schema.
        const items = schema.items as Record<string, unknown> | undefined;
        const itemObj = items ? buildBodyObject(items, 1) : undefined;
        resolvedBodyExample = [itemObj ?? {}];
      } else {
        resolvedBodyObject = buildBodyObject(schema);
      }
    }
  }

  // Emit all variable declarations right after the ### label (path + query params only)
  for (const v of varDeclarations) {
    lines.push(`@${v.name} = ${v.value}`);
  }

  // Build URL with path param substitutions
  let urlPath = endpoint.path;

  for (const param of pathParams) {
    urlPath = urlPath.replace(`{${param.name}}`, `{{${toCamelCase(param.name)}}}`);
  }

  // Build query string using variable references (apply camelCase to both key and var reference)
  let queryString = "";
  if (queryParams.length > 0) {
    queryString =
      "?" + queryParams.map((p) => `${toCamelCase(p.name)}={{${toCamelCase(p.name)}}}`).join("&");
  }

  lines.push(`${endpoint.method} ${baseUrl}${urlPath}${queryString}`);
  lines.push("Authorization: Bearer {{token}}");

  // Only add Content-Type for methods that typically carry a request body
  const methodsWithBody = ["POST", "PUT", "PATCH"];
  if (methodsWithBody.includes(endpoint.method) || endpoint.requestBody) {
    lines.push("Content-Type: application/json");
  }

  for (const param of (endpoint.parameters || []).filter((p) => p.in === "header")) {
    lines.push(`${param.name}: {{${param.name}}}`);
  }

  if (endpoint.requestBody) {
    lines.push("");

    if (jsonContent) {
      if (resolvedBodyExample !== undefined) {
        lines.push(JSON.stringify(resolvedBodyExample, null, 2));
      } else {
        // Emit body with literal typed values — no {{var}} substitutions.
        // buildBodyObject recursively handles nested objects and arrays of objects.
        lines.push(JSON.stringify(resolvedBodyObject ?? {}, null, 2));
      }
    } else {
      lines.push("{}");
    }
  }

  lines.push("");

  return lines.join("\n");
}

export function generateHttpFileContent(spec: ParsedSpec, endpoints: ParsedEndpoint[]): string {
  const header = `# ${spec.title} v${spec.version}\n# Base URL: ${spec.baseUrl}\n\n@baseUrl = ${spec.baseUrl}\n@token = your_token_here\n\n`;
  const body = endpoints.map((e) => generateHttpFile(spec, e)).join("\n");

  return header + body;
}
