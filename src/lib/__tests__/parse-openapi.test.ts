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

    expect(result).toMatchObject({
      title: "Test API",
      version: "1.0.0",
      baseUrl: "https://api.example.com",
    });
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

    expect(result).toMatchObject({
      title: "YAML API",
      version: "2.0",
      baseUrl: "https://yaml.example.com",
    });
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

    expect(result).toMatchObject({
      title: "API",
      version: "1.0.0",
      baseUrl: "{{baseUrl}}",
    });
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

    expect(result.endpoints[0]).toMatchObject({
      path: "/items",
      method: "GET",
      summary: "List items",
    });
  });

  describe("schema annotation", () => {
    it("annotates direct $ref properties with schemaName", async () => {
      const spec = makeSpec({
        components: {
          schemas: {
            UserDto: { type: "object", properties: { id: { type: "string" } } },
            OrderDto: {
              type: "object",
              properties: { user: { $ref: "#/components/schemas/UserDto" } },
            },
          },
        },
      });
      const result = await parseOpenAPISpec(JSON.stringify(spec), "spec.json");

      expect(result.schemas?.OrderDto?.properties?.user?.schemaName).toBe("UserDto");
    });

    it("annotates array items with schemaName", async () => {
      const spec = makeSpec({
        components: {
          schemas: {
            LabelDto: { type: "object", properties: { name: { type: "string" } } },
            IssueDto: {
              type: "object",
              properties: {
                labels: { type: "array", items: { $ref: "#/components/schemas/LabelDto" } },
              },
            },
          },
        },
      });
      const result = await parseOpenAPISpec(JSON.stringify(spec), "spec.json");

      expect(result.schemas?.IssueDto?.properties?.labels?.items?.schemaName).toBe("LabelDto");
    });

    it("annotates oneOf nullable properties with schemaName and flattens the referenced schema", async () => {
      const spec = makeSpec({
        components: {
          schemas: {
            Priority: { enum: ["Low", "High"] },
            UserDto: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
            IssueDto: {
              type: "object",
              properties: {
                assignee: { oneOf: [{ type: "null" }, { $ref: "#/components/schemas/UserDto" }] },
                priority: { oneOf: [{ type: "null" }, { $ref: "#/components/schemas/Priority" }] },
              },
            },
          },
        },
      });
      const result = await parseOpenAPISpec(JSON.stringify(spec), "spec.json");

      const assignee = result.schemas?.IssueDto?.properties?.assignee;
      expect(assignee?.schemaName).toBe("UserDto");
      expect(assignee?.type).toBe("object");
      expect(assignee?.properties).toBeDefined();

      const priority = result.schemas?.IssueDto?.properties?.priority;
      expect(priority?.schemaName).toBe("Priority");
      expect(priority?.enum).toEqual(["Low", "High"]);
    });

    it("preserves OpenAPI 3.1 type arrays on schema properties", async () => {
      const spec = makeSpec({
        components: {
          schemas: {
            ActivityDto: {
              type: "object",
              properties: { id: { type: ["integer", "string"], format: "int32" } },
            },
          },
        },
      });
      const result = await parseOpenAPISpec(JSON.stringify(spec), "spec.json");

      expect(result.schemas?.ActivityDto?.properties?.id?.type).toEqual(["integer", "string"]);
    });
  });
});
