import { extractDeclaredVariables, parseHttpContent } from "@/lib/parse-http-content";

describe("parseHttpContent", () => {
  it("returns no requests for an empty input", () => {
    const result = parseHttpContent("");
    expect(result.requests).toEqual([]);
    expect(result.globalVariables).toEqual({});
  });

  it("collects file-level @var declarations", () => {
    const content = `@baseUrl = https://api.example.com\n@token = abc123\n\n### Get\n@id = 42\nGET {{baseUrl}}/items/{{id}}\nAuthorization: Bearer {{token}}\n`;
    const result = parseHttpContent(content);

    expect(result.globalVariables).toEqual({
      baseUrl: "https://api.example.com",
      token: "abc123",
    });
    expect(result.requests).toHaveLength(1);

    const req = result.requests[0];
    expect(req.label).toBe("Get");
    expect(req.method).toBe("GET");
    expect(req.url).toBe("https://api.example.com/items/42");
    expect(req.headers).toEqual([{ name: "Authorization", value: "Bearer abc123" }]);
    expect(req.body).toBeUndefined();
    expect(req.unresolvedVariables).toEqual([]);
  });

  it("parses multiple request blocks separated by ###", () => {
    const content = `@baseUrl = https://api.example.com\n\n### A\nGET {{baseUrl}}/a\n\n### B\nPOST {{baseUrl}}/b\nContent-Type: application/json\n\n{"x":1}\n`;
    const result = parseHttpContent(content);

    expect(result.requests).toHaveLength(2);
    expect(result.requests[0].method).toBe("GET");
    expect(result.requests[0].url).toBe("https://api.example.com/a");
    expect(result.requests[1].method).toBe("POST");
    expect(result.requests[1].url).toBe("https://api.example.com/b");
    expect(result.requests[1].body).toBe('{"x":1}');
  });

  it("substitutes block-level vars and extracts the JSON body", () => {
    const content = `### Create\n@userId = 7\nPOST https://api.example.com/users/{{userId}}\nAuthorization: Bearer xyz\nContent-Type: application/json\n\n{\n  "id": {{userId}},\n  "name": "alice"\n}\n`;
    const result = parseHttpContent(content);

    expect(result.requests).toHaveLength(1);
    const req = result.requests[0];
    expect(req.url).toBe("https://api.example.com/users/7");
    expect(req.headers).toEqual([
      { name: "Authorization", value: "Bearer xyz" },
      { name: "Content-Type", value: "application/json" },
    ]);
    expect(req.body).toBe('{\n  "id": 7,\n  "name": "alice"\n}');
  });

  it("records unresolved variables but leaves the placeholder in place", () => {
    const content = `### X\nGET https://api.example.com/{{missing}}/x\n`;
    const result = parseHttpContent(content);

    expect(result.requests[0].url).toBe("https://api.example.com/{{missing}}/x");
    expect(result.requests[0].unresolvedVariables).toEqual(["missing"]);
  });

  it("ignores comment lines and blank lines before the request line", () => {
    const content = `### X\n# A comment\n\nGET https://api.example.com/x\n`;
    const result = parseHttpContent(content);

    expect(result.requests).toHaveLength(1);
    expect(result.requests[0].method).toBe("GET");
  });

  it("supports lowercase method keywords", () => {
    const content = `### X\ndelete https://api.example.com/x\n`;
    const result = parseHttpContent(content);

    expect(result.requests[0].method).toBe("DELETE");
  });

  it("returns no requests for blocks without a method line", () => {
    const content = `### X\n# only a comment\n`;
    const result = parseHttpContent(content);

    expect(result.requests).toEqual([]);
  });

  it("trims trailing blank lines from the body", () => {
    const content = `### X\nPOST https://api.example.com/x\nContent-Type: application/json\n\n{"a":1}\n\n\n`;
    const result = parseHttpContent(content);

    expect(result.requests[0].body).toBe('{"a":1}');
  });

  it("applies user-provided overrides on top of file declarations", () => {
    const content = `@baseUrl = https://api.example.com\n@token = abc\n\n### X\nGET {{baseUrl}}/x\nAuthorization: Bearer {{token}}\n`;
    const result = parseHttpContent(content, {
      overrides: { baseUrl: "https://staging.example.com", token: "XYZ" },
    });

    expect(result.requests[0].url).toBe("https://staging.example.com/x");
    expect(result.requests[0].headers[0]).toEqual({
      name: "Authorization",
      value: "Bearer XYZ",
    });
    // The returned globalVariables map still reflects the FILE declarations,
    // so callers can show what was declared vs. overridden.
    expect(result.globalVariables).toEqual({
      baseUrl: "https://api.example.com",
      token: "abc",
    });
  });

  it("lets per-block @var declarations win over user overrides", () => {
    const content = `### X\n@baseUrl = https://block.example.com\nGET {{baseUrl}}/x\n`;
    const result = parseHttpContent(content, {
      overrides: { baseUrl: "https://override.example.com" },
    });

    expect(result.requests[0].url).toBe("https://block.example.com/x");
  });

  it("resolves system variables ({{$randomInt}}) after user substitution", () => {
    const content = `### X\nGET https://api.example.com/items/{{$randomInt 5 6}}\n`;
    const result = parseHttpContent(content);

    expect(result.requests[0].url).toBe("https://api.example.com/items/5");
    expect(result.requests[0].unresolvedVariables).toEqual([]);
  });
});

describe("extractDeclaredVariables", () => {
  it("returns file-level and per-block @var declarations", () => {
    const content = `@baseUrl = https://api.example.com\n@token = abc\n\n### A\n@id = 7\nGET {{baseUrl}}/{{id}}\n\n### B\n@id = 9\nGET {{baseUrl}}/{{id}}\n`;
    const declared = extractDeclaredVariables(content);

    expect(declared).toEqual({
      baseUrl: "https://api.example.com",
      token: "abc",
      // Later @id wins (per-block declarations are merged in order)
      id: "9",
    });
  });

  it("returns an empty object when nothing is declared", () => {
    expect(extractDeclaredVariables("### X\nGET https://example.com\n")).toEqual({});
  });
});
