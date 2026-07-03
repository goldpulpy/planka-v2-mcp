/**
 * @fileoverview Label operations for the MCP Kanban server
 *
 * This module provides functions for interacting with labels in the Planka Kanban board,
 * including creating, retrieving, updating, and deleting labels, as well as
 * adding and removing labels from cards.
 * Updated for Planka v2.0.
 */

import { z } from "zod";
import { PlankaLabelSchema } from "../common/types.js";
import { plankaRequest } from "../common/utils.js";

/**
 * Valid color options for labels in Planka v2.0
 */
export const VALID_LABEL_COLORS = [
  "muddy-grey",
  "autumn-leafs",
  "morning-sky",
  "antique-blue",
  "egg-yellow",
  "desert-sand",
  "dark-granite",
  "fresh-salad",
  "lagoon-blue",
  "midnight-blue",
  "light-orange",
  "pumpkin-orange",
  "light-concrete",
  "sunny-grass",
  "navy-blue",
  "lilac-eyes",
  "apricot-red",
  "orange-peel",
  "silver-glint",
  "bright-moss",
  "deep-ocean",
  "summer-sky",
  "berry-red",
  "light-cocoa",
  "grey-stone",
  "tank-green",
  "coral-green",
  "sugar-plum",
  "pink-tulip",
  "shady-rust",
  "wet-rock",
  "wet-moss",
  "turquoise-sea",
  "lavender-fields",
  "piggy-red",
  "light-mud",
  "gun-metal",
  "modern-green",
  "french-coast",
  "sweet-lilac",
  "red-burgundy",
  "pirate-gold",
] as const;

/**
 * Schema for creating a new label
 * @property {string} boardId - The ID of the board to create the label in
 * @property {string} name - The name of the label
 * @property {string} color - The color of the label (must be one of the valid colors)
 * @property {number} [position] - The position of the label in the board (default: 65535)
 */
export const CreateLabelSchema = z.object({
  boardId: z.string().describe("Board ID"),
  name: z.string().describe("Label name"),
  color: z.enum(VALID_LABEL_COLORS).describe("Label color"),
  position: z.number().optional().describe("Label position (default: 65535)"),
});

/**
 * Schema for retrieving labels from a board
 * @property {string} boardId - The ID of the board to get labels from
 */
export const GetLabelsSchema = z.object({
  boardId: z.string().describe("Board ID"),
});

export const GetLabelSchema = z.object({
  id: z.string().describe("Label ID"),
});

/**
 * Schema for updating a label
 * @property {string} id - The ID of the label to update
 * @property {string} [name] - The new name for the label
 * @property {string} [color] - The new color for the label
 * @property {number} [position] - The new position for the label
 */
export const UpdateLabelSchema = z.object({
  id: z.string().describe("Label ID"),
  name: z.string().optional().describe("Label name"),
  color: z.enum(VALID_LABEL_COLORS).optional().describe("Label color"),
  position: z.number().optional().describe("Label position"),
});

/**
 * Schema for deleting a label
 * @property {string} id - The ID of the label to delete
 */
export const DeleteLabelSchema = z.object({
  id: z.string().describe("Label ID"),
});

/**
 * Schema for adding a label to a card
 * @property {string} cardId - The ID of the card to add the label to
 * @property {string} labelId - The ID of the label to add to the card
 */
export const AddLabelToCardSchema = z.object({
  cardId: z.string().describe("Card ID"),
  labelId: z.string().describe("Label ID"),
});

/**
 * Schema for removing a label from a card
 * @property {string} cardId - The ID of the card to remove the label from
 * @property {string} labelId - The ID of the label to remove from the card
 */
export const RemoveLabelFromCardSchema = z.object({
  cardId: z.string().describe("Card ID"),
  labelId: z.string().describe("Label ID"),
});

// Type exports
export type CreateLabelOptions = z.infer<typeof CreateLabelSchema>;
export type UpdateLabelOptions = z.infer<typeof UpdateLabelSchema>;
export type AddLabelToCardOptions = z.infer<typeof AddLabelToCardSchema>;
export type RemoveLabelFromCardOptions = z.infer<typeof RemoveLabelFromCardSchema>;

// Response schemas
const _LabelsResponseSchema = z.object({
  items: z.array(PlankaLabelSchema),
  included: z.record(z.any()).optional(),
});

const LabelResponseSchema = z.object({
  item: PlankaLabelSchema,
  included: z.record(z.any()).optional(),
});

// Function implementations
/**
 * Creates a new label in a board
 *
 * @param {CreateLabelOptions} options - Options for creating the label
 * @returns {Promise<object>} The created label
 */
export async function createLabel(options: CreateLabelOptions) {
  try {
    const response = await plankaRequest(`/api/boards/${options.boardId}/labels`, {
      method: "POST",
      body: {
        name: options.name,
        color: options.color,
        position: options.position ?? 65535,
      },
    });
    const parsedResponse = LabelResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to create label: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function getLabels(boardId: string) {
  try {
    const response = await plankaRequest(`/api/boards/${boardId}`);
    if (response && typeof response === "object" && (response as any).included?.labels) {
      return (response as any).included.labels;
    }
    return [];
  } catch (error: any) {
    console.error(
      `Error getting labels for board ${boardId}: ${error?.message || "Unknown error"}`,
    );
    return [];
  }
}

/**
 * Retrieves a specific label by ID
 *
 * @param {string} id - The ID of the label to retrieve
 * @returns {Promise<object>} The requested label
 */
export async function getLabel(id: string) {
  try {
    const response = await plankaRequest(`/api/labels/${id}`);
    const parsedResponse = LabelResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to get label: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Updates a label's properties
 *
 * @param {string} id - The ID of the label to update
 * @param {Partial<Omit<UpdateLabelOptions, "id">>} options - The properties to update
 * @returns {Promise<object>} The updated label
 */
export async function updateLabel(id: string, options: Partial<Omit<UpdateLabelOptions, "id">>) {
  try {
    const response = await plankaRequest(`/api/labels/${id}`, {
      method: "PATCH",
      body: options,
    });
    const parsedResponse = LabelResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to update label: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Deletes a label by ID
 *
 * @param {string} id - The ID of the label to delete
 * @returns {Promise<{success: boolean}>} Success indicator
 */
export async function deleteLabel(id: string) {
  try {
    await plankaRequest(`/api/labels/${id}`, {
      method: "DELETE",
    });
    return { success: true };
  } catch (error) {
    throw new Error(
      `Failed to delete label: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Adds a label to a card
 *
 * @param {string} cardId - The ID of the card
 * @param {string} labelId - The ID of the label
 * @returns {Promise<{success: boolean}>} Success indicator
 */
export async function addLabelToCard(cardId: string, labelId: string) {
  try {
    await plankaRequest(`/api/cards/${cardId}/card-labels`, {
      method: "POST",
      body: { labelId },
    });
    return { success: true };
  } catch (error) {
    throw new Error(
      `Failed to add label to card: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Removes a label from a card
 *
 * @param {string} cardId - The ID of the card
 * @param {string} labelId - The ID of the label
 * @returns {Promise<{success: boolean}>} Success indicator
 */
export async function removeLabelFromCard(cardId: string, labelId: string) {
  try {
    await plankaRequest(`/api/cards/${cardId}/card-labels/labelId:${labelId}`, {
      method: "DELETE",
    });
    return { success: true };
  } catch (error) {
    throw new Error(
      `Failed to remove label from card: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
