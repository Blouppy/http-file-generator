import type { ParsedEndpoint, ParsedSpec } from "@/types/openapi";

interface VarEntry {
  name: string;
  value: string;
}

/** Returns the default variable value for a given schema type and parameter context. */
function getVariableDefault(
  schema: Record<string, unknown> | undefined,
  context: "path" | "query" | "body"
): string {
  if (schema) {
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
  // Path params are most commonly numeric IDs; body/query params default to a quoted empty
  // string (`""`) so the variable value is valid JSON when substituted inline.
  return context === "path" ? "1" : '""';
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

  // Collect variable declarations — path params first, then query params, then body props.
  // Use a Set to avoid duplicate declarations (e.g. a path param reused as a body field).
  const declaredNames = new Set<string>();
  const vars: VarEntry[] = [];

  for (const param of pathParams) {
    if (!declaredNames.has(param.name)) {
      declaredNames.add(param.name);
      vars.push({
        name: param.name,
        value: getVariableDefault(param.schema as Record<string, unknown> | undefined, "path"),
      });
    }
  }

  for (const param of queryParams) {
    if (!declaredNames.has(param.name)) {
      declaredNames.add(param.name);
      vars.push({
        name: param.name,
        value: getVariableDefault(param.schema as Record<string, unknown> | undefined, "query"),
      });
    }
  }

  // Determine body property variables when no explicit example is available
  const bodyVarNames: string[] = [];
  let useBodyVars = false;
  if (endpoint.requestBody) {
    const content = endpoint.requestBody.content || {};
    const jsonContent = content["application/json"];
    if (jsonContent) {
      const example = jsonContent.example;
      const schemaExample = (jsonContent.schema as Record<string, unknown> | undefined)?.example;
      if (example === undefined && schemaExample === undefined) {
        const schema = jsonContent.schema as Record<string, unknown> | undefined;
        const properties = schema?.properties as Record<string, Record<string, unknown>> | undefined;
        if (properties) {
          for (const [key, propSchema] of Object.entries(properties)) {
            bodyVarNames.push(key);
            if (!declaredNames.has(key)) {
              declaredNames.add(key);
              vars.push({
                name: key,
                value: getVariableDefault(propSchema, "body"),
              });
            }
          }
          useBodyVars = bodyVarNames.length > 0;
        }
      }
    }
  }

  // Emit all variable declarations right after the ### label
  for (const v of vars) {
    lines.push(`@${v.name} = ${v.value}`);
  }

  // Build URL with path param substitutions
  let urlPath = endpoint.path;
  for (const param of pathParams) {
    urlPath = urlPath.replace(`{${param.name}}`, `{{${param.name}}}`);
  }

  // Build query string using variable references
  let queryString = "";
  if (queryParams.length > 0) {
    queryString = "?" + queryParams.map((p) => `${p.name}={{${p.name}}}`).join("&");
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
    const content = endpoint.requestBody.content || {};
    const jsonContent = content["application/json"];
    if (jsonContent) {
      const example = jsonContent.example;
      const schemaExample = (jsonContent.schema as Record<string, unknown> | undefined)?.example;
      if (example !== undefined) {
        lines.push(JSON.stringify(example, null, 2));
      } else if (schemaExample !== undefined) {
        lines.push(JSON.stringify(schemaExample, null, 2));
      } else if (useBodyVars) {
        // Emit body as a template using variable references
        const bodyLines = ["{"];
        bodyVarNames.forEach((name, i) => {
          const comma = i < bodyVarNames.length - 1 ? "," : "";
          bodyLines.push(`  "${name}": {{${name}}}${comma}`);
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
