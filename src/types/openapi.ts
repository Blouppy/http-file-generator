export interface ParsedEndpoint {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses?: Record<string, unknown>;
}

export interface Parameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required?: boolean;
  schema?: {
    type?: string;
    example?: unknown;
    default?: unknown;
  };
  example?: unknown;
  description?: string;
}

export interface RequestBody {
  required?: boolean;
  content?: Record<string, MediaType>;
  description?: string;
}

export interface MediaType {
  schema?: {
    type?: string;
    properties?: Record<string, unknown>;
    example?: unknown;
  };
  example?: unknown;
  examples?: Record<string, unknown>;
}

export interface ParsedSpec {
  title: string;
  version: string;
  baseUrl: string;
  endpoints: ParsedEndpoint[];
}
