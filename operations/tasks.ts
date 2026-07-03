/**
 * @fileoverview Task operations for the MCP Kanban server
 *
 * This module provides functions for interacting with tasks in the Planka Kanban board,
 * including creating, retrieving, updating, and deleting tasks, as well as batch operations.
 * Adapted for Planka v2.0 hierarchy (Card -> TaskList -> Task).
 */

import { z } from "zod";
import { plankaRequest } from "../common/utils.js";
import { PlankaTaskSchema } from "../common/types.js";
import * as taskLists from "./taskLists.js";

// Schema definitions
/**
 * Schema for creating a new task
 * @property {string} [cardId] - The ID of the card (will find/create default Task List)
 * @property {string} [taskListId] - The ID of the task list (direct creation)
 * @property {string} name - The name of the task
 * @property {number} [position] - The position of the task in the list (default: 65535)
 */
export const CreateTaskSchema = z.object({
  cardId: z.string().optional().describe("Card ID (v1 compatibility, will use first Task List)"),
  taskListId: z.string().optional().describe("Task List ID (v2 preferred)"),
  name: z.string().describe("Task name"),
  position: z.number().optional().describe("Task position (default: 65535)"),
}).refine(data => data.cardId || data.taskListId, {
  message: "Either cardId or taskListId must be provided",
});

/**
 * Schema for batch creating multiple tasks
 * @property {Array<CreateTaskSchema>} tasks - Array of tasks to create
 */
export const BatchCreateTasksSchema = z.object({
  tasks: z.array(CreateTaskSchema).describe("Array of tasks to create"),
});

/**
 * Schema for retrieving tasks from a card
 * @property {string} cardId - The ID of the card to get tasks from
 */
export const GetTasksSchema = z.object({
  cardId: z.string().describe("Card ID"),
});

/**
 * Schema for retrieving tasks from a task list
 * @property {string} taskListId - The ID of the task list to get tasks from
 */
export const GetTaskListTasksSchema = z.object({
  taskListId: z.string().describe("Task List ID"),
});

/**
 * Schema for retrieving a specific task
 * @property {string} id - The ID of the task to retrieve
 */
export const GetTaskSchema = z.object({
  cardId: z.string().describe("Card ID"),
  id: z.string().describe("Task ID"),
});

/**
 * Schema for updating a task
 * @property {string} id - The ID of the task to update
 * @property {string} [name] - The new name for the task
 * @property {boolean} [isCompleted] - Whether the task is completed
 * @property {number} [position] - The new position for the task
 */
export const UpdateTaskSchema = z.object({
  id: z.string().describe("Task ID"),
  name: z.string().optional().describe("Task name"),
  isCompleted: z.boolean().optional().describe("Whether the task is completed"),
  position: z.number().optional().describe("Task position"),
});

/**
 * Schema for deleting a task
 * @property {string} id - The ID of the task to delete
 */
export const DeleteTaskSchema = z.object({
  id: z.string().describe("Task ID"),
});

// Type exports
export type CreateTaskOptions = z.infer<typeof CreateTaskSchema>;
export type BatchCreateTasksOptions = z.infer<typeof BatchCreateTasksSchema>;
export type UpdateTaskOptions = z.infer<typeof UpdateTaskSchema>;

// Response schemas
const TasksResponseSchema = z.object({
  items: z.array(PlankaTaskSchema),
  included: z.record(z.any()).optional(),
});

const TaskResponseSchema = z.object({
  item: PlankaTaskSchema,
  included: z.record(z.any()).optional(),
});

// Function implementations
/**
 * Creates a new task
 *
 * @param {CreateTaskOptions} options - The task creation parameters
 * @returns {Promise<object>} The created task
 */
export async function createTask(options: CreateTaskOptions) {
  try {
    let targetTaskListId = options.taskListId;

    // If cardId is provided instead of taskListId (v1 compatibility)
    if (!targetTaskListId && options.cardId) {
      const lists = await taskLists.getTaskLists(options.cardId);
      if (lists && lists.length > 0) {
        targetTaskListId = lists[0].id;
      } else {
        // Create a default Task List if none exists
        const newList = await taskLists.createTaskList({
          cardId: options.cardId,
          name: "Tasks",
        });
        targetTaskListId = newList.id;
      }
    }

    if (!targetTaskListId) {
      throw new Error("Target Task List ID could not be determined.");
    }

    const response = await plankaRequest(
      `/api/task-lists/${targetTaskListId}/tasks`,
      {
        method: "POST",
        body: {
          name: options.name,
          position: options.position || 65535,
        },
      },
    );

    const parsedResponse = TaskResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to create task: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Creates multiple tasks in a single operation
 *
 * @param {BatchCreateTasksOptions} options - The batch create tasks options
 * @returns {Promise<{results: any[], successes: any[], failures: any[]}>} The results of the batch operation
 */
export async function batchCreateTasks(options: BatchCreateTasksOptions) {
  const results = [];
  const successes = [];
  const failures = [];

  for (let i = 0; i < options.tasks.length; i++) {
    const task = options.tasks[i];
    try {
      const result = await createTask(task);
      results.push({ success: true, result });
      successes.push(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({ success: false, error: { message: errorMessage } });
      failures.push({ index: i, task, error: errorMessage });
    }
  }

  return { results, successes, failures };
}

/**
 * Retrieves all tasks for a specific task list
 *
 * @param {string} taskListId - The ID of the task list
 * @returns {Promise<Array<object>>} Array of tasks
 */
export async function getTaskListTasks(taskListId: string) {
  try {
    const response = await plankaRequest(`/api/task-lists/${taskListId}`);
    
    if (response && typeof response === "object" && (response as any).included && (response as any).included.tasks) {
      return (response as any).included.tasks;
    }
    
    return [];
  } catch (error) {
    console.error(`Error getting tasks for task list ${taskListId}:`, error);
    return [];
  }
}

/**
 * Retrieves all tasks for a specific card (flattens tasks from all task lists)
 *
 * @param {string} cardId - The ID of the card
 * @returns {Promise<Array<object>>} Flattened array of all tasks in the card
 */
export async function getTasks(cardId: string) {
  try {
    const lists = await taskLists.getTaskLists(cardId);
    const allTasks = [];

    for (const list of lists) {
      const tasks = await getTaskListTasks(list.id);
      allTasks.push(...tasks);
    }

    return allTasks;
  } catch (error) {
    console.error(`Error getting tasks for card ${cardId}:`, error);
    return [];
  }
}

/**
 * Retrieves a specific task by ID
 *
 * Planka API: There is no dedicated GET /api/tasks/:id endpoint.
 * Tasks are fetched by scanning all task lists on the card's GET response.
 *
 * @param {string} cardId - The ID of the card the task belongs to
 * @param {string} id - The ID of the task to retrieve
 * @returns {Promise<object>} The requested task
 */
export async function getTask(cardId: string, id: string) {
  try {
    const tasks = await getTasks(cardId);
    const task = tasks.find((task: any) => task.id === id);
    if (task) return task;

    throw new Error(`Task ${id} not found on card ${cardId}`);
  } catch (error) {
    throw new Error(
      `Failed to get task: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Updates a task's properties
 *
 * @param {string} id - The ID of the task to update
 * @param {Partial<UpdateTaskOptions>} options - The properties to update
 * @returns {Promise<object>} The updated task
 */
export async function updateTask(id: string, options: Partial<UpdateTaskOptions>) {
  try {
    const { id: _, ...updateData } = options;
    const response = await plankaRequest(`/api/tasks/${id}`, {
      method: "PATCH",
      body: updateData,
    });
    const parsedResponse = TaskResponseSchema.parse(response);
    return parsedResponse.item;
  } catch (error) {
    throw new Error(
      `Failed to update task: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Deletes a task by ID
 *
 * @param {string} id - The ID of the task to delete
 * @returns {Promise<{success: boolean}>} Success indicator
 */
export async function deleteTask(id: string) {
  try {
    await plankaRequest(`/api/tasks/${id}`, {
      method: "DELETE",
    });
    return { success: true };
  } catch (error) {
    throw new Error(
      `Failed to delete task: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
