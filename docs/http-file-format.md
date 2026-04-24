# Generated `.http` File Format

This document describes the format of the `.http` files produced by **http-file-generator**, explains the generation rules, and provides annotated examples.

`.http` files are plain-text files understood by:

- [VS Code REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
- [JetBrains HTTP Client](https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html)

---

## File Header

Every generated file starts with a header that declares the spec title, version, base URL, and two global variables used by all requests in the file:

```http
# Petstore API v1.0.0
# Base URL: https://petstore.example.com/v3

@baseUrl = https://petstore.example.com/v3
@token = your_token_here
```

- `@baseUrl` — the first server URL from the OpenAPI spec (falls back to `{{baseUrl}}` if none is defined).
- `@token` — placeholder for a Bearer token used in `Authorization` headers.

---

## Request Block Structure

Each endpoint produces one request block:

```
### <label>
[@<var> = <value>
...]
<METHOD> <url>
<headers>

[<body>]

```

A blank line separates consecutive request blocks.

### Label

The label (`### …`) uses the first available value from:

1. `summary`
2. `operationId`
3. `METHOD /path` (fallback)

### Variable Declarations

`@var = value` declarations are emitted for **path** and **query** parameters only, in that order. They follow the `###` label line immediately.

Path parameters default based on their schema type:

| Schema type          | Default value             |
| -------------------- | ------------------------- |
| `integer` / `number` | `1`                       |
| `boolean`            | `true`                    |
| `string`             | `text`                    |
| `array`              | `value1%2Cvalue2`         |
| `object`             | `{}`                      |
| enum                 | first declared enum value |
| (path, unknown)      | `1`                       |
| (query, unknown)     | `text`                    |

Parameter names are normalized to **camelCase** before becoming variable names (e.g. `UserId` → `userId`). `snake_case` and `kebab-case` names are left unchanged.

### URL

Path parameter placeholders `{param}` are replaced with `{{camelCaseName}}` variable references. Query parameters are appended as `?key={{varName}}&…`.

```http
GET {{baseUrl}}/pets/{{petId}}?pageSize={{pageSize}}&page={{page}}
```

### Headers

Every request includes:

```http
Authorization: Bearer {{token}}
```

`Content-Type: application/json` is added for `POST`, `PUT`, `PATCH` requests, or any request that declares a `requestBody`.

Additional `header` parameters defined in the spec are appended after the standard headers:

```http
X-Request-Id: {{X-Request-Id}}
```

### Request Body

Bodies are only emitted when the endpoint declares a `requestBody` with a JSON content type (`application/json`, or any `application/*+json` variant).

**Priority order:**

1. `content["application/json"].example` — used verbatim (JSON-serialized).
2. `content["application/json"].schema.example` — used verbatim (JSON-serialized).
3. Schema `properties` — a template object with **literal typed defaults** (no `{{var}}` references):

| Schema type          | Default value                               |
| -------------------- | ------------------------------------------- |
| `integer` / `number` | `0`                                         |
| `boolean`            | `true`                                      |
| `array`              | `[]`                                        |
| `object`             | `{}`                                        |
| `string`             | `""`                                        |
| enum                 | first declared enum value (JSON-serialized) |

Body fields support `allOf` (merged), `anyOf` / `oneOf` (first sub-schema with properties wins).

If no properties can be resolved, an empty `{}` is emitted.

---

## Full Annotated Example

Given this OpenAPI snippet:

```yaml
paths:
  /pets/{petId}:
    get:
      summary: Get a pet
      parameters:
        - name: petId
          in: path
          schema:
            type: integer
        - name: fields
          in: query
          schema:
            type: string
  /pets:
    post:
      summary: Create a pet
      requestBody:
        content:
          application/json:
            schema:
              properties:
                name:
                  type: string
                age:
                  type: integer
                status:
                  type: string
                  enum: [available, pending, sold]
```

The generated file would look like:

```http
# Petstore API v1.0.0
# Base URL: https://petstore.example.com/v3

@baseUrl = https://petstore.example.com/v3
@token = your_token_here

### Get a pet
@petId = 1
@fields = text
GET {{baseUrl}}/pets/{{petId}}?fields={{fields}}
Authorization: Bearer {{token}}

### Create a pet
POST {{baseUrl}}/pets
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "name": "",
  "age": 0,
  "status": "available"
}

```

---

## ZIP Archive Layout

When downloading as a ZIP, endpoints are grouped by tag and then split by their **parent path context** to avoid putting unrelated endpoints in the same file.

```
petstore.zip
├── pets/
│   └── pets.http          # /pets and /pets/{petId}
└── store/
    └── store.http         # /store/inventory, /store/order, …
```

See [`architecture.md`](architecture.md) for the full grouping algorithm.
