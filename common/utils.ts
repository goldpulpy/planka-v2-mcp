import { getUserAgent } from "universal-user-agent";
import { createPlankaError } from "./errors.js";
import { VERSION } from "./version.js";

// Global variables to store tokens
let agentToken: string | null = null;

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
};

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export function buildUrl(
  baseUrl: string,
  params: Record<string, string | number | undefined>,
): string {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, value.toString());
    }
  });
  return url.toString();
}

const USER_AGENT = `modelcontextprotocol/servers/planka/v${VERSION} ${getUserAgent()}`;

async function authenticateAgent(): Promise<string> {
  const email = process.env.PLANKA_AGENT_EMAIL;
  const password = process.env.PLANKA_AGENT_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "PLANKA_AGENT_EMAIL and PLANKA_AGENT_PASSWORD environment variables are required",
    );
  }

  const baseUrl = process.env.PLANKA_BASE_URL || "http://localhost:3000";
  // Normalize the base URL to not end with /api
  const normalizedBaseUrl = baseUrl.endsWith("/api") ? baseUrl.slice(0, -4) : baseUrl;

  const url = new URL("/api/access-tokens", normalizedBaseUrl).toString();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        emailOrUsername: email,
        password: password,
      }),
      credentials: "include",
    });

    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw createPlankaError(response.status, responseBody);
    }

    // The token is directly in the item field
    const { item } = responseBody as { item: string };
    agentToken = item;
    return item;
  } catch (error: unknown) {
    // Rethrow with more context
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to authenticate agent with Planka: ${errorMessage}`);
  }
}

async function getAuthToken(): Promise<string> {
  if (agentToken) {
    return agentToken;
  }
  return authenticateAgent();
}

export async function plankaRequest(path: string, options: RequestOptions = {}): Promise<unknown> {
  const baseUrl = process.env.PLANKA_BASE_URL || "http://localhost:3000";

  // Normalize the base URL to not end with /api
  const normalizedBaseUrl = baseUrl.endsWith("/api") ? baseUrl.slice(0, -4) : baseUrl;

  // Ensure path starts with /api/
  const normalizedPath = path.startsWith("/api/") ? path : `/api/${path}`;

  const urlObj = new URL(normalizedPath, normalizedBaseUrl);

  // SSRF Protection: Ensure we don't accidentally redirect to a different host via normalizedPath
  const baseHost = new URL(normalizedBaseUrl).host;
  if (urlObj.host !== baseHost) {
    throw new Error(
      `Security violation: Target host ${urlObj.host} does not match base host ${baseHost}`,
    );
  }

  const url = urlObj.toString();

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
    ...options.headers,
  };

  // Remove Content-Type header for FormData
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  // Add authentication token if not skipped
  if (!options.skipAuth) {
    try {
      const token = await getAuthToken();
      headers.Authorization = `Bearer ${token}`;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get authentication token: ${errorMessage}`);
    }
  }

  // Handle SSL certificate verification bypass for internal networks
  if (process.env.PLANKA_IGNORE_SSL === "true") {
    // Note: Setting this globally affects the whole process, but it's a common
    // workaround for internal servers with self-signed certs.
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body:
        options.body instanceof FormData
          ? options.body
          : options.body
            ? JSON.stringify(options.body)
            : null,
      credentials: "include", // Include cookies for Planka authentication
    });

    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw createPlankaError(response.status, responseBody);
    }

    return responseBody;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Security: Do not leak the full URL in logs/errors as it might contain sensitive path IDs or be used for SSRF analysis
    throw new Error(`Failed to make Planka request: ${errorMessage}`);
  }
}

export function validateProjectName(name: string): string {
  const sanitized = name.trim();
  if (!sanitized) {
    throw new Error("Project name cannot be empty");
  }
  return sanitized;
}

export function validateBoardName(name: string): string {
  const sanitized = name.trim();
  if (!sanitized) {
    throw new Error("Board name cannot be empty");
  }
  return sanitized;
}

export function validateListName(name: string): string {
  const sanitized = name.trim();
  if (!sanitized) {
    throw new Error("List name cannot be empty");
  }
  return sanitized;
}

export function validateCardName(name: string): string {
  const sanitized = name.trim();
  if (!sanitized) {
    throw new Error("Card name cannot be empty");
  }
  return sanitized;
}

/**
 * Looks up a user ID by email
 *
 * @param {string} email - The email of the user to look up
 * @returns {Promise<string | null>} The user ID if found, null otherwise
 */
export async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    // Get all users
    const response = await plankaRequest("/api/users");
    const { items } = response as {
      items: Array<{ id: string; email: string }>;
    };

    // Find the user with the matching email
    const user = items.find((user) => user.email === email);
    return user ? user.id : null;
  } catch (error) {
    console.error(
      `Failed to get user ID by email: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

/**
 * Looks up a user ID by username
 *
 * @param {string} username - The username of the user to look up
 * @returns {Promise<string | null>} The user ID if found, null otherwise
 */
export async function getUserIdByUsername(username: string): Promise<string | null> {
  try {
    // Get all users
    const response = await plankaRequest("/api/users");
    const { items } = response as {
      items: Array<{ id: string; username: string }>;
    };

    // Find the user with the matching username
    const user = items.find((user) => user.username === username);
    return user ? user.id : null;
  } catch (error) {
    console.error(
      `Failed to get user ID by username: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}
