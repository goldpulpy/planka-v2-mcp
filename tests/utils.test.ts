import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";

const originalEnv = process.env;

describe("common utils", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.PLANKA_BASE_URL;
    delete process.env.PLANKA_AGENT_EMAIL;
    delete process.env.PLANKA_AGENT_PASSWORD;
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  test("buildUrl appends only defined query parameters", async () => {
    const { buildUrl } = await import("../common/utils.js");

    expect(
      buildUrl("https://planka.example/api/projects", {
        page: 2,
        perPage: 50,
        ignored: undefined,
      }),
    ).toBe("https://planka.example/api/projects?page=2&perPage=50");
  });

  test("name validators trim values and reject empty project names", async () => {
    const { validateBoardName, validateCardName, validateListName, validateProjectName } =
      await import("../common/utils.js");

    expect(validateProjectName("  Project  ")).toBe("Project");
    expect(validateBoardName("  Board  ")).toBe("Board");
    expect(validateListName("  List  ")).toBe("List");
    expect(validateCardName("  Card  ")).toBe("Card");
    expect(() => validateProjectName("   ")).toThrow("Project name cannot be empty");
  });

  test("plankaRequest normalizes base URL and path when auth is skipped", async () => {
    process.env.PLANKA_BASE_URL = "https://planka.example/api";
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ item: { id: "ok" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    global.fetch = fetchMock;

    const { plankaRequest } = await import("../common/utils.js");

    await expect(plankaRequest("projects", { skipAuth: true })).resolves.toEqual({
      item: { id: "ok" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://planka.example/api/projects",
      expect.objectContaining({
        method: "GET",
        body: null,
        credentials: "include",
        headers: expect.objectContaining({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  test("plankaRequest authenticates once and reuses the bearer token", async () => {
    process.env.PLANKA_BASE_URL = "https://planka.example";
    process.env.PLANKA_AGENT_EMAIL = "agent@example.test";
    process.env.PLANKA_AGENT_PASSWORD = "secret";
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ item: "token-1" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    global.fetch = fetchMock;

    const { plankaRequest } = await import("../common/utils.js");

    await plankaRequest("/api/users");
    await plankaRequest("/api/projects");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://planka.example/api/access-tokens",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://planka.example/api/users",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token-1" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://planka.example/api/projects",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token-1" }),
      }),
    );
  });

  test("plankaRequest wraps Planka errors without leaking the request URL", async () => {
    process.env.PLANKA_BASE_URL = "https://planka.example";
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: "Forbidden" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    );
    global.fetch = fetchMock;
    const { plankaRequest } = await import("../common/utils.js");

    await expect(plankaRequest("/api/users", { skipAuth: true })).rejects.toThrow(
      "Failed to make Planka request:",
    );
    await expect(plankaRequest("/api/users", { skipAuth: true })).rejects.not.toThrow(
      "https://planka.example",
    );
  });
});
