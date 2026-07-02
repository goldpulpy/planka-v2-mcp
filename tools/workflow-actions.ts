import { z } from "zod";
import { getCard, moveCard } from "../operations/cards.js";
import { createComment } from "../operations/comments.js";
import { getLists } from "../operations/lists.js";
import { getBoard } from "../operations/boards.js";
import { updateTask } from "../operations/tasks.js";

/**
 * Zod schema for the workflow action parameters
 * @property {string} action - The workflow action to perform (start_working, mark_completed, move_to_testing, move_to_done)
 * @property {string} cardId - The ID of the card to perform the action on
 * @property {string} [comment] - Optional comment to add with the action
 * @property {string[]} [taskIds] - Optional task IDs to mark as completed (for mark_completed action)
 * @property {string} [boardId] - Optional board ID (if not provided, will attempt to determine from card)
 */
export const workflowActionSchema = z.object({
    action: z.enum([
        "start_working",
        "mark_completed",
        "move_to_testing",
        "move_to_done",
    ]).describe("The workflow action to perform"),
    cardId: z.string().describe("The ID of the card to perform the action on"),
    comment: z.string().optional().describe(
        "Optional comment to add with the action",
    ),
    taskIds: z.array(z.string()).optional().describe(
        "Optional task IDs to mark as completed (for mark_completed action)",
    ),
    boardId: z.string().optional().describe(
        "Optional board ID (if not provided, will attempt to determine from card)",
    ),
});

/**
 * Type definition for workflow action parameters
 */
export type WorkflowActionParams = z.infer<typeof workflowActionSchema>;

/**
 * Performs a workflow action on a card (start working, mark completed, move to testing, move to done)
 *
 * This function handles common workflow actions for cards in a Kanban board, including
 * moving cards between lists, marking tasks as completed, and adding comments to document progress.
 *
 * @param {WorkflowActionParams} params - Parameters for the workflow action
 * @param {string} params.action - The workflow action to perform (start_working, mark_completed, move_to_testing, move_to_done)
 * @param {string} params.cardId - The ID of the card to perform the action on
 * @param {string} [params.comment] - Optional comment to add with the action
 * @param {string[]} [params.taskIds] - Optional task IDs to mark as completed (for mark_completed action)
 * @param {string} [params.boardId] - Optional board ID (if not provided, will attempt to determine from card)
 * @returns {Promise<object>} The result of the workflow action
 * @throws {Error} If the card or board is not found, or if the action cannot be performed
 */
export async function performWorkflowAction(params: WorkflowActionParams) {
    const { action, cardId, comment, taskIds, boardId: providedBoardId } =
        params;

    try {
        // Get the card details
        const card = await getCard(cardId);

        if (!card) {
            throw new Error(`Card with ID ${cardId} not found`);
        }

        // Use the provided boardId or try to determine it
        let boardId = providedBoardId;

        if (!boardId) {
            // Try to get the boardId from the card response
            // @ts-ignore - Some card responses include boardId
            boardId = card.boardId;
        }

        if (!boardId) {
            throw new Error(
                `Could not determine board ID for card ${cardId}. Please provide a boardId parameter.`,
            );
        }

        // Get the board
        const board = await getBoard(boardId);

        if (!board) {
            throw new Error(`Board with ID ${boardId} not found`);
        }

        // Get all lists on the board
        const boardLists = await getLists(boardId);

        // Find the target list based on the action
        let targetList;
        let actionComment = comment;

        switch (action) {
            case "start_working":
                targetList = boardLists.find((list: any) =>
                    list.name?.toLowerCase() === "in progress"
                );
                actionComment = comment || "🚀 Started working on this card.";
                break;

            case "mark_completed":
                // This action doesn't move the card, just completes tasks
                if (taskIds && taskIds.length > 0) {
                    // Mark all specified tasks as completed
                    const taskUpdates = await Promise.all(
                        taskIds.map((taskId) =>
                            updateTask(taskId, { isCompleted: true }),
                        ),
                    );

                    // Add a comment if provided
                    if (comment) {
                        await createComment({
                            cardId,
                            text: comment,
                        });
                    }

                    return {
                        success: true,
                        action,
                        cardId,
                        tasksCompleted: taskUpdates.length,
                    };
                } else {
                    throw new Error(
                        "No task IDs provided for mark_completed action",
                    );
                }

            case "move_to_testing":
                targetList = boardLists.find((list: any) =>
                    list.name?.toLowerCase() === "testing" ||
                    list.name?.toLowerCase() === "review"
                );
                actionComment = comment ||
                    "✅ Implementation completed and ready for testing.";
                break;

            case "move_to_done":
                targetList = boardLists.find((list: any) =>
                    list.name?.toLowerCase() === "done"
                );
                actionComment = comment ||
                    "🎉 All work completed and verified.";
                break;

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        if (!targetList) {
            throw new Error(`Target list not found for action: ${action}`);
        }

        // Move the card to the target list
        const updatedCard = await moveCard(cardId, targetList.id);

        // Add a comment
        const newComment = await createComment({
            cardId,
            text: actionComment || "",
        });

        return {
            success: true,
            action,
            cardId,
            listId: targetList.id,
            listName: targetList.name,
            card: updatedCard,
            comment: newComment,
        };
    } catch (error) {
        console.error(`Error in performWorkflowAction (${action}):`, error);
        throw error;
    }
}
