/**
 * @fileoverview Card operations for the MCP Kanban server
 *
 * This module provides functions for interacting with cards in the Planka Kanban board,
 * including creating, retrieving, updating, moving, duplicating, and deleting cards,
 * as well as managing card stopwatches for time tracking.
 */

import { z } from "zod";
import { PlankaCardSchema } from "../common/types.js";
import { plankaRequest } from "../common/utils.js";

// Schema definitions
/**
 * Schema for creating a new card
 * @property {string} listId - The ID of the list to create the card in
 * @property {string} name - The name of the card
 * @property {string} [description] - The description of the card
 * @property {number} [position] - The position of the card in the list (default: 65535)
 */
export const CreateCardSchema = z.object({
  listId: z.string().describe("List ID"),
  name: z.string().describe("Card name"),
  type: z
    .enum(["project", "story"])
    .optional()
    .default("project")
    .describe("Card type (project or story)"),
  description: z.string().nullable().optional().describe("Card description"),
  position: z.number().optional().describe("Card position (default: 65535)"),
  dueDate: z.string().nullable().optional().describe("Card due date (ISO format)"),
});

/**
 * Schema for retrieving cards from a list
 * @property {string} listId - The ID of the list to get cards from
 */
export const GetCardsSchema = z.object({
  listId: z.string().describe("List ID"),
});

/**
 * Schema for retrieving a specific card
 * @property {string} id - The ID of the card to retrieve
 */
export const GetCardSchema = z.object({
  id: z.string().describe("Card ID"),
});

/**
 * Schema for updating a card
 * @property {string} id - The ID of the card to update
 * @property {string} [name] - The new name for the card
 * @property {string} [description] - The new description for the card
 * @property {number} [position] - The new position for the card
 * @property {string} [dueDate] - The due date for the card (ISO format)
 * @property {boolean} [isCompleted] - Whether the card is completed
 * @property {boolean} [isClosed] - Whether the card is closed (archived)
 */
export const UpdateCardSchema = z.object({
  id: z.string().describe("Card ID"),
  name: z.string().optional().describe("Card name"),
  type: z.enum(["project", "story"]).optional().describe("Card type"),
  description: z.string().nullable().optional().describe("Card description"),
  position: z.number().optional().describe("Card position"),
  dueDate: z.string().optional().describe("Card due date (ISO format)"),
  isCompleted: z.boolean().optional().describe("Whether the card is completed"),
  isDueCompleted: z.boolean().optional().describe("Whether the card due date is completed"),
  isClosed: z.boolean().optional().describe("Whether the card is closed"),
});

export const MoveCardSchema = z.object({
  id: z.string().describe("Card ID"),
  listId: z.string().describe("Target list ID"),
  position: z.number().optional().describe("Card position in the target list (default: 65535)"),
});

export const DuplicateCardSchema = z.object({
  id: z.string().describe("Card ID to duplicate"),
  position: z.number().optional().describe("Position for the duplicated card (default: 65535)"),
});

export const DeleteCardSchema = z.object({
  id: z.string().describe("Card ID"),
});

// Stopwatch schemas
export const StartCardStopwatchSchema = z.object({
  id: z.string().describe("Card ID"),
});

export const StopCardStopwatchSchema = z.object({
  id: z.string().describe("Card ID"),
});

export const GetCardStopwatchSchema = z.object({
  id: z.string().describe("Card ID"),
});

export const ResetCardStopwatchSchema = z.object({
  id: z.string().describe("Card ID"),
});

// Type exports
export type CreateCardOptions = z.infer<typeof CreateCardSchema>;
export type UpdateCardOptions = z.infer<typeof UpdateCardSchema>;
export type MoveCardOptions = z.infer<typeof MoveCardSchema>;
export type DuplicateCardOptions = z.infer<typeof DuplicateCardSchema>;
export type StartCardStopwatchOptions = z.infer<typeof StartCardStopwatchSchema>;
export type StopCardStopwatchOptions = z.infer<typeof StopCardStopwatchSchema>;
export type GetCardStopwatchOptions = z.infer<typeof GetCardStopwatchSchema>;
export type ResetCardStopwatchOptions = z.infer<typeof ResetCardStopwatchSchema>;

// Response schemas
const CardsResponseSchema = z.object({
  items: z.array(PlankaCardSchema),
  included: z.record(z.any()).optional(),
});

const CardResponseSchema = z.object({
  item: PlankaCardSchema,
  included: z.record(z.any()).optional(),
});

// Function implementations
/**
 * Creates a new card in a list
 *
 * @param {CreateCardOptions} options - Options for creating the card
 * @returns {Promise<object>} The created card
 * @throws {Error} If the card creation fails
 */
export async function createCard(options: CreateCardOptions) {
  try {
    const response = await plankaRequest(`/api/lists/${options.listId}/cards`, {
      method: "POST",
      body: {
        name: options.name,
        type: options.type,
        description: options.description,
        position: options.position ?? 65535,
        dueDate: options.dueDate,
      },
    });
    const parsedResponse = CardResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to create card: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Retrieves all cards for a specific list
 *
 * @param {string} listId - The ID of the list to get cards from
 * @returns {Promise<Array<object>>} Array of cards in the list
 */
export async function getCards(listId: string) {
  try {
    const response = await plankaRequest(`/api/lists/${listId}/cards`);
    const parsedResponse = CardsResponseSchema.parse(response);
    return parsedResponse.items;
  } catch (error) {
    console.error(`Error getting cards for list ${listId}:`, error);
    return [];
  }
}

/**
 * Retrieves a specific card by ID
 *
 * @param {string} id - The ID of the card to retrieve
 * @returns {Promise<object>} The requested card
 */
export async function getCard(id: string) {
  try {
    const response = await plankaRequest(`/api/cards/${id}`);
    const parsedResponse = CardResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to get card: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function getCardWithIncluded(id: string) {
  try {
    const response = await plankaRequest(`/api/cards/${id}`);
    return CardResponseSchema.parse(response);
  } catch (error) {
    throw new Error(
      `Failed to get card: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Updates a card's properties
 *
 * @param {string} id - The ID of the card to update
 * @param {Partial<Omit<UpdateCardOptions, "id">>} options - The properties to update
 * @returns {Promise<object>} The updated card
 */
export async function updateCard(id: string, options: Partial<Omit<UpdateCardOptions, "id">>) {
  try {
    const body: Record<string, unknown> = { ...options };
    if (body.isCompleted !== undefined && body.isDueCompleted === undefined) {
      body.isDueCompleted = body.isCompleted;
    }
    delete body.isCompleted;

    const response = await plankaRequest(`/api/cards/${id}`, {
      method: "PATCH",
      body,
    });
    const parsedResponse = CardResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to update card: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Moves a card to a different list or position
 *
 * @param {string} cardId - The ID of the card to move
 * @param {string} listId - The ID of the list to move the card to
 * @param {number} [position=65535] - The position in the target list
 * @param {string} [boardId] - The ID of the board (if moving between boards)
 * @returns {Promise<object>} The moved card
 */
export async function moveCard(
  cardId: string,
  listId: string,
  position: number = 65535,
  boardId?: string,
) {
  try {
    const body: any = {
      listId,
      position,
    };

    if (boardId) {
      body.boardId = boardId;
    }

    const response = await plankaRequest(`/api/cards/${cardId}`, {
      method: "PATCH",
      body,
    });

    const parsedResponse = CardResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to move card: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Duplicates a card in the same list
 *
 * @param {string} id - The ID of the card to duplicate
 * @param {number} [position] - The position for the duplicated card
 * @returns {Promise<object>} The duplicated card
 */
export async function duplicateCard(id: string, position?: number) {
  try {
    const originalCard = await getCard(id);

    const newCard = await createCard({
      listId: originalCard.listId,
      name: `Copy of ${originalCard.name}`,
      type: originalCard.type,
      description: originalCard.description ?? null,
      position: position || 65535,
    });

    return newCard;
  } catch (error) {
    throw new Error(
      `Failed to duplicate card: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Deletes a card by ID
 *
 * @param {string} id - The ID of the card to delete
 * @returns {Promise<{success: boolean}>} Success indicator
 */
export async function deleteCard(id: string) {
  try {
    await plankaRequest(`/api/cards/${id}`, {
      method: "DELETE",
    });
    return { success: true };
  } catch (error) {
    throw new Error(
      `Failed to delete card: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Archives a card by moving it to the board's archive list
 *
 * @param {string} id - The ID of the card to archive
 * @returns {Promise<object>} The archived card or success indicator
 */
export async function archiveCard(id: string) {
  try {
    // First get the card to know its boardId
    const cardResponse = await plankaRequest(`/api/cards/${id}`);
    const card = (cardResponse as any).item;
    const boardId = card.boardId;

    // Get board details to find the archive list
    const boardResponse = await plankaRequest(`/api/boards/${boardId}`);
    const lists: any[] = (boardResponse as any).included?.lists || [];
    const archiveList = lists.find((l: any) => l.type === "archive");

    if (!archiveList) {
      throw new Error("No archive list found for this board");
    }

    // Move card to archive list
    const response = await plankaRequest(`/api/cards/${id}`, {
      method: "PATCH",
      body: {
        listId: archiveList.id,
        position: 65535,
      },
    });

    const parsedResponse = CardResponseSchema.parse(
      (response as any).item ? response : { item: response },
    );
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to archive card: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// Stopwatch functions

/**
 * Starts the stopwatch for a card to track time spent
 *
 * @param {string} id - The ID of the card to start the stopwatch for
 * @returns {Promise<object>} The updated card with stopwatch information
 */
export async function startCardStopwatch(id: string) {
  try {
    const card = await getCard(id);
    const response = await plankaRequest(`/api/cards/${id}`, {
      method: "PATCH",
      body: {
        stopwatch: {
          startedAt: new Date().toISOString(),
          total: card.stopwatch?.total || 0,
        },
      },
    });

    const parsedResponse = CardResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to start card stopwatch: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function stopCardStopwatch(id: string) {
  try {
    // We first need the current total
    const card = await getCard(id);
    const existingTotal = card.stopwatch?.total || 0;
    let newTotal = existingTotal;

    if (card.stopwatch?.startedAt) {
      const startedAt = new Date(card.stopwatch.startedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startedAt) / 1000);
      newTotal += elapsed;
    }

    const response = await plankaRequest(`/api/cards/${id}`, {
      method: "PATCH",
      body: {
        stopwatch: {
          startedAt: null,
          total: newTotal,
        },
      },
    });

    const parsedResponse = CardResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to stop card stopwatch: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Gets the current stopwatch time for a card
 *
 * @param {string} id - The ID of the card to get the stopwatch time for
 * @returns {Promise<object>} The card's stopwatch information
 */
export async function getCardStopwatch(id: string) {
  try {
    const card = await getCard(id);

    if (!card.stopwatch) {
      return {
        isRunning: false,
        total: 0,
        current: 0,
        formattedTotal: formatDuration(0),
        formattedCurrent: formatDuration(0),
      };
    }

    let currentElapsed = 0;
    const isRunning = !!card.stopwatch.startedAt;

    if (isRunning && card.stopwatch.startedAt) {
      const startedAt = new Date(card.stopwatch.startedAt).getTime();
      const now = Date.now();
      currentElapsed = Math.floor((now - startedAt) / 1000);
    }

    return {
      isRunning,
      total: card.stopwatch.total || 0,
      current: currentElapsed,
      startedAt: card.stopwatch.startedAt,
      formattedTotal: formatDuration(card.stopwatch.total || 0),
      formattedCurrent: formatDuration(currentElapsed),
    };
  } catch (error) {
    throw new Error(
      `Failed to get card stopwatch: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function resetCardStopwatch(id: string) {
  try {
    const response = await plankaRequest(`/api/cards/${id}`, {
      method: "PATCH",
      body: {
        stopwatch: {
          startedAt: null,
          total: 0,
        },
      },
    });

    const parsedResponse = CardResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to reset card stopwatch: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Formats a duration in seconds to a human-readable string
 *
 * @param {number} seconds - The duration in seconds
 * @returns {string} Formatted duration string (e.g., "2h 30m 15s")
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  let result = "";
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0 || hours > 0) result += `${minutes}m `;
  result += `${remainingSeconds}s`;

  return result.trim();
}
