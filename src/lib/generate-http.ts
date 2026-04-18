import type { ParsedEndpoint, ParsedSpec } from "@/types/openapi";

function getExampleValue(schema: Record<string, unknown> | undefined, example: unknown): string {
  if (example !== undefined && example !== null) {
    return typeof example === "string" ? example : JSON.stringify(example);
  }
  if (!schema) return "{{value}}";
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
    default:
      return "{{value}}";
  }
}

export function generateHttpFile(spec: ParsedSpec, endpoint: ParsedEndpoint): string {
  const lines: string[] = [];
  const baseUrl =
    spec.baseUrl.startsWith("http") || spec.baseUrl.startsWith("{{")
      ? spec.baseUrl
      : `https://${spec.baseUrl}`;

  const label = endpoint.summary || endpoint.operationId || `${endpoint.method} ${endpoint.path}`;
  lines.push(`### ${label}`);

  let urlPath = endpoint.path;
  for (const param of (endpoint.parameters || []).filter((p) => p.in === "path")) {
    urlPath = urlPath.replace(`{${param.name}}`, `{{${param.name}}}`);
  }

  const queryParams = (endpoint.parameters || []).filter((p) => p.in === "query");
  let queryString = "";
  if (queryParams.length > 0) {
    const pairs = queryParams.map((p) => {
      const example = getExampleValue(p.schema as Record<string, unknown> | undefined, p.example);
      return `${p.name}=${example}`;
    });
    queryString = "?" + pairs.join("&");
  }

  lines.push(`${endpoint.method} ${baseUrl}${urlPath}${queryString}`);
  lines.push("Authorization: Bearer {{token}}");
  // Only add Content-Type for methods that typically have a request body
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
      } else {
        const schema = jsonContent.schema as Record<string, unknown> | undefined;
        const properties = schema?.properties as Record<string, Record<string, unknown>> | undefined;
        if (properties) {
          const body: Record<string, unknown> = {};
          for (const [key, propSchema] of Object.entries(properties)) {
            body[key] = getExampleValue(propSchema, propSchema.example);
          }
          lines.push(JSON.stringify(body, null, 2));
        } else {
          lines.push("{}");
        }
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
