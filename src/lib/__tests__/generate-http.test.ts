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

  it("substitutes path parameters", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/users/{id}",
      parameters: [{ name: "id", in: "path" }],
    };
    const result = generateHttpFile(baseSpec, endpoint);
    expect(result).toContain("/users/{{id}}");
    // The label may still contain the original path but the URL line should be substituted
    expect(result).toContain("GET https://api.example.com/users/{{id}}");
  });

  it("includes query parameters", () => {
    const endpoint: ParsedEndpoint = {
      method: "GET",
      path: "/search",
      parameters: [
        { name: "q", in: "query", schema: { type: "string" } },
        { name: "page", in: "query", schema: { type: "integer" } },
      ],
    };
    const result = generateHttpFile(baseSpec, endpoint);
    expect(result).toContain("q=");
    expect(result).toContain("page=");
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
