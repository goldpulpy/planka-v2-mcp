import { z } from "zod";
import { createCard } from "../operations/cards.js";
import { createComment } from "../operations/comments.js";
import { createTask } from "../operations/tasks.js";

/**
 * Zod schema for the createCardWithTasks function parameters
 * @property {string} listId - The ID of the list to create the card in
 * @property {string} name - The name of the card
 * @property {string} [description] - The description of the card
 * @property {string[]} [tasks] - Array of task descriptions to create
 * @property {string} [comment] - Optional comment to add to the card
 * @property {number} [position] - Optional position for the card in the list
 */
export const createCardWithTasksSchema = z.object({
  listId: z.string().describe("The ID of the list to create the card in"),
  name: z.string().describe("The name of the card"),
  description: z.string().optional().describe("The description of the card"),
  tasks: z.array(z.string()).optional().describe("Array of task descriptions to create"),
  comment: z.string().optional().describe("Optional comment to add to the card"),
  position: z.number().optional().describe("Optional position for the card in the list"),
});

/**
 * Type definition for createCardWithTasks parameters
 */
export type CreateCardWithTasksParams = z.infer<typeof createCardWithTasksSchema>;

/**
 * Creates a new card with tasks, description, and optional comment in a single operation
 *
 * This function streamlines the process of creating a card with associated tasks and comments
 * by handling all the necessary API calls in a single function.
 *
 * @param {CreateCardWithTasksParams} params - Parameters for creating a card with tasks
 * @param {string} params.listId - The ID of the list to create the card in
 * @param {string} params.name - The name of the card
 * @param {string} [params.description] - The description of the card
 * @param {string[]} [params.tasks] - Array of task descriptions to create
 * @param {string} [params.comment] - Optional comment to add to the card
 * @param {number} [params.position] - Optional position for the card in the list
 * @returns {Promise<object>} The created card, tasks, and comment
 * @throws {Error} If there's an error creating the card, tasks, or comment
 */
export async function createCardWithTasks(params: CreateCardWithTasksParams) {
  const { listId, name, description, tasks, comment, position = 65535 } = params;

  try {
    // Create the card
    const card = await createCard({
      listId,
      name,
      type: "project",
      description: description || null,
      position,
    });

    // Create tasks if provided
    const createdTasks = [];
    if (tasks && tasks.length > 0) {
      for (let i = 0; i < tasks.length; i++) {
        const taskName = tasks[i];
        if (!taskName) continue;
        // Calculate position for each task (65535, 131070, 196605, etc.)
        const taskPosition = 65535 * (i + 1);

        const task = await createTask({
          cardId: card.id,
          name: taskName,
          position: taskPosition,
        });
        createdTasks.push(task);
      }
    }

    // Add a comment if provided
    let createdComment = null;
    if (comment) {
      createdComment = await createComment({
        cardId: card.id,
        text: comment,
      });
    }

    return {
      card,
      tasks: createdTasks,
      comment: createdComment,
    };
  } catch (error) {
    console.error("Error in createCardWithTasks:", error);
    throw error;
  }
}
