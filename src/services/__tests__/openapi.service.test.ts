import { getEndpointId, groupEndpointsByTag, filterEndpoints } from "@/services/openapi.service";
import type { ParsedEndpoint } from "@/types/openapi";

const makeEndpoint = (method: string, path: string, tags?: string[]): ParsedEndpoint => ({
  method,
  path,
  tags,
});

describe("getEndpointId", () => {
  it("returns METHOD:path format", () => {
    const endpoint = makeEndpoint("GET", "/users");
    expect(getEndpointId(endpoint)).toBe("GET:/users");
  });

  it("works with POST and nested path", () => {
    const endpoint = makeEndpoint("POST", "/users/{id}/posts");
    expect(getEndpointId(endpoint)).toBe("POST:/users/{id}/posts");
  });
});

describe("groupEndpointsByTag", () => {
  it("groups endpoints by their first tag", () => {
    const endpoints: ParsedEndpoint[] = [
      makeEndpoint("GET", "/users", ["users"]),
      makeEndpoint("POST", "/users", ["users"]),
      makeEndpoint("GET", "/posts", ["posts"]),
    ];
    const groups = groupEndpointsByTag(endpoints);
    expect(Object.keys(groups)).toEqual(["users", "posts"]);
    expect(groups["users"]).toHaveLength(2);
    expect(groups["posts"]).toHaveLength(1);
  });

  it("falls back to 'Other' when no tags", () => {
    const endpoints: ParsedEndpoint[] = [
      makeEndpoint("GET", "/untagged"),
      makeEndpoint("POST", "/also-untagged", []),
    ];
    const groups = groupEndpointsByTag(endpoints);
    expect(groups["Other"]).toHaveLength(2);
  });

  it("mixes tagged and untagged endpoints", () => {
    const endpoints: ParsedEndpoint[] = [
      makeEndpoint("GET", "/users", ["users"]),
      makeEndpoint("DELETE", "/misc"),
    ];
    const groups = groupEndpointsByTag(endpoints);
    expect(groups["users"]).toHaveLength(1);
    expect(groups["Other"]).toHaveLength(1);
  });
});

describe("filterEndpoints", () => {
  const endpoints: ParsedEndpoint[] = [
    { method: "GET", path: "/users", tags: ["users"], summary: "List users" },
    { method: "POST", path: "/users", tags: ["users"], summary: "Create user" },
    { method: "GET", path: "/users/{id}", tags: ["users"], operationId: "getUserById" },
    { method: "DELETE", path: "/users/{id}", tags: ["users"] },
    { method: "GET", path: "/projects", tags: ["projects"], summary: "List projects" },
    { method: "POST", path: "/projects", tags: ["projects"] },
  ];

  const noFilters = { searchText: "", methods: new Set<string>(), tags: new Set<string>() };

  it("returns all endpoints when no filters are set", () => {
    expect(filterEndpoints(endpoints, noFilters)).toHaveLength(endpoints.length);
  });

  it("filters by search text on path", () => {
    const result = filterEndpoints(endpoints, { ...noFilters, searchText: "projects" });
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.path.includes("projects"))).toBe(true);
  });

  it("filters by search text on summary (case-insensitive)", () => {
    const result = filterEndpoints(endpoints, { ...noFilters, searchText: "LIST" });
    expect(result).toHaveLength(2);
  });

  it("filters by search text on operationId", () => {
    const result = filterEndpoints(endpoints, { ...noFilters, searchText: "getUserById" });
    expect(result).toHaveLength(1);
    expect(result[0].operationId).toBe("getUserById");
  });

  it("filters by method", () => {
    const result = filterEndpoints(endpoints, { ...noFilters, methods: new Set(["DELETE"]) });
    expect(result).toHaveLength(1);
    expect(result[0].method).toBe("DELETE");
  });

  it("filters by multiple methods", () => {
    const result = filterEndpoints(endpoints, { ...noFilters, methods: new Set(["GET", "DELETE"]) });
    expect(result.every((e) => ["GET", "DELETE"].includes(e.method))).toBe(true);
    expect(result).toHaveLength(4);
  });

  it("filters by tag", () => {
    const result = filterEndpoints(endpoints, { ...noFilters, tags: new Set(["projects"]) });
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.tags?.[0] === "projects")).toBe(true);
  });

  it("combines search text and method filters", () => {
    const result = filterEndpoints(endpoints, {
      searchText: "users",
      methods: new Set(["POST"]),
      tags: new Set<string>(),
    });
    expect(result).toHaveLength(1);
    expect(result[0].method).toBe("POST");
    expect(result[0].path).toBe("/users");
  });

  it("returns empty array when no endpoints match", () => {
    const result = filterEndpoints(endpoints, { ...noFilters, searchText: "nonexistent" });
    expect(result).toHaveLength(0);
  });

  it("handles endpoints without tags using 'Other' for tag filter", () => {
    const untagged: ParsedEndpoint[] = [
      { method: "GET", path: "/misc" },
      { method: "GET", path: "/users", tags: ["users"] },
    ];
    const result = filterEndpoints(untagged, { ...noFilters, tags: new Set(["Other"]) });
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("/misc");
  });
});
