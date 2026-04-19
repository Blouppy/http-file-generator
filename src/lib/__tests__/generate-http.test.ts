import { generateHttpFile, generateHttpFileContent } from "@/lib/generate-http";
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
    expect(result).toContain('@q = ""');
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

  it("declares variables for body properties when no example is provided", () => {
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
    expect(result).toContain('@name = ""');
    expect(result).toContain("@age = 1");
  });

  it("uses variable references in the body template", () => {
    const endpoint: ParsedEndpoint = {
      method: "POST",
      path: "/users",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { username: { type: "string" } },
            },
          },
        },
      },
    };
    const result = generateHttpFile(baseSpec, endpoint);
    expect(result).toContain('"username": {{username}}');
  });

  it("does not redeclare a path param variable when it also appears as a body field", () => {
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
    // @id = 1 should appear only once
    const declarations = result.match(/@id = 1/g) ?? [];
    expect(declarations).toHaveLength(1);
    expect(result).toContain("@id = 1");
    expect(result).toContain('@name = ""');
    // Both body fields should still reference the variable
    expect(result).toContain('"id": {{id}}');
    expect(result).toContain('"name": {{name}}');
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

  it("includes the summary as label", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/items",
      summary: "List all items",
    };
    const result = generateHttpFile(baseSpec, endpoint);
    expect(result).toContain("### List all items");
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
