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
  /** Schema names from components/schemas referenced by this endpoint (pre-deref). */
  schemaRefs?: string[];
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

export interface SchemaProperty {
  type?: string | string[];
  description?: string;
  format?: string;
  enum?: unknown[];
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  nullable?: boolean;
  /** Original `$ref` schema name, annotated after dereferencing (OpenAPI 3.1 refs are erased by dereference). */
  schemaName?: string;
}

export interface SchemaObject {
  type?: string | string[];
  description?: string;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  enum?: unknown[];
  format?: string;
  items?: SchemaProperty;
}

export interface ParsedSpec {
  title: string;
  version: string;
  baseUrl: string;
  endpoints: ParsedEndpoint[];
  schemas?: Record<string, SchemaObject>;
}
