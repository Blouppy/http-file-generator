import {
  getEndpointId,
  groupEndpointsByTag,
  filterEndpoints,
  parseSpecFromUrl,
  URL_VALIDATION_ERROR,
  URL_FETCH_ERROR,
} from "@/services/openapi.service";
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
    const result = filterEndpoints(endpoints, {
      ...noFilters,
      methods: new Set(["GET", "DELETE"]),
    });

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
    expect(result[0]).toMatchObject({ method: "POST", path: "/users" });
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
    expect(result[0]).toMatchObject({ path: "/misc" });
  });
});

const MINIMAL_SPEC = JSON.stringify({
  openapi: "3.0.0",
  info: { title: "Test API", version: "2.0.0" },
  paths: {},
});

describe("parseSpecFromUrl", () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  it(`throws ${URL_VALIDATION_ERROR} for a malformed URL`, async () => {
    await expect(parseSpecFromUrl("not a url")).rejects.toThrow(URL_VALIDATION_ERROR);
  });

  it(`throws ${URL_VALIDATION_ERROR} for a non-HTTP(S) URL`, async () => {
    await expect(parseSpecFromUrl("ftp://example.com/spec.json")).rejects.toThrow(
      URL_VALIDATION_ERROR,
    );
  });

  it(`throws ${URL_FETCH_ERROR} when fetch throws`, async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    await expect(parseSpecFromUrl("https://example.com/spec.json")).rejects.toThrow(
      URL_FETCH_ERROR,
    );
  });

  it(`throws ${URL_FETCH_ERROR} when the response status is not OK`, async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    await expect(parseSpecFromUrl("https://example.com/spec.json")).rejects.toThrow(
      URL_FETCH_ERROR,
    );
  });

  it("parses a valid JSON spec fetched from a URL", async () => {
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(MINIMAL_SPEC) });

    const result = await parseSpecFromUrl("https://example.com/openapi.json");

    expect(result.title).toBe("Test API");
    expect(result.version).toBe("2.0.0");
  });

  it("infers JSON format when the URL has no recognised extension", async () => {
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(MINIMAL_SPEC) });

    const result = await parseSpecFromUrl("https://example.com/api/v3/openapi");

    expect(result.title).toBe("Test API");
  });

  it("accepts an http:// URL", async () => {
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(MINIMAL_SPEC) });

    const result = await parseSpecFromUrl("http://example.com/spec.json");

    expect(result.title).toBe("Test API");
  });
});
