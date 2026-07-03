/**
 * @fileoverview Board membership operations for the MCP Kanban server
 *
 * This module provides functions for managing board memberships in the Planka Kanban system,
 * including creating, retrieving, updating, and deleting board memberships.
 * Updated for Planka v2.0 hierarchy (Project -> Board Membership).
 */

import { z } from "zod";
import { plankaRequest } from "../common/utils.js";
import { PlankaBoardMembershipSchema } from "../common/types.js";
import * as boards from "./boards.js";

// Schema definitions
/**
 * Schema for creating a new board membership
 * @property {string} boardId - The ID of the board to add the user to
 * @property {string} userId - The ID of the user to add to the board
 * @property {string} role - The role of the user on the board (editor or viewer)
 * @property {string} [projectId] - The ID of the project containing the board (optional, will find if missing)
 */
export const CreateBoardMembershipSchema = z.object({
  boardId: z.string().describe("Board ID"),
  userId: z.string().describe("User ID"),
  role: z.enum(["editor", "viewer"]).describe("Membership role (editor or viewer)"),
  projectId: z.string().optional().describe("Project ID (v2 preferred)"),
});

/**
 * Schema for retrieving board memberships
 * @property {string} boardId - The ID of the board to get memberships for
 * @property {string} [projectId] - The ID of the project (optional)
 */
export const GetBoardMembershipsSchema = z.object({
  boardId: z.string().describe("Board ID"),
  projectId: z.string().optional().describe("Project ID"),
});

/**
 * Schema for retrieving a specific board membership
 * @property {string} id - The ID of the board membership to retrieve
 */
export const GetBoardMembershipSchema = z.object({
  id: z.string().describe("Board Membership ID"),
});

/**
 * Schema for updating a board membership
 * @property {string} id - The ID of the board membership to update
 * @property {string} [role] - The new role for the user (editor or viewer)
 * @property {boolean} [canComment] - Whether the user can comment on cards
 */
export const UpdateBoardMembershipSchema = z.object({
  id: z.string().describe("Board Membership ID"),
  role: z.enum(["editor", "viewer"]).optional().describe("Membership role (editor or viewer)"),
  canComment: z.boolean().optional().describe("Whether the user can comment on cards"),
});

/**
 * Schema for deleting a board membership
 * @property {string} id - The ID of the board membership to delete
 */
export const DeleteBoardMembershipSchema = z.object({
  id: z.string().describe("Board Membership ID"),
});

// Type exports
export type CreateBoardMembershipOptions = z.infer<typeof CreateBoardMembershipSchema>;
export type UpdateBoardMembershipOptions = z.infer<typeof UpdateBoardMembershipSchema>;

// Response schemas
const BoardMembershipResponseSchema = z.object({
  item: PlankaBoardMembershipSchema,
  included: z.record(z.any()).optional(),
});

// Function implementations
/**
 * Creates a new board membership
 *
 * @param {CreateBoardMembershipOptions} options - Options for creating the board membership
 * @returns {Promise<object>} The created board membership
 */
export async function createBoardMembership(options: CreateBoardMembershipOptions) {
  try {
    let targetProjectId = options.projectId;

    // If projectId is missing, try to find it from the board
    if (!targetProjectId) {
      const board = await boards.getBoard(options.boardId);
      targetProjectId = board.projectId;
    }

    if (!targetProjectId) {
      throw new Error("Project ID could not be determined for the board.");
    }

    const response = await plankaRequest(
      `/api/boards/${options.boardId}/board-memberships`,
      {
        method: "POST",
        body: {
          boardId: options.boardId,
          userId: options.userId,
          role: options.role,
        },
      },
    );

    const parsedResponse = BoardMembershipResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to create board membership: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Retrieves all memberships for a specific board
 *
 * @param {string} boardId - The ID of the board
 * @param {string} [projectId] - Optional project ID
 * @returns {Promise<Array<object>>} Array of board memberships
 */
export async function getBoardMemberships(boardId: string, _projectId?: string) {
  try {
    const response = await plankaRequest(`/api/boards/${boardId}`);
    
    if (response && typeof response === "object" && (response as any).included && (response as any).included.boardMemberships) {
      return (response as any).included.boardMemberships;
    }
    
    return [];
  } catch (error) {
    console.error(`Error getting memberships for board ${boardId}:`, error);
    return [];
  }
}

/**
 * Retrieves a specific board membership by ID
 *
 * @param {string} id - The ID of the board membership
 * @returns {Promise<object>} The requested board membership
 */
export async function getBoardMembership(boardId: string, id: string) {
  const response = await plankaRequest(`/api/boards/${boardId}`);

  if (response && typeof response === "object" && (response as any).included && (response as any).included.boardMemberships) {
    const memberships = (response as any).included.boardMemberships;
    const membership = memberships.find(
      (m: any) => m.id === id,
    );
    if (membership) {
      return membership;
    }
  }

  return null;
}

/**
 * Updates a board membership's properties
 *
 * @param {string} id - The ID of the board membership to update
 * @param {Partial<UpdateBoardMembershipOptions>} options - The properties to update
 * @returns {Promise<object>} The updated board membership
 */
export async function updateBoardMembership(id: string, options: Partial<UpdateBoardMembershipOptions>) {
  try {
    const { id: _, ...updateData } = options;
    const response = await plankaRequest(`/api/board-memberships/${id}`, {
      method: "PATCH",
      body: updateData,
    });
    const parsedResponse = BoardMembershipResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to update board membership: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Deletes a board membership by ID
 *
 * @param {string} id - The ID of the board membership to delete
 * @returns {Promise<{success: boolean}>} Success indicator
 */
export async function deleteBoardMembership(id: string) {
  try {
    await plankaRequest(`/api/board-memberships/${id}`, {
      method: "DELETE",
    });
    return { success: true };
  } catch (error) {
    throw new Error(
      `Failed to delete board membership: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

