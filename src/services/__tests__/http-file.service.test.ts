import { slugify, generateForEndpoints, buildZip } from "@/services/http-file.service";
import type { ParsedSpec, ParsedEndpoint } from "@/types/openapi";

const testSpec: ParsedSpec = {
  title: "Test API",
  version: "1.0.0",
  baseUrl: "https://api.example.com",
  endpoints: [],
};

const testEndpoint: ParsedEndpoint = {
  method: "GET",
  path: "/users",
  summary: "List users",
};

describe("slugify", () => {
  it("replaces spaces with hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("lowercases input", () => {
    expect(slugify("MyAPI")).toBe("myapi");
  });

  it("handles already lowercase with no spaces", () => {
    expect(slugify("alreadylower")).toBe("alreadylower");
  });

  it("handles multiple spaces (collapses to single hyphen)", () => {
    expect(slugify("a  b  c")).toBe("a-b-c");
  });
});

describe("generateForEndpoints", () => {
  it("includes the HTTP method in the output", () => {
    const result = generateForEndpoints(testSpec, [testEndpoint]);
    expect(result).toContain("GET");
  });

  it("includes the path in the output", () => {
    const result = generateForEndpoints(testSpec, [testEndpoint]);
    expect(result).toContain("/users");
  });

  it("includes spec title header", () => {
    const result = generateForEndpoints(testSpec, [testEndpoint]);
    expect(result).toContain("Test API");
  });

  it("returns empty body section for no endpoints", () => {
    const result = generateForEndpoints(testSpec, []);
    expect(result).toContain("Test API");
    expect(result).not.toContain("/users");
  });
});

describe("buildZip", () => {
  it("returns a Blob", async () => {
    const endpointsByTag = { users: [testEndpoint] };
    const blob = await buildZip(testSpec, endpointsByTag);
    expect(blob).toBeInstanceOf(Blob);
  });

  it("handles multiple tags", async () => {
    const endpointsByTag = {
      users: [testEndpoint],
      posts: [{ method: "POST", path: "/posts" }],
    };
    const blob = await buildZip(testSpec, endpointsByTag);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });
});
