import { z } from "zod";
import { getProject, getProjects } from "../operations/projects.js";
import { getBoardSummary } from "./board-summary.js";

/**
 * Zod schema for the getProjectSummary function parameters
 * @property {string} projectId - The ID of the project to get a summary for
 */
export const getProjectSummarySchema = z.object({
  projectId: z.string().describe("The ID of the project to get a summary for"),
});

/**
 * Type definition for getProjectSummary parameters
 */
export type GetProjectSummaryParams = z.infer<typeof getProjectSummarySchema>;

/**
 * Retrieves a comprehensive summary of a project including all its boards
 *
 * @param {GetProjectSummaryParams} params - Parameters for retrieving project summary
 * @returns {Promise<object>} Comprehensive project summary
 */
export async function getProjectSummary(params: GetProjectSummaryParams) {
  const { projectId } = params;

  try {
    // Get the project details
    const project = await getProject(projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    // Find boards for this project using getProjects() which returns included data
    const allProjectsRes = await getProjects(1, 100);
    const projectBoards = (allProjectsRes.included?.boards || []).filter(
      (board: any) => board.projectId === projectId,
    );

    // Get summaries for each board
    const boardSummaries = await Promise.all(
      projectBoards.map(async (board: any) => {
        try {
          return await getBoardSummary({
            boardId: board.id,
            includeTaskDetails: false,
            includeComments: false,
          });
        } catch (error) {
          console.error(`Error getting summary for board ${board.id}:`, error);
          return {
            board,
            error: "Could not retrieve board summary",
          };
        }
      }),
    );

    // Calculate aggregate stats
    const totalCards = boardSummaries.reduce(
      (sum: number, summary: any) => sum + (summary.stats?.totalCards || 0),
      0,
    );

    return {
      project,
      boards: boardSummaries,
      stats: {
        boardCount: projectBoards.length,
        totalCards,
      },
    };
  } catch (error) {
    console.error("Error in getProjectSummary:", error);
    throw error;
  }
}
