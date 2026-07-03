import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { board, card, comment, label, list, project, task } from "./fixtures.js";

type OneArg = (value: string) => Promise<unknown>;
type ObjectArg = (value: Record<string, unknown>) => Promise<unknown>;
type MoveCard = (cardId: string, listId: string) => Promise<unknown>;
type UpdateTask = (taskId: string, options: Record<string, unknown>) => Promise<unknown>;

const createCard = jest.fn<ObjectArg>();
const getCard = jest.fn<OneArg>();
const getCardWithIncluded = jest.fn<OneArg>();
const moveCard = jest.fn<MoveCard>();
const createTask = jest.fn<ObjectArg>();
const updateTask = jest.fn<UpdateTask>();
const createComment = jest.fn<ObjectArg>();
const getComments = jest.fn<OneArg>();
const getTasks = jest.fn<OneArg>();
const getBoard = jest.fn<OneArg>();
const getBoards = jest.fn<OneArg>();
const getLists = jest.fn<OneArg>();
const getProject = jest.fn<OneArg>();
const getProjects = jest.fn<(page?: number, perPage?: number) => Promise<unknown>>();
const getBoardSummary = jest.fn<ObjectArg>();
const plankaRequest = jest.fn<OneArg>();

jest.unstable_mockModule("../operations/cards.js", () => ({
  createCard,
  getCard,
  getCardWithIncluded,
  moveCard,
}));

jest.unstable_mockModule("../operations/tasks.js", () => ({
  createTask,
  updateTask,
  getTasks,
}));

jest.unstable_mockModule("../operations/comments.js", () => ({
  createComment,
  getComments,
}));

jest.unstable_mockModule("../operations/boards.js", () => ({
  getBoard,
  getBoards,
}));

jest.unstable_mockModule("../operations/lists.js", () => ({
  getLists,
}));

jest.unstable_mockModule("../operations/projects.js", () => ({
  getProject,
  getProjects,
}));

jest.unstable_mockModule("../tools/board-summary.js", () => ({
  getBoardSummary,
}));

jest.unstable_mockModule("../common/utils.js", () => ({
  plankaRequest,
}));

const createCardWithTasksModule = await import("../tools/create-card-with-tasks.js");
const workflowActions = await import("../tools/workflow-actions.js");
const projectSummary = await import("../tools/project-summary.js");
const cardDetails = await import("../tools/card-details.js");

describe("composed tools", () => {
  beforeEach(() => {
    createCard.mockReset();
    getCard.mockReset();
    getCardWithIncluded.mockReset();
    moveCard.mockReset();
    createTask.mockReset();
    updateTask.mockReset();
    createComment.mockReset();
    getComments.mockReset();
    getTasks.mockReset();
    getBoard.mockReset();
    getBoards.mockReset();
    getLists.mockReset();
    getProject.mockReset();
    getProjects.mockReset();
    getBoardSummary.mockReset();
    plankaRequest.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  test("createCardWithTasks creates the card, positioned tasks, and optional comment", async () => {
    createCard.mockResolvedValueOnce(card);
    createTask
      .mockResolvedValueOnce(task)
      .mockResolvedValueOnce({ ...task, id: "task-2", position: 131070 });
    createComment.mockResolvedValueOnce(comment);

    await expect(
      createCardWithTasksModule.createCardWithTasks({
        listId: "list-1",
        name: "Card",
        description: "Details",
        tasks: ["One", "Two"],
        comment: "Ready",
      }),
    ).resolves.toEqual({
      card,
      tasks: [task, { ...task, id: "task-2", position: 131070 }],
      comment,
    });

    expect(createCard).toHaveBeenCalledWith({
      listId: "list-1",
      name: "Card",
      type: "project",
      description: "Details",
      position: 65535,
    });
    expect(createTask).toHaveBeenNthCalledWith(2, {
      cardId: "card-1",
      name: "Two",
      position: 131070,
    });
    expect(createComment).toHaveBeenCalledWith({ cardId: "card-1", text: "Ready" });
  });

  test("performWorkflowAction moves a card to the matching workflow list", async () => {
    const inProgressList = { ...list, id: "list-2", name: "In Progress" };
    getCard.mockResolvedValueOnce(card);
    getBoard.mockResolvedValueOnce(board);
    getLists.mockResolvedValueOnce([list, inProgressList]);
    moveCard.mockResolvedValueOnce({ ...card, listId: "list-2" });
    createComment.mockResolvedValueOnce(comment);

    await expect(
      workflowActions.performWorkflowAction({
        action: "start_working",
        cardId: "card-1",
        boardId: "board-1",
      }),
    ).resolves.toMatchObject({
      success: true,
      listId: "list-2",
      listName: "In Progress",
    });

    expect(moveCard).toHaveBeenCalledWith("card-1", "list-2");
    expect(createComment).toHaveBeenCalledWith({
      cardId: "card-1",
      text: "🚀 Started working on this card.",
    });
  });

  test("performWorkflowAction marks requested tasks complete without moving the card", async () => {
    getCard.mockResolvedValueOnce(card);
    getBoard.mockResolvedValueOnce(board);
    getLists.mockResolvedValueOnce([list]);
    updateTask.mockResolvedValueOnce({ ...task, isCompleted: true });
    createComment.mockResolvedValueOnce(comment);

    await expect(
      workflowActions.performWorkflowAction({
        action: "mark_completed",
        cardId: "card-1",
        boardId: "board-1",
        taskIds: ["task-1"],
        comment: "Done",
      }),
    ).resolves.toEqual({
      success: true,
      action: "mark_completed",
      cardId: "card-1",
      tasksCompleted: 1,
    });

    expect(updateTask).toHaveBeenCalledWith("task-1", { isCompleted: true });
    expect(moveCard).not.toHaveBeenCalled();
  });

  test("getProjectSummary aggregates board summaries and preserves board-level failures", async () => {
    const projectBoard = { id: "board-1", projectId: "project-1", name: "Board" };
    const failingBoard = { id: "board-2", projectId: "project-1", name: "Broken Board" };
    getProject.mockResolvedValueOnce(project);
    getProjects.mockResolvedValueOnce({
      items: [project],
      included: { boards: [projectBoard, failingBoard, { id: "other", projectId: "other" }] },
    });
    getBoardSummary
      .mockResolvedValueOnce({ board: projectBoard, stats: { totalCards: 3 } })
      .mockRejectedValueOnce(new Error("unavailable"));

    await expect(projectSummary.getProjectSummary({ projectId: "project-1" })).resolves.toEqual({
      project,
      boards: [
        { board: projectBoard, stats: { totalCards: 3 } },
        { board: failingBoard, error: "Could not retrieve board summary" },
      ],
      stats: {
        boardCount: 2,
        totalCards: 3,
      },
    });
  });

  test("getCardDetails resolves board labels, task stats, sorted comments, and analysis", async () => {
    getCardWithIncluded.mockResolvedValueOnce({ item: card, included: {} });
    getTasks.mockResolvedValueOnce([task, { ...task, id: "task-2", isCompleted: true }]);
    getComments.mockResolvedValueOnce([
      { ...comment, id: "comment-old", text: "Old", createdAt: "2026-07-04T09:00:00.000Z" },
      {
        ...comment,
        id: "comment-new",
        text: "Please adjust",
        createdAt: "2026-07-04T10:00:00.000Z",
      },
    ]);
    getProjects.mockResolvedValueOnce({ items: [project] });
    getBoards.mockResolvedValueOnce([board]);
    getLists.mockResolvedValueOnce([list]);
    plankaRequest.mockResolvedValueOnce({
      included: {
        labels: [label],
        cardLabels: [{ id: "card-label-1", cardId: "card-1", labelId: "label-1" }],
      },
    });

    const details = await cardDetails.getCardDetails({ cardId: "card-1" });

    expect(details.taskStats).toEqual({
      total: 2,
      completed: 1,
      completionPercentage: 50,
    });
    expect(details.comments.map((item) => item.id)).toEqual(["comment-new", "comment-old"]);
    expect(details.labels).toEqual([label]);
    expect(details.analysis).toEqual({
      hasRecentHumanFeedback: true,
      isComplete: false,
      needsAttention: true,
    });
  });
});
