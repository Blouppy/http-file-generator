import SwaggerParser from "@apidevtools/swagger-parser";
import YAML from "yaml";
import type { ParsedSpec, ParsedEndpoint, Parameter, RequestBody } from "@/types/openapi";
import type { OpenAPI } from "openapi-types";

export async function parseOpenAPISpec(content: string, filename: string): Promise<ParsedSpec> {
  let rawSpec: unknown;

  if (filename.endsWith(".yaml") || filename.endsWith(".yml")) {
    rawSpec = YAML.parse(content);
  } else {
    rawSpec = JSON.parse(content);
  }

  const api = await SwaggerParser.dereference(rawSpec as OpenAPI.Document);
  const spec = api as Record<string, unknown> & {
    info?: { title?: string; version?: string };
    servers?: Array<{ url: string }>;
    paths?: Record<string, Record<string, unknown>>;
  };

  const title = spec.info?.title || "API";
  const version = spec.info?.version || "1.0.0";
  const baseUrl = spec.servers?.[0]?.url || "{{baseUrl}}";

  const endpoints: ParsedEndpoint[] = [];

  const paths = spec.paths || {};
  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;
    const methods = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];
    for (const method of methods) {
      const operation = (pathItem as Record<string, unknown>)[method] as
        | Record<string, unknown>
        | undefined;
      if (!operation) continue;

      endpoints.push({
        path,
        method: method.toUpperCase(),
        operationId: operation.operationId as string | undefined,
        summary: operation.summary as string | undefined,
        description: operation.description as string | undefined,
        tags: operation.tags as string[] | undefined,
        parameters: operation.parameters as Parameter[] | undefined,
        requestBody: operation.requestBody as RequestBody | undefined,
      });
    }
  }

  return { title, version, baseUrl, endpoints };
}
