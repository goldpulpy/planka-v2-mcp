/**
 * @fileoverview List operations for the MCP Kanban server
 *
 * This module provides functions for interacting with lists in the Planka Kanban board,
 * including creating, retrieving, updating, and deleting lists.
 */

import { z } from "zod";
import { PlankaListSchema } from "../common/types.js";
import { plankaRequest } from "../common/utils.js";

// Schema definitions
/**
 * Schema for creating a new list
 * @property {string} boardId - The ID of the board to create the list in
 * @property {string} name - The name of the list
 * @property {number} [position] - The position of the list in the board (default: 65535)
 */
export const CreateListSchema = z.object({
  boardId: z.string().describe("Board ID"),
  name: z.string().describe("List name"),
  position: z.number().optional().describe("List position (default: 65535)"),
});

/**
 * Schema for retrieving lists from a board
 * @property {string} boardId - The ID of the board to get lists from
 */
export const GetListsSchema = z.object({
  boardId: z.string().describe("Board ID"),
});

/**
 * Schema for updating a list
 * @property {string} id - The ID of the list to update
 * @property {string} [name] - The new name for the list
 * @property {number} [position] - The new position for the list
 * @property {string} [type] - The type/status of the list (active, closed, archive, trash)
 * @property {string} [color] - The color for the list
 */
export const UpdateListSchema = z.object({
  id: z.string().describe("List ID"),
  name: z.string().optional().describe("List name"),
  position: z.number().optional().describe("List position"),
  type: z.enum(["active", "closed", "archive", "trash"]).optional().describe("List type"),
  color: z.string().optional().describe("List color"),
});

/**
 * Schema for deleting a list
 * @property {string} id - The ID of the list to delete
 */
export const DeleteListSchema = z.object({
  id: z.string().describe("List ID"),
});

// Type exports
/**
 * Type definition for list creation options
 */
export type CreateListOptions = z.infer<typeof CreateListSchema>;

/**
 * Type definition for list update options
 */
export type UpdateListOptions = z.infer<typeof UpdateListSchema>;

// Response schemas
const _ListsResponseSchema = z.object({
  items: z.array(PlankaListSchema),
  included: z.record(z.any()).optional(),
});

const ListResponseSchema = z.object({
  item: PlankaListSchema,
  included: z.record(z.any()).optional(),
});

// Function implementations
/**
 * Creates a new list in a board
 *
 * @param {CreateListOptions} options - Options for creating the list
 * @param {string} options.boardId - The ID of the board to create the list in
 * @param {string} options.name - The name of the list
 * @param {number} [options.position] - The position of the list in the board (default: 65535)
 * @returns {Promise<object>} The created list
 * @throws {Error} If the list creation fails
 */
export async function createList(options: CreateListOptions) {
  try {
    const response = await plankaRequest(`/api/boards/${options.boardId}/lists`, {
      method: "POST",
      body: {
        name: options.name,
        position: options.position,
        type: (options as any).type || "active",
      },
    });
    const parsedResponse = ListResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to create list: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Retrieves all lists for a specific board
 *
 * @param {string} boardId - The ID of the board to get lists from
 * @returns {Promise<Array<object>>} Array of lists in the board
 */
export async function getLists(boardId: string) {
  try {
    const response = await plankaRequest(`/api/boards/${boardId}`);
    if (response && typeof response === "object" && (response as any).included?.lists) {
      return (response as any).included.lists;
    }
    return [];
  } catch (error) {
    console.error(`Error getting lists for board ${boardId}:`, error);
    return [];
  }
}

/**
 * Retrieves a specific list by ID
 *
 * @param {string} id - The ID of the list to retrieve
 * @returns {Promise<object|null>} The requested list or null if not found
 */
export async function getList(id: string) {
  try {
    const response = await plankaRequest(`/api/lists/${id}`);
    const parsedResponse = ListResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    console.error(`Error getting list with ID ${id}:`, error);
    return null;
  }
}

/**
 * Updates a list's properties
 *
 * @param {string} id - The ID of the list to update
 * @param {Partial<Omit<UpdateListOptions, "id">>} options - The properties to update
 * @returns {Promise<object>} The updated list
 */
export async function updateList(id: string, options: Partial<Omit<UpdateListOptions, "id">>) {
  const response = await plankaRequest(`/api/lists/${id}`, {
    method: "PATCH",
    body: options,
  });
  const parsedResponse = ListResponseSchema.parse(response);
  return parsedResponse.item;
}

/**
 * Deletes a list by ID
 *
 * @param {string} id - The ID of the list to delete
 * @returns {Promise<{success: boolean}>} Success indicator
 */
export async function deleteList(id: string) {
  await plankaRequest(`/api/lists/${id}`, {
    method: "DELETE",
  });
  return { success: true };
}
