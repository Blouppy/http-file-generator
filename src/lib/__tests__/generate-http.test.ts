import { generateHttpFile, generateHttpFileContent, toCamelCase } from "@/lib/generate-http";
import type { ParsedSpec, ParsedEndpoint } from "@/types/openapi";

const baseSpec: ParsedSpec = {
  title: "My API",
  version: "2.0",
  baseUrl: "https://api.example.com",
  endpoints: [],
};

describe("generateHttpFile", () => {
  it("generates a GET request with correct method and path", () => {
    const endpoint: ParsedEndpoint = { method: "GET", path: "/items" };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("GET https://api.example.com/items");
  });

  it("generates a POST request with Content-Type header", () => {
    const endpoint: ParsedEndpoint = {
      method: "POST",
      path: "/items",
      requestBody: {
        content: {
          "application/json": {
            schema: { type: "object", properties: { name: { type: "string" } } },
          },
        },
      },
    };
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

  it("uses string default for query params without a schema", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/search",
      parameters: [{ name: "q", in: "query" }],
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain("@q = text");
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
    const endpoint: ParsedEndpoint = {
      method: "POST",
      path: "/users",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                age: { type: "integer" },
              },
            },
          },
        },
      },
    };
    const result = generateHttpFile(baseSpec, endpoint);
    // No @var declarations for body-only fields
    expect(result).not.toContain("@name");
    expect(result).not.toContain("@age");
    // Body uses literal values, NOT {{var}} references
    expect(result).toContain('"name": ""');
    expect(result).toContain('"age": 0');
    expect(result).not.toContain('"name": {{name}}');
    expect(result).not.toContain('"age": {{age}}');
  });

  it("uses enum first value as literal in the body", () => {
    const endpoint: ParsedEndpoint = {
      method: "POST",
      path: "/issues",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                priority: { type: "string", enum: ["Low", "Medium", "High"] },
                count: { type: "integer" },
              } as Record<string, unknown>,
            } as Record<string, unknown>,
          },
        },
      },
    };
    const result = generateHttpFile(baseSpec, endpoint);

    expect(result).toContain('"priority": "Low"');
    expect(result).toContain('"count": 0');
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

    expect(result).toContain("@ids = value1%2Cvalue2");
  });

  it("does not emit @var for body fields; only path/query params get @var declarations", () => {
    const endpoint: ParsedEndpoint = {
      method: "PUT",
      path: "/projects/{id}",
      parameters: [{ name: "id", in: "path", schema: { type: "integer" } }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
          },
        },
      },
    };
    const result = generateHttpFile(baseSpec, endpoint);

    // Only path param @id = 1; no @name for body field
    expect(result).toContain("@id = 1");
    expect(result).not.toContain("@name");
    // Body uses literal values
    expect(result).toContain('"id": 0');
    expect(result).toContain('"name": ""');
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
    const endpoint: ParsedEndpoint = {
      method: "POST",
      path: "/projects",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              allOf: [
                {
                  type: "object",
                  properties: { id: { type: "integer" }, name: { type: "string" } },
                },
              ],
            } as Record<string, unknown>,
          },
        },
      },
    };
    const result = generateHttpFile(baseSpec, endpoint);

    // No @var declarations for body-only fields
    expect(result).not.toContain("@id");
    expect(result).not.toContain("@name");
    // Body uses literal values
    expect(result).toContain('"id": 0');
    expect(result).toContain('"name": ""');
  });

  it("generates body from anyOf schema using the first entry with properties", () => {
    const endpoint: ParsedEndpoint = {
      method: "PUT",
      path: "/items/{id}",
      parameters: [{ name: "id", in: "path", schema: { type: "integer" } }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              anyOf: [{ type: "object", properties: { label: { type: "string" } } }],
            } as Record<string, unknown>,
          },
        },
      },
    };
    const result = generateHttpFile(baseSpec, endpoint);

    // @id declared for path param; @label not declared (body field)
    expect(result).toContain("@id = 1");
    expect(result).not.toContain("@label");
    expect(result).toContain('"label": ""');
    expect(result).not.toContain('"label": {{label}}');
  });

  it("merges properties from multiple allOf entries", () => {
    const endpoint: ParsedEndpoint = {
      method: "POST",
      path: "/users",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              allOf: [
                { type: "object", properties: { firstName: { type: "string" } } },
                { type: "object", properties: { age: { type: "integer" } } },
              ],
            } as Record<string, unknown>,
          },
        },
      },
    };
    const result = generateHttpFile(baseSpec, endpoint);

    // No @var for body fields
    expect(result).not.toContain("@firstName");
    expect(result).not.toContain("@age");
    // Body uses literal values
    expect(result).toContain('"firstName": ""');
    expect(result).toContain('"age": 0');
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
            schema: {
              type: "object",
              properties: { username: { type: "string" } },
            },
          },
        },
      },
    };
    const result = generateHttpFile(baseSpec, endpoint);

    // No @var for body-only field
    expect(result).not.toContain("@username");
    expect(result).toContain('"username": ""');
    expect(result).not.toContain('"username": {{username}}');
  });

  it("generates body from schema when content-type key uses a json suffix (+json)", () => {
    const endpoint: ParsedEndpoint = {
      method: "POST",
      path: "/resources",
      requestBody: {
        content: {
          "application/vnd.api+json": {
            schema: {
              type: "object",
              properties: { title: { type: "string" } },
            },
          },
        },
      },
    };
    const result = generateHttpFile(baseSpec, endpoint);

    // No @var for body-only field
    expect(result).not.toContain("@title");
    expect(result).toContain('"title": ""');
    expect(result).not.toContain('"title": {{title}}');
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
