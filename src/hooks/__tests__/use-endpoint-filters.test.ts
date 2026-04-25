/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useEndpointFilters } from "@/hooks/use-endpoint-filters";
import type { ParsedEndpoint } from "@/types/openapi";

const makeEndpoint = (method: string, path: string, tags?: string[]): ParsedEndpoint => ({
  method,
  path,
  tags,
});

const endpoints: ParsedEndpoint[] = [
  makeEndpoint("GET", "/users", ["users"]),
  makeEndpoint("POST", "/users", ["users"]),
  makeEndpoint("DELETE", "/users/{id}", ["users"]),
  makeEndpoint("GET", "/projects", ["projects"]),
  makeEndpoint("POST", "/projects", ["projects"]),
];

describe("useEndpointFilters", () => {
  it("returns all endpoints when no filters are active", () => {
    const { result } = renderHook(() => useEndpointFilters(endpoints));
    const allEndpoints = Object.values(result.current.filteredEndpointsByTag).flat();

    expect(allEndpoints).toHaveLength(endpoints.length);
  });

  it("derives availableMethods from the provided endpoints", () => {
    const { result } = renderHook(() => useEndpointFilters(endpoints));

    expect(result.current.availableMethods).toEqual(["DELETE", "GET", "POST"]);
  });

  it("derives availableTags from the provided endpoints", () => {
    const { result } = renderHook(() => useEndpointFilters(endpoints));

    expect(result.current.availableTags).toEqual(["projects", "users"]);
  });

  it("filters by searchText", () => {
    const { result } = renderHook(() => useEndpointFilters(endpoints));

    act(() => result.current.setSearchText("projects"));

    const allEndpoints = Object.values(result.current.filteredEndpointsByTag).flat();

    expect(allEndpoints).toHaveLength(2);
    expect(allEndpoints.every((e) => e.path.includes("projects"))).toBe(true);
  });

  it("filters by method after handleMethodToggle", () => {
    const { result } = renderHook(() => useEndpointFilters(endpoints));

    act(() => result.current.handleMethodToggle("DELETE"));

    const allEndpoints = Object.values(result.current.filteredEndpointsByTag).flat();

    expect(allEndpoints).toHaveLength(1);
    expect(allEndpoints[0].method).toBe("DELETE");
  });

  it("filters by tag after handleTagToggle", () => {
    const { result } = renderHook(() => useEndpointFilters(endpoints));

    act(() => result.current.handleTagToggle("projects"));

    const allEndpoints = Object.values(result.current.filteredEndpointsByTag).flat();

    expect(allEndpoints).toHaveLength(2);
    expect(allEndpoints.every((e) => e.tags?.[0] === "projects")).toBe(true);
  });

  it("clears all filters with handleClearFilters", () => {
    const { result } = renderHook(() => useEndpointFilters(endpoints));

    act(() => {
      result.current.setSearchText("users");
      result.current.handleMethodToggle("GET");
    });

    act(() => result.current.handleClearFilters());

    const allEndpoints = Object.values(result.current.filteredEndpointsByTag).flat();

    expect(allEndpoints).toHaveLength(endpoints.length);
    expect(result.current.searchText).toBe("");
    expect(result.current.selectedMethods.size).toBe(0);
  });

  it("reports hasActiveFilters correctly", () => {
    const { result } = renderHook(() => useEndpointFilters(endpoints));

    expect(result.current.hasActiveFilters).toBe(false);

    act(() => result.current.setSearchText("x"));

    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.handleClearFilters());

    expect(result.current.hasActiveFilters).toBe(false);
  });

  it("toggles a method off when handleMethodToggle is called twice", () => {
    const { result } = renderHook(() => useEndpointFilters(endpoints));

    act(() => result.current.handleMethodToggle("GET"));

    expect(result.current.selectedMethods.has("GET")).toBe(true);

    act(() => result.current.handleMethodToggle("GET"));

    expect(result.current.selectedMethods.has("GET")).toBe(false);
  });

  it("groups filtered endpoints by tag", () => {
    const { result } = renderHook(() => useEndpointFilters(endpoints));

    expect(result.current.filteredEndpointsByTag).toHaveProperty("users");
    expect(result.current.filteredEndpointsByTag).toHaveProperty("projects");
  });

  it("returns an empty result when no endpoints match the filters", () => {
    const { result } = renderHook(() => useEndpointFilters(endpoints));

    act(() => result.current.setSearchText("nonexistent-path-xyz"));

    expect(Object.keys(result.current.filteredEndpointsByTag)).toHaveLength(0);
  });
});
