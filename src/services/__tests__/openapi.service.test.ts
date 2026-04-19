import { getEndpointId, groupEndpointsByTag } from "@/services/openapi.service";
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
