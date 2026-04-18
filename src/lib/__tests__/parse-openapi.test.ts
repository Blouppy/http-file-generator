import { parseOpenAPISpec } from "@/lib/parse-openapi";

jest.mock("@apidevtools/swagger-parser", () => ({
  __esModule: true,
  default: {
    dereference: jest.fn(async (spec: unknown) => spec),
  },
}));

const makeSpec = (overrides = {}) => ({
  info: { title: "Test API", version: "1.0.0" },
  servers: [{ url: "https://api.example.com" }],
  paths: {},
  ...overrides,
});

describe("parseOpenAPISpec", () => {
  it("parses JSON content", async () => {
    const spec = makeSpec();
    const result = await parseOpenAPISpec(JSON.stringify(spec), "spec.json");
    expect(result.title).toBe("Test API");
    expect(result.version).toBe("1.0.0");
    expect(result.baseUrl).toBe("https://api.example.com");
  });

  it("parses YAML content", async () => {
    const yaml = `
info:
  title: YAML API
  version: "2.0"
servers:
  - url: https://yaml.example.com
paths: {}
`;
    const result = await parseOpenAPISpec(yaml, "spec.yaml");
    expect(result.title).toBe("YAML API");
    expect(result.version).toBe("2.0");
    expect(result.baseUrl).toBe("https://yaml.example.com");
  });

  it("parses .yml extension as YAML", async () => {
    const yaml = `
info:
  title: YML API
  version: "3.0"
servers:
  - url: https://yml.example.com
paths: {}
`;
    const result = await parseOpenAPISpec(yaml, "spec.yml");
    expect(result.title).toBe("YML API");
  });

  it("uses defaults when info is missing", async () => {
    const spec = { paths: {} };
    const result = await parseOpenAPISpec(JSON.stringify(spec), "spec.json");
    expect(result.title).toBe("API");
    expect(result.version).toBe("1.0.0");
    expect(result.baseUrl).toBe("{{baseUrl}}");
  });

  it("extracts endpoints from paths", async () => {
    const spec = makeSpec({
      paths: {
        "/users": {
          get: { summary: "List users", tags: ["users"] },
          post: { summary: "Create user", tags: ["users"] },
        },
        "/users/{id}": {
          get: { summary: "Get user" },
          delete: { summary: "Delete user" },
        },
      },
    });
    const result = await parseOpenAPISpec(JSON.stringify(spec), "spec.json");
    expect(result.endpoints).toHaveLength(4);
    const methods = result.endpoints.map((e) => e.method);
    expect(methods).toContain("GET");
    expect(methods).toContain("POST");
    expect(methods).toContain("DELETE");
  });

  it("sets endpoint path and method correctly", async () => {
    const spec = makeSpec({
      paths: {
        "/items": {
          get: { summary: "List items" },
        },
      },
    });
    const result = await parseOpenAPISpec(JSON.stringify(spec), "spec.json");
    expect(result.endpoints[0].path).toBe("/items");
    expect(result.endpoints[0].method).toBe("GET");
    expect(result.endpoints[0].summary).toBe("List items");
  });
});
