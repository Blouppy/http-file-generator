import {
  slugify,
  generateForEndpoints,
  buildZip,
  splitEndpointsByParentPath,
} from "@/services/http-file.service";
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

describe("splitEndpointsByParentPath", () => {
  it("places a top-level resource in its own folder", () => {
    const endpoints: ParsedEndpoint[] = [{ method: "GET", path: "/workspaces" }];
    const result = splitEndpointsByParentPath("workspaces", endpoints);
    expect(result).toHaveLength(1);
    expect(result[0].zipPath).toBe("workspaces/workspaces.http");
  });

  it("places a nested resource in a deep sub-folder mirroring the URL hierarchy", () => {
    const endpoints: ParsedEndpoint[] = [
      { method: "GET", path: "/api/workspaces/{workspaceId}/labels" },
      { method: "POST", path: "/api/workspaces/{workspaceId}/labels" },
    ];
    const result = splitEndpointsByParentPath("labels", endpoints);
    expect(result).toHaveLength(1);
    expect(result[0].zipPath).toBe("workspaces/labels/labels.http");
  });

  it("strips API and version prefixes", () => {
    const endpoints: ParsedEndpoint[] = [{ method: "GET", path: "/api/v1/users" }];
    const result = splitEndpointsByParentPath("users", endpoints);
    expect(result).toHaveLength(1);
    expect(result[0].zipPath).toBe("users/users.http");
  });

  it("groups all same-parent endpoints into one entry", () => {
    const endpoints: ParsedEndpoint[] = [
      { method: "GET", path: "/workspaces" },
      { method: "GET", path: "/workspaces/{id}" },
    ];
    const result = splitEndpointsByParentPath("workspaces", endpoints);
    expect(result).toHaveLength(1);
    expect(result[0].zipPath).toBe("workspaces/workspaces.http");
    expect(result[0].endpoints).toHaveLength(2);
  });

  it("splits a tag into multiple files when endpoints span different parent paths", () => {
    // "issues" appears both at root and nested under "projects"
    const endpoints: ParsedEndpoint[] = [
      { method: "GET", path: "/api/v1/issues" },
      { method: "POST", path: "/api/v1/issues" },
      { method: "GET", path: "/api/v1/projects/{id}/issues" },
    ];
    const result = splitEndpointsByParentPath("issues", endpoints);
    expect(result).toHaveLength(2);
    // Root context comes first
    expect(result[0].zipPath).toBe("issues/issues.http");
    expect(result[0].endpoints).toHaveLength(2);
    // Nested under "projects"
    expect(result[1].zipPath).toBe("projects/issues/issues.http");
    expect(result[1].endpoints).toHaveLength(1);
  });

  it("handles a tag with deeply nested endpoints", () => {
    const endpoints: ParsedEndpoint[] = [
      { method: "GET", path: "/api/workspaces/{id}/labels" },
      { method: "DELETE", path: "/api/workspaces/{id}/labels/{labelId}" },
    ];
    const result = splitEndpointsByParentPath("labels", endpoints);
    expect(result).toHaveLength(1);
    expect(result[0].zipPath).toBe("workspaces/labels/labels.http");
  });

  it("returns a single entry with tag-as-folder when the path has no meaningful segments", () => {
    const endpoints: ParsedEndpoint[] = [{ method: "GET", path: "/" }];
    const result = splitEndpointsByParentPath("misc", endpoints);
    expect(result).toHaveLength(1);
    expect(result[0].zipPath).toBe("misc/misc.http");
  });

  it("returns an empty array for an empty endpoint list", () => {
    const result = splitEndpointsByParentPath("empty", []);
    expect(result).toHaveLength(0);
  });

  it("returns entries in stable order (root parent first, then alphabetical)", () => {
    const endpoints: ParsedEndpoint[] = [
      { method: "GET", path: "/api/v1/projects/{id}/issues" },
      { method: "GET", path: "/api/v1/issues" },
      { method: "GET", path: "/api/v1/categories/{id}/issues" },
    ];
    const result = splitEndpointsByParentPath("issues", endpoints);
    expect(result).toHaveLength(3);
    expect(result[0].zipPath).toBe("issues/issues.http"); // root first
    expect(result[1].zipPath).toBe("categories/issues/issues.http"); // then alphabetical
    expect(result[2].zipPath).toBe("projects/issues/issues.http");
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

  it("creates multiple ZIP entries when a tag has endpoints under different parent paths", async () => {
    const endpointsByTag = {
      issues: [
        { method: "GET", path: "/api/v1/issues" },
        { method: "GET", path: "/api/v1/projects/{id}/issues" },
      ],
    };
    const blob = await buildZip(testSpec, endpointsByTag);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });
});
