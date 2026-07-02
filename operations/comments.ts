/**
 * @fileoverview Comment operations for the MCP Kanban server
 *
 * This module provides functions for interacting with comments in the Planka Kanban board,
 * including creating, retrieving, updating, and deleting comments on cards.
 * Updated for Planka v2.0.
 */

import { z } from "zod";
import { plankaRequest } from "../common/utils.js";
import { PlankaCommentSchema } from "../common/types.js";

// Schema definitions
/**
 * Schema for creating a new comment
 * @property {string} cardId - The ID of the card to create the comment on
 * @property {string} text - The text content of the comment
 */
export const CreateCommentSchema = z.object({
  cardId: z.string().describe("Card ID"),
  text: z.string().describe("Comment text"),
});

/**
 * Schema for retrieving comments from a card
 * @property {string} cardId - The ID of the card to get comments from
 */
export const GetCommentsSchema = z.object({
  cardId: z.string().describe("Card ID"),
});

/**
 * Schema for retrieving a specific comment
 * @property {string} id - The ID of the comment to retrieve
 */
export const GetCommentSchema = z.object({
  cardId: z.string().describe("Card ID"),
  id: z.string().describe("Comment ID"),
});

/**
 * Schema for updating a comment
 * @property {string} id - The ID of the comment to update
 * @property {string} text - The new text content for the comment
 */
export const UpdateCommentSchema = z.object({
  id: z.string().describe("Comment ID"),
  text: z.string().describe("Comment text"),
});

/**
 * Schema for deleting a comment
 * @property {string} id - The ID of the comment to delete
 */
export const DeleteCommentSchema = z.object({
  id: z.string().describe("Comment ID"),
});

// Type exports
export type CreateCommentOptions = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentOptions = z.infer<typeof UpdateCommentSchema>;

// Response schemas
const CommentsResponseSchema = z.object({
  items: z.array(PlankaCommentSchema),
  included: z.record(z.any()).optional(),
});

const CommentResponseSchema = z.object({
  item: PlankaCommentSchema,
  included: z.record(z.any()).optional(),
});

// Function implementations
/**
 * Creates a new comment on a card
 *
 * @param {CreateCommentOptions} options - Options for creating the comment
 * @returns {Promise<object>} The created comment
 */
export async function createComment(options: CreateCommentOptions) {
  try {
    const response = await plankaRequest(
      `/api/cards/${options.cardId}/comments`,
      {
        method: "POST",
        body: {
          text: options.text,
        },
      },
    );
    const parsedResponse = CommentResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to create comment: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Retrieves all comments for a specific card
 *
 * @param {string} cardId - The ID of the card
 * @returns {Promise<Array<object>>} Array of comments
 */
export async function getComments(cardId: string) {
  try {
    const response = await plankaRequest(`/api/cards/${cardId}/comments`);
    const parsedResponse = CommentsResponseSchema.parse(response);
    return parsedResponse.items;
  } catch (error) {
    console.error(`Error getting comments for card ${cardId}:`, error);
    return [];
  }
}

/**
 * Retrieves a specific comment by ID
 *
 * Planka API: There is no dedicated GET /api/comments/:id endpoint.
 * Comments are fetched via GET /api/cards/:cardId/comments and filtered by ID.
 *
 * @param {string} cardId - The ID of the card the comment belongs to
 * @param {string} id - The ID of the comment
 * @returns {Promise<object>} The requested comment
 */
export async function getComment(cardId: string, id: string) {
  try {
    const response = await plankaRequest(`/api/cards/${cardId}/comments`);
    const parsedResponse = CommentsResponseSchema.parse(response);
    const comment = parsedResponse.items.find((c: any) => c.id === id);
    if (!comment) {
      throw new Error(`Comment ${id} not found on card ${cardId}`);
    }
    return comment;
  } catch (error) {
    throw new Error(
      `Failed to get comment: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Updates a comment's text content
 *
 * @param {string} id - The ID of the comment to update
 * @param {Partial<Omit<UpdateCommentOptions, "id">>} options - The properties to update
 * @returns {Promise<object>} The updated comment
 */
export async function updateComment(
  id: string,
  options: Partial<Omit<UpdateCommentOptions, "id">>,
) {
  try {
    const response = await plankaRequest(`/api/comments/${id}`, {
      method: "PATCH",
      body: {
        text: options.text,
      },
    });
    const parsedResponse = CommentResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to update comment: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Deletes a comment by ID
 *
 * @param {string} id - The ID of the comment to delete
 * @returns {Promise<{success: boolean}>} Success indicator
 */
export async function deleteComment(id: string) {
  try {
    await plankaRequest(`/api/comments/${id}`, {
      method: "DELETE",
    });
    return { success: true };
  } catch (error) {
    throw new Error(
      `Failed to delete comment: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

