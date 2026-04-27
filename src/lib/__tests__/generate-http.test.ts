import { generateHttpFile, generateHttpFileContent, toCamelCase } from "@/lib/generate-http";
import type { ParsedSpec, ParsedEndpoint } from "@/types/openapi";

const baseSpec: ParsedSpec = {
  title: "My API",
  version: "2.0",
  baseUrl: "https://api.example.com",
  endpoints: [],
};

// ── Test helpers ──────────────────────────────────────────────────────────────

/** Creates a `{ type: "object", properties }` schema. */
const makeObjectSchema = (properties: Record<string, unknown>): Record<string, unknown> => ({
  type: "object",
  properties,
});

/**
 * Creates an endpoint whose request body uses `application/json` with the
 * given schema. Optional `parameters` are forwarded as-is.
 */
const makeJsonBodyEndpoint = (
  method: string,
  path: string,
  schema: Record<string, unknown>,
  parameters?: ParsedEndpoint["parameters"],
): ParsedEndpoint => ({
  method,
  path,
  ...(parameters ? { parameters } : {}),
  requestBody: {
    content: { "application/json": { schema } },
  },
});

describe("generateHttpFile", () => {
  it("generates a GET request with correct method and path", () => {
    const endpoint: ParsedEndpoint = { method: "GET", path: "/items" };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("GET https://api.example.com/items");
  });

  it("generates a POST request with Content-Type header", () => {
    const endpoint = makeJsonBodyEndpoint(
      "POST",
      "/items",
      makeObjectSchema({ name: { type: "string" } }),
    );
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("POST https://api.example.com/items");
    expect(result).toContain("Content-Type: application/json");
  });

  it("substitutes path parameters in the URL", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/users/{id}",
      parameters: [{ name: "id", in: "path" }],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("GET https://api.example.com/users/{{id}}");
  });

  it("declares a variable for each path parameter", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/users/{id}",
      parameters: [{ name: "id", in: "path", schema: { type: "integer" } }],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@id = 1");
  });

  it("uses numeric default for path params without a schema", () => {
    const endpoint: ParsedEndpoint = {
      method: "DELETE",
      path: "/items/{itemId}",
      parameters: [{ name: "itemId", in: "path" }],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@itemId = 1");
  });

  it("uses the parameter name as default for query params without a schema", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/search",
      parameters: [{ name: "q", in: "query" }],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@q = q");
  });

  it("uses variable references in the query string", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/search",
      parameters: [
        { name: "q", in: "query", schema: { type: "string" } },
        { name: "page", in: "query", schema: { type: "integer" } },
      ],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("q={{q}}");
    expect(result).toContain("page={{page}}");
  });

  it("emits literal values in the body (no @var declarations for body fields)", () => {
    const endpoint = makeJsonBodyEndpoint(
      "POST",
      "/users",
      makeObjectSchema({ name: { type: "string" }, age: { type: "integer" } }),
    );
    const result = generateHttpFile(baseSpec, endpoint);
    // No @var declarations for body-only fields
    expect(result).not.toContain("@name");
    expect(result).not.toContain("@age");
    // Body uses literal values, NOT {{var}} references; strings use the property name.
    expect(result).toContain('"name": "name"');
    expect(result).toContain('"age": 1');
    expect(result).not.toContain('"name": {{name}}');
    expect(result).not.toContain('"age": {{age}}');
  });

  it("uses enum first value as literal in the body", () => {
    const endpoint = makeJsonBodyEndpoint(
      "POST",
      "/issues",
      makeObjectSchema({
        priority: { type: "string", enum: ["Low", "Medium", "High"] },
        count: { type: "integer" },
      }),
    );
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain('"priority": "Low"');
    expect(result).toContain('"count": 1');
    // No @var declarations for body fields
    expect(result).not.toContain("@priority");
    expect(result).not.toContain("@count");
  });

  it("uses enum first value for query param @var declarations", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/issues",
      parameters: [
        {
          name: "sort",
          in: "query",
          schema: { type: "string", enum: ["asc", "desc"] } as Record<string, unknown>,
        },
        { name: "page", in: "query", schema: { type: "integer" } },
      ],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@sort = asc");
    expect(result).toContain("@page = 1");
  });

  it("uses URL-encoded comma-separated default for array query params", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/items",
      parameters: [{ name: "ids", in: "query", schema: { type: "array" } }],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@ids = ids1%2Cids2");
  });

  it("does not emit @var for body fields; only path/query params get @var declarations", () => {
    const endpoint = makeJsonBodyEndpoint(
      "PUT",
      "/projects/{id}",
      makeObjectSchema({ id: { type: "integer" }, name: { type: "string" } }),
      [{ name: "id", in: "path", schema: { type: "integer" } }],
    );
    const result = generateHttpFile(baseSpec, endpoint);

    // Only path param @id = 1; no @name for body field
    expect(result).toContain("@id = 1");
    expect(result).not.toContain("@name");
    // Body uses literal values; strings use the property name.
    expect(result).toContain('"id": 1');
    expect(result).toContain('"name": "name"');
  });

  it("uses spec example directly instead of variables when an example is present", () => {
    const endpoint: ParsedEndpoint = {
      method: "POST",
      path: "/items",
      requestBody: {
        content: {
          "application/json": {
            example: { id: 42, label: "foo" },
          },
        },
      },
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain('"id": 42');
    expect(result).toContain('"label": "foo"');
    // No variable declarations for body props when an example is available
    expect(result).not.toContain("@label");
  });

  it("generates body from allOf schema when no direct properties exist", () => {
    const endpoint = makeJsonBodyEndpoint("POST", "/projects", {
      allOf: [makeObjectSchema({ id: { type: "integer" }, name: { type: "string" } })],
    });
    const result = generateHttpFile(baseSpec, endpoint);

    // No @var declarations for body-only fields
    expect(result).not.toContain("@id");
    expect(result).not.toContain("@name");
    // Body uses literal values; strings use the property name.
    expect(result).toContain('"id": 1');
    expect(result).toContain('"name": "name"');
  });

  it("generates body from anyOf schema using the first entry with properties", () => {
    const endpoint = makeJsonBodyEndpoint(
      "PUT",
      "/items/{id}",
      { anyOf: [makeObjectSchema({ label: { type: "string" } })] },
      [{ name: "id", in: "path", schema: { type: "integer" } }],
    );
    const result = generateHttpFile(baseSpec, endpoint);

    // @id declared for path param; @label not declared (body field)
    expect(result).toContain("@id = 1");
    expect(result).not.toContain("@label");
    expect(result).toContain('"label": "label"');
    expect(result).not.toContain('"label": {{label}}');
  });

  it("merges properties from multiple allOf entries", () => {
    const endpoint = makeJsonBodyEndpoint("POST", "/users", {
      allOf: [
        makeObjectSchema({ firstName: { type: "string" } }),
        makeObjectSchema({ age: { type: "integer" } }),
      ],
    });
    const result = generateHttpFile(baseSpec, endpoint);

    // No @var for body fields
    expect(result).not.toContain("@firstName");
    expect(result).not.toContain("@age");
    // Body uses literal values; strings use the property name.
    expect(result).toContain('"firstName": "firstName"');
    expect(result).toContain('"age": 1');
  });

  it("includes the summary as label", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/items",
      summary: "List all items",
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("### List all items");
  });

  it("generates body from schema when content-type key includes a charset suffix", () => {
    const endpoint: ParsedEndpoint = {
      method: "POST",
      path: "/users",
      requestBody: {
        content: {
          "application/json; charset=utf-8": {
            schema: makeObjectSchema({ username: { type: "string" } }),
          },
        },
      },
    };
    const result = generateHttpFile(baseSpec, endpoint);

    // No @var for body-only field
    expect(result).not.toContain("@username");
    expect(result).toContain('"username": "username"');
    expect(result).not.toContain('"username": {{username}}');
  });

  it("generates body from schema when content-type key uses a json suffix (+json)", () => {
    const endpoint: ParsedEndpoint = {
      method: "POST",
      path: "/resources",
      requestBody: {
        content: {
          "application/vnd.api+json": {
            schema: makeObjectSchema({ title: { type: "string" } }),
          },
        },
      },
    };
    const result = generateHttpFile(baseSpec, endpoint);

    // No @var for body-only field
    expect(result).not.toContain("@title");
    expect(result).toContain('"title": "title"');
    expect(result).not.toContain('"title": {{title}}');
  });
});

describe("generateHttpFile spec-provided values (examples & defaults)", () => {
  it("uses parameter-level example for path param @var declaration", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/pets/{petId}",
      tags: ["Pets"],
      parameters: [{ name: "petId", in: "path", schema: { type: "integer" }, example: 42 }],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@petId = 42");
  });

  it("uses schema example for query param @var declaration", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/pets",
      tags: ["Pets"],
      parameters: [
        {
          name: "status",
          in: "query",
          schema: { type: "string", example: "available" } as Record<string, unknown>,
        },
      ],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@status = available");
  });

  it("uses schema default when no example is present", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/pets",
      parameters: [
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 25 } as Record<string, unknown>,
        },
      ],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@limit = 25");
  });

  it("prefers parameter-level example over schema example and default", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/pets",
      parameters: [
        {
          name: "status",
          in: "query",
          schema: { type: "string", example: "fromSchema", default: "fromDefault" } as Record<
            string,
            unknown
          >,
          example: "fromParam",
        },
      ],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@status = fromParam");
  });

  it("uses property-level example for body field literals", () => {
    const endpoint = makeJsonBodyEndpoint(
      "POST",
      "/pets",
      makeObjectSchema({
        name: { type: "string", example: "Rex" },
        age: { type: "integer", default: 3 },
      }),
    );
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain('"name": "Rex"');
    expect(result).toContain('"age": 3');
  });

  it("uses request body examples (plural) when no example is present", () => {
    const endpoint: ParsedEndpoint = {
      method: "POST",
      path: "/pets",
      requestBody: {
        content: {
          "application/json": {
            examples: {
              fluffy: { value: { name: "Fluffy", age: 2 } },
            } as Record<string, unknown>,
          },
        },
      },
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain('"name": "Fluffy"');
    expect(result).toContain('"age": 2');
  });
});

describe("generateHttpFile name-based default values", () => {
  it("uses the property name as default for string body fields", () => {
    const endpoint = makeJsonBodyEndpoint(
      "POST",
      "/api/v1/items",
      makeObjectSchema({ name: { type: "string" } }),
    );
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain('"name": "name"');
  });

  it("uses the parameter name as default for array query params", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/api/v1/items",
      parameters: [{ name: "names", in: "query", schema: { type: "array" } }],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@names = names1%2Cnames2");
  });

  it("uses the property name as default for array body fields", () => {
    const endpoint = makeJsonBodyEndpoint(
      "POST",
      "/store",
      makeObjectSchema({ tags: { type: "array" } }),
    );
    const result = generateHttpFile(baseSpec, endpoint);

    // Array of primitives: multi-line JSON.stringify format with proper nesting
    expect(result).toMatch(/"tags":\s*\[\s*"tags1",\s*"tags2"\s*\]/s);
  });

  it("uses the parameter name as default for string query params (no schema)", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/api/v1/workspaces",
      parameters: [{ name: "Sort", in: "query", schema: { type: "string" } }],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@sort = sort");
  });
});

describe("generateHttpFile multi-type schemas", () => {
  it("treats type=[integer,string] as integer for query params", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/api/v1/workspaces",
      parameters: [
        {
          name: "OrganizationId",
          in: "query",
          schema: { type: ["integer", "string"], format: "int32" } as unknown as Record<
            string,
            unknown
          >,
        },
      ],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@organizationId = 1");
  });

  it("treats type=[integer,string] as integer for body fields", () => {
    const endpoint = makeJsonBodyEndpoint(
      "POST",
      "/api/v1/workspaces",
      makeObjectSchema({
        organizationId: { type: ["integer", "string"], format: "int32" },
      }),
    );
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain('"organizationId": 1');
  });

  it("treats type=[number,null] as number", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/values",
      parameters: [
        {
          name: "amount",
          in: "query",
          schema: { type: ["number", "null"] } as unknown as Record<string, unknown>,
        },
      ],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@amount = 1");
  });
});

describe("toCamelCase", () => {
  it("converts PascalCase to camelCase by lowercasing the first character", () => {
    expect(toCamelCase("UserId")).toBe("userId");
    expect(toCamelCase("PageSize")).toBe("pageSize");
    expect(toCamelCase("FirstName")).toBe("firstName");
  });

  it("leaves already-camelCase strings unchanged", () => {
    expect(toCamelCase("itemId")).toBe("itemId");
    expect(toCamelCase("q")).toBe("q");
    expect(toCamelCase("page")).toBe("page");
  });

  it("leaves snake_case strings unchanged", () => {
    expect(toCamelCase("user_id")).toBe("user_id");
    expect(toCamelCase("page_size")).toBe("page_size");
  });

  it("leaves kebab-case strings unchanged", () => {
    expect(toCamelCase("page-size")).toBe("page-size");
    expect(toCamelCase("max-results")).toBe("max-results");
  });

  it("returns an empty string unchanged", () => {
    expect(toCamelCase("")).toBe("");
  });
});

describe("generateHttpFile camelCase variable names", () => {
  it("converts PascalCase path param to camelCase in @var declaration and URL", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/users/{UserId}",
      parameters: [{ name: "UserId", in: "path", schema: { type: "integer" } }],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@userId = 1");
    expect(result).toContain("GET https://api.example.com/users/{{userId}}");
    expect(result).not.toContain("@UserId");
    expect(result).not.toContain("{{UserId}}");
  });

  it("leaves snake_case path param name unchanged in @var declaration and URL", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/users/{user_id}",
      parameters: [{ name: "user_id", in: "path", schema: { type: "integer" } }],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@user_id = 1");
    expect(result).toContain("GET https://api.example.com/users/{{user_id}}");
  });

  it("leaves kebab-case path param name unchanged in @var declaration and URL", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/items/{item-id}",
      parameters: [{ name: "item-id", in: "path" }],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@item-id = 1");
    expect(result).toContain("GET https://api.example.com/items/{{item-id}}");
  });

  it("converts PascalCase query param to camelCase in @var declaration and query string var reference", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/search",
      parameters: [{ name: "PageSize", in: "query", schema: { type: "integer" } }],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@pageSize = 1");
    expect(result).toContain("pageSize={{pageSize}}");
    expect(result).not.toContain("@PageSize");
    expect(result).not.toContain("{{PageSize}}");
  });

  it("leaves snake_case query param name unchanged in @var declaration and query string", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/search",
      parameters: [{ name: "page_size", in: "query", schema: { type: "integer" } }],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@page_size = 1");
    expect(result).toContain("page_size={{page_size}}");
  });

  it("leaves kebab-case query param name unchanged in @var declaration and query string", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/search",
      parameters: [{ name: "max-results", in: "query", schema: { type: "integer" } }],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@max-results = 1");
    expect(result).toContain("max-results={{max-results}}");
  });
});

describe("generateHttpFileContent", () => {
  it("includes the spec title header", () => {
    const endpoint: ParsedEndpoint = { method: "GET", path: "/items" };
    const result = generateHttpFileContent(baseSpec, [endpoint]);

    expect(result).toContain("# My API");
  });

  it("includes multiple endpoints joined", () => {
    const endpoints: ParsedEndpoint[] = [
      { method: "GET", path: "/items" },
      { method: "POST", path: "/items" },
    ];
    const result = generateHttpFileContent(baseSpec, endpoints);

    expect(result).toContain("GET https://api.example.com/items");
    expect(result).toContain("POST https://api.example.com/items");
  });

  it("includes base URL variable declaration", () => {
    const endpoint: ParsedEndpoint = { method: "GET", path: "/items" };
    const result = generateHttpFileContent(baseSpec, [endpoint]);

    expect(result).toContain("@baseUrl");
  });
});

describe("generateHttpFile nested object body generation", () => {
  it("expands a nested object property recursively", () => {
    const endpoint = makeJsonBodyEndpoint(
      "POST",
      "/items",
      makeObjectSchema({
        name: { type: "string" },
        count: { type: "number" },
        nested: makeObjectSchema({ id: { type: "integer" }, label: { type: "string" } }),
      }),
    );
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain('"name": "name"');
    expect(result).toContain('"count": 1');
    // Nested object is expanded, not collapsed to {}
    expect(result).toContain('"nested"');
    expect(result).toContain('"id": 1');
    expect(result).toContain('"label": "label"');
    expect(result).not.toContain('"nested": {}');
  });

  it("expands an array-of-objects property to a single template item", () => {
    const endpoint = makeJsonBodyEndpoint(
      "POST",
      "/items",
      makeObjectSchema({
        name: { type: "string" },
        children: {
          type: "array",
          items: makeObjectSchema({ count: { type: "integer" }, value: { type: "number" } }),
        },
      }),
    );
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain('"name": "name"');
    // children is an array of objects — should expand to [{…}]
    expect(result).toContain('"children"');
    expect(result).toContain('"count": 1');
    expect(result).toContain('"value": 1');
    // Should NOT collapse to an empty array or raw string array
    expect(result).not.toContain('"children": []');
    expect(result).not.toContain('"children1"');
  });

  it("handles three-level nesting", () => {
    const endpoint = makeJsonBodyEndpoint(
      "POST",
      "/items",
      makeObjectSchema({
        name: { type: "string" },
        children: {
          type: "array",
          items: makeObjectSchema({
            label: { type: "string" },
            count: { type: "number" },
            subItems: {
              type: "array",
              items: makeObjectSchema({ id: { type: "integer" }, value: { type: "string" } }),
            },
          }),
        },
      }),
    );
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain('"name": "name"');
    expect(result).toContain('"children"');
    expect(result).toContain('"label": "label"');
    expect(result).toContain('"count": 1');
    expect(result).toContain('"subItems"');
    expect(result).toContain('"id": 1');
    expect(result).toContain('"value": "value"');
  });

  it("falls back to {} for an object property without nested properties", () => {
    const endpoint = makeJsonBodyEndpoint(
      "POST",
      "/items",
      makeObjectSchema({ metadata: { type: "object" } }),
    );
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain('"metadata": {}');
  });

  it("falls back to primitive-name array for an array property without object items", () => {
    const endpoint = makeJsonBodyEndpoint(
      "POST",
      "/items",
      makeObjectSchema({ tags: { type: "array", items: { type: "string" } } }),
    );
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toMatch(/"tags":\s*\[\s*"tags1",\s*"tags2"\s*\]/s);
  });

  it("uses item example/enum for a primitive-item array property", () => {
    const endpoint = makeJsonBodyEndpoint(
      "POST",
      "/items",
      makeObjectSchema({
        statuses: { type: "array", items: { type: "string", enum: ["active", "inactive"] } },
        ids: { type: "array", items: { type: "integer", example: 42 } },
      }),
    );
    const result = generateHttpFile(baseSpec, endpoint);

    // Enum: first value used as the single item
    expect(result).toMatch(/"statuses":\s*\[\s*"active"\s*\]/s);
    // Example: used as the single item
    expect(result).toMatch(/"ids":\s*\[\s*42\s*\]/s);
  });

  it("uses [{}] for an array property whose object items have no properties", () => {
    const endpoint = makeJsonBodyEndpoint(
      "POST",
      "/items",
      makeObjectSchema({ attachments: { type: "array", items: { type: "object" } } }),
    );
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toMatch(/"attachments":\s*\[\s*\{\s*\}\s*\]/s);
  });

  it("generates a top-level array body as a single template item", () => {
    const endpoint = makeJsonBodyEndpoint("POST", "/api/items/bulk", {
      type: "array",
      items: makeObjectSchema({ name: { type: "string" }, count: { type: "number" } }),
    });
    const result = generateHttpFile(baseSpec, endpoint);

    // Body should be an array with a template item
    expect(result).toContain('"name": "name"');
    expect(result).toContain('"count": 1');
    // Should be wrapped in an array
    const bodyMatch = result.match(/\n(\[[\s\S]*\])\n/);
    expect(bodyMatch).toBeTruthy();
    const body = JSON.parse(bodyMatch![1]);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0]).toEqual({ name: "name", count: 1 });
  });

  it("generates [{}] for a top-level array body whose items have no properties", () => {
    const endpoint = makeJsonBodyEndpoint("POST", "/bulk", {
      type: "array",
      items: { type: "object" },
    });
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toMatch(/\[\s*\{\s*\}\s*\]/s);
  });

  it("merges properties from both direct properties and allOf", () => {
    // Schema has its own `properties` AND inherits from a base schema via `allOf`.
    // Both sources must appear in the generated body.
    const endpoint = makeJsonBodyEndpoint("POST", "/api/items", {
      type: "object",
      // Simulates a dereferenced $ref to a base schema
      allOf: [makeObjectSchema({ baseFieldA: { type: "string" }, baseFieldB: { type: "string" } })],
      properties: { count: { type: "integer" }, name: { type: "string" } },
      additionalProperties: false,
    });
    const result = generateHttpFile(baseSpec, endpoint);

    // Own properties must be present
    expect(result).toContain('"count": 1');
    expect(result).toContain('"name": "name"');
    // Inherited properties from allOf must also be present
    expect(result).toContain('"baseFieldA": "baseFieldA"');
    expect(result).toContain('"baseFieldB": "baseFieldB"');
  });

  it("merges properties from allOf with nested objects that also have both properties and allOf", () => {
    const endpoint = makeJsonBodyEndpoint("POST", "/api/items", {
      type: "object",
      allOf: [makeObjectSchema({ baseField: { type: "string" } })],
      properties: {
        count: { type: "integer" },
        nested: {
          type: "object",
          allOf: [
            makeObjectSchema({ baseNested: { type: "string" }, nestedField: { type: "string" } }),
          ],
          properties: { ownNested: { type: "string" } },
        },
      },
    });
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain('"baseField": "baseField"');
    expect(result).toContain('"count": 1');
    expect(result).toContain('"baseNested": "baseNested"');
    expect(result).toContain('"nestedField": "nestedField"');
    expect(result).toContain('"ownNested": "ownNested"');
  });
});
