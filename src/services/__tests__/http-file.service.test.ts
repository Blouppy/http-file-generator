import { slugify, generateForEndpoints, buildZip, deriveZipPath } from "@/services/http-file.service";
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

describe("deriveZipPath", () => {
  it("places a top-level resource in its own folder", () => {
    const endpoints: ParsedEndpoint[] = [{ method: "GET", path: "/workspaces" }];
    expect(deriveZipPath("workspaces", endpoints)).toBe("workspaces/workspaces.http");
  });

  it("places a nested resource in a deep sub-folder mirroring the URL hierarchy", () => {
    const endpoints: ParsedEndpoint[] = [
      { method: "GET", path: "/api/workspaces/{workspaceId}/labels" },
      { method: "POST", path: "/api/workspaces/{workspaceId}/labels" },
    ];
    expect(deriveZipPath("labels", endpoints)).toBe("workspaces/labels/labels.http");
  });

  it("strips API and version prefixes", () => {
    const endpoints: ParsedEndpoint[] = [{ method: "GET", path: "/api/v1/users" }];
    expect(deriveZipPath("users", endpoints)).toBe("users/users.http");
  });

  it("falls back to a flat file when no meaningful segment is found", () => {
    const endpoints: ParsedEndpoint[] = [{ method: "GET", path: "/" }];
    expect(deriveZipPath("misc", endpoints)).toBe("misc.http");
  });

  it("falls back to a flat file for an empty endpoint list", () => {
    expect(deriveZipPath("empty", [])).toBe("empty.http");
  });

  it("uses the common prefix when endpoints have differing depths", () => {
    const endpoints: ParsedEndpoint[] = [
      { method: "GET", path: "/workspaces" },
      { method: "GET", path: "/workspaces/{id}" },
      { method: "GET", path: "/workspaces/{id}/details" },
    ];
    expect(deriveZipPath("workspaces", endpoints)).toBe("workspaces/workspaces.http");
  });

  it("creates multiple folder levels when all endpoints share a deep path prefix", () => {
    const endpoints: ParsedEndpoint[] = [
      { method: "GET", path: "/api/workspaces/{id}/labels" },
      { method: "DELETE", path: "/api/workspaces/{id}/labels/{labelId}" },
    ];
    // Both share the prefix: workspaces/labels
    expect(deriveZipPath("labels", endpoints)).toBe("workspaces/labels/labels.http");
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
