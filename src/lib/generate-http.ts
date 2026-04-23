import type { ParsedEndpoint, ParsedSpec } from "@/types/openapi";

interface VarEntry {
  name: string;
  value: string;
}

/** Converts a PascalCase string to camelCase by lowercasing the first character. */
export function toCamelCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/** Returns the default variable value for a given schema type and parameter context. */
function getVariableDefault(
  schema: Record<string, unknown> | undefined,
  context: "path" | "query"
): string {
  if (schema) {
    // Enum: use the first declared value so the variable is immediately usable
    if (Array.isArray(schema.enum) && schema.enum.length > 0) {
      const first = schema.enum[0];
      return typeof first === "string" ? JSON.stringify(first) : String(first);
    }
    switch (schema.type) {
      case "integer":
      case "number":
        return "1";
      case "boolean":
        return "true";
      case "array":
        return "[]";
      case "object":
        return "{}";
    }
  }
  // Path params are most commonly numeric IDs; query params default to a quoted empty string.
  return context === "path" ? "1" : '""';
}

/**
 * Returns the literal JSON value for a body field, respecting the schema type and
 * any enum values defined. Used to populate the body template directly (no {{var}}).
 */
function getBodyLiteralDefault(schema: Record<string, unknown> | undefined): string {
  if (schema) {
    // Enum: use the first declared value so the body is immediately valid
    if (Array.isArray(schema.enum) && schema.enum.length > 0) {
      const first = schema.enum[0];
      return typeof first === "string" ? JSON.stringify(first) : String(first);
    }
    switch (schema.type) {
      case "integer":
      case "number":
        return "0";
      case "boolean":
        return "true";
      case "array":
        return "[]";
      case "object":
        return "{}";
    }
  }
  return '""';
}

/**
 * Extracts a flat properties map from a JSON Schema object, handling:
 *  - direct `properties`
 *  - `allOf` (merges all sub-schema properties)
 *  - `anyOf` / `oneOf` (uses the first sub-schema that has properties)
 */
function extractProperties(
  schema: Record<string, unknown> | undefined
): Record<string, Record<string, unknown>> | undefined {
  if (!schema) return undefined;

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
      if (subProps) return subProps;
    }
  }

  if (Array.isArray(schema.oneOf)) {
    for (const sub of schema.oneOf as Record<string, unknown>[]) {
      const subProps = extractProperties(sub);
      if (subProps) return subProps;
    }
  }

  return undefined;
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
  const vars: VarEntry[] = [];
  const declaredNames = new Set<string>();

  for (const param of pathParams) {
    const varName = toCamelCase(param.name);
    if (!declaredNames.has(varName)) {
      declaredNames.add(varName);
      vars.push({
        name: varName,
        value: getVariableDefault(param.schema as Record<string, unknown> | undefined, "path"),
      });
    }
  }

  for (const param of queryParams) {
    const varName = toCamelCase(param.name);
    if (!declaredNames.has(varName)) {
      declaredNames.add(varName);
      vars.push({
        name: varName,
        value: getVariableDefault(param.schema as Record<string, unknown> | undefined, "query"),
      });
    }
  }

  // Resolve the JSON content entry using a fuzzy match on the content-type key so that
  // variants like "application/json; charset=utf-8" or "application/vnd.api+json" are handled.
  const bodyRaw = endpoint.requestBody?.content ?? {};
  const jsonKey = Object.keys(bodyRaw).find((k) => {
    const lower = k.toLowerCase();
    return lower.startsWith("application/json") || (lower.startsWith("application/") && lower.includes("+json"));
  });
  const jsonContent = jsonKey ? (bodyRaw[jsonKey] as Record<string, unknown>) : undefined;

  // Body field entries: { name, literal }
  // literal → literal value used directly in the JSON body template (no @var declarations)
  interface BodyField { name: string; literal: string }
  const bodyFields: BodyField[] = [];
  let hasBodyFields = false;

  if (jsonContent) {
    const example = jsonContent.example;
    const schemaExample = (jsonContent.schema as Record<string, unknown> | undefined)?.example;
    if (example === undefined && schemaExample === undefined) {
      const schema = jsonContent.schema as Record<string, unknown> | undefined;
      const properties = extractProperties(schema);
      if (properties) {
        for (const [key, propSchema] of Object.entries(properties)) {
          const ps = propSchema as Record<string, unknown>;
          bodyFields.push({
            name: key,
            literal: getBodyLiteralDefault(ps),
          });
        }
        hasBodyFields = bodyFields.length > 0;
      }
    }
  }

  // Emit all variable declarations right after the ### label (path + query params only)
  for (const v of vars) {
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
    queryString = "?" + queryParams.map((p) => `${toCamelCase(p.name)}={{${toCamelCase(p.name)}}}`).join("&");
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
      const example = jsonContent.example;
      const schemaExample = (jsonContent.schema as Record<string, unknown> | undefined)?.example;
      if (example !== undefined) {
        lines.push(JSON.stringify(example, null, 2));
      } else if (schemaExample !== undefined) {
        lines.push(JSON.stringify(schemaExample, null, 2));
      } else if (hasBodyFields) {
        // Emit body with literal typed values — no {{var}} substitutions
        const bodyLines = ["{"];
        bodyFields.forEach((f, i) => {
          const comma = i < bodyFields.length - 1 ? "," : "";
          bodyLines.push(`  "${f.name}": ${f.literal}${comma}`);
        });
        bodyLines.push("}");
        lines.push(bodyLines.join("\n"));
      } else {
        lines.push("{}");
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
