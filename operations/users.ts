/**
 * @fileoverview User operations for the MCP Kanban server
 */

import { z } from "zod";
import { plankaRequest } from "../common/utils.js";

// Schema definitions
export const GetUsersSchema = z.object({
  page: z.number().optional().describe("Page number for pagination"),
  perPage: z.number().optional().describe("Number of results per page"),
});

export const GetUserSchema = z.object({
  id: z.string().describe("User ID or 'me'"),
});

// Response schemas
const UserSchema = z.object({
  id: z.string(),
  email: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
});

const UsersResponseSchema = z.object({
  items: z.array(UserSchema),
});

const UserResponseSchema = z.object({
  item: UserSchema,
});

/**
 * Retrieves all users
 */
export async function getUsers(page: number = 1, perPage: number = 100) {
  try {
    const response = await plankaRequest(`/api/users?page=${page}&perPage=${perPage}`);
    const parsedResponse = UsersResponseSchema.parse(response);
    return parsedResponse.items;
  } catch (error) {
    throw new Error(
      `Failed to get users: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Retrieves a specific user by ID
 */
export async function getUser(id: string) {
  try {
    const response = await plankaRequest(`/api/users/${id}`);
    const parsedResponse = UserResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to get user ${id}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
