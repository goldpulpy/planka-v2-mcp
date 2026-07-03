/**
 * @fileoverview TaskList operations for the MCP Kanban server
 *
 * This module provides functions for interacting with Task Lists in the Planka Kanban system.
 * Task Lists are containers for tasks within a card, introduced in Planka v2.0.
 */

import { z } from "zod";
import { PlankaTaskListSchema } from "../common/types.js";
import { plankaRequest } from "../common/utils.js";

// Schema definitions
/**
 * Schema for creating a new Task List
 * @property {string} cardId - The ID of the card to create the task list in
 * @property {string} name - The name of the task list
 * @property {number} [position] - The position of the task list in the card (default: 65535)
 */
export const CreateTaskListSchema = z.object({
  cardId: z.string().describe("Card ID"),
  name: z.string().describe("Task list name"),
  position: z.number().optional().describe("Task list position (default: 65535)"),
});

/**
 * Schema for retrieving task lists from a card
 * @property {string} cardId - The ID of the card to get task lists from
 */
export const GetTaskListsSchema = z.object({
  cardId: z.string().describe("Card ID"),
});

/**
 * Schema for updating a task list
 * @property {string} id - The ID of the task list to update
 * @property {string} [name] - The new name for the task list
 * @property {number} [position] - The new position for the task list
 */
export const UpdateTaskListSchema = z.object({
  id: z.string().describe("Task list ID"),
  name: z.string().optional().describe("Task list name"),
  position: z.number().optional().describe("Task list position"),
});

/**
 * Schema for deleting a task list
 * @property {string} id - The ID of the task list to delete
 */
export const DeleteTaskListSchema = z.object({
  id: z.string().describe("Task list ID"),
});

// Type exports
export type CreateTaskListOptions = z.infer<typeof CreateTaskListSchema>;
export type UpdateTaskListOptions = z.infer<typeof UpdateTaskListSchema>;

// Response schemas
const _TaskListsResponseSchema = z.object({
  items: z.array(PlankaTaskListSchema),
  included: z.record(z.any()).optional(),
});

const TaskListResponseSchema = z.object({
  item: PlankaTaskListSchema,
  included: z.record(z.any()).optional(),
});

// Function implementations
/**
 * Creates a new task list in a card
 *
 * @param {CreateTaskListOptions} options - Options for creating the task list
 * @returns {Promise<object>} The created task list
 */
export async function createTaskList(options: CreateTaskListOptions) {
  try {
    const response = await plankaRequest(`/api/cards/${options.cardId}/task-lists`, {
      method: "POST",
      body: {
        name: options.name,
        position: options.position ?? 65535,
      },
    });
    const parsedResponse = TaskListResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to create task list: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Retrieves all task lists for a specific card
 *
 * @param {string} cardId - The ID of the card
 * @returns {Promise<Array<object>>} Array of task lists
 */
export async function getTaskLists(cardId: string) {
  try {
    const response = await plankaRequest(`/api/cards/${cardId}`);

    if (response && typeof response === "object" && (response as any).included?.taskLists) {
      return (response as any).included.taskLists;
    }

    return [];
  } catch (error) {
    console.error(`Error getting task lists for card ${cardId}:`, error);
    return [];
  }
}

/**
 * Retrieves a specific task list by ID
 *
 * @param {string} id - The ID of the task list
 * @returns {Promise<object>} The requested task list
 */
export async function getTaskList(id: string) {
  try {
    const response = await plankaRequest(`/api/task-lists/${id}`);
    const parsedResponse = TaskListResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to get task list: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Updates a task list
 *
 * @param {string} id - The ID of the task list
 * @param {Partial<Omit<UpdateTaskListOptions, "id">>} options - Properties to update
 * @returns {Promise<object>} The updated task list
 */
export async function updateTaskList(
  id: string,
  options: Partial<Omit<UpdateTaskListOptions, "id">>,
) {
  try {
    const response = await plankaRequest(`/api/task-lists/${id}`, {
      method: "PATCH",
      body: options,
    });
    const parsedResponse = TaskListResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to update task list: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Deletes a task list
 *
 * @param {string} id - The ID of the task list
 * @returns {Promise<{success: boolean}>} Success indicator
 */
export async function deleteTaskList(id: string) {
  try {
    await plankaRequest(`/api/task-lists/${id}`, {
      method: "DELETE",
    });
    return { success: true };
  } catch (error) {
    throw new Error(
      `Failed to delete task list: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
