import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { board, card, comment, label, list, task } from "./fixtures.js";

type LookupById = (id: string) => Promise<unknown>;

const getBoard = jest.fn<LookupById>();
const getLists = jest.fn<LookupById>();
const getCards = jest.fn<LookupById>();
const getTasks = jest.fn<LookupById>();
const getComments = jest.fn<LookupById>();
const getLabels = jest.fn<LookupById>();

jest.unstable_mockModule("../operations/boards.js", () => ({
  getBoard,
}));

jest.unstable_mockModule("../operations/lists.js", () => ({
  getLists,
}));

jest.unstable_mockModule("../operations/cards.js", () => ({
  getCards,
}));

jest.unstable_mockModule("../operations/tasks.js", () => ({
  getTasks,
}));

jest.unstable_mockModule("../operations/comments.js", () => ({
  getComments,
}));

jest.unstable_mockModule("../operations/labels.js", () => ({
  getLabels,
}));

const { getBoardSummary, getBoardSummarySchema } = await import("../tools/board-summary.js");

describe("getBoardSummary", () => {
  beforeEach(() => {
    getBoard.mockReset();
    getLists.mockReset();
    getCards.mockReset();
    getTasks.mockReset();
    getComments.mockReset();
    getLabels.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  test("defaults optional schema flags to false", () => {
    expect(getBoardSummarySchema.parse({ boardId: "board-1" })).toEqual({
      boardId: "board-1",
      includeTaskDetails: false,
      includeComments: false,
    });
  });

  test("aggregates lists, cards, labels, tasks, comments, and workflow statistics", async () => {
    const doneList = { ...list, id: "list-2", name: "Done" };
    const testingList = { ...list, id: "list-3", name: "Testing" };
    const bugLabel = { ...label, id: "label-bug", name: "Bug" };
    const urgentLabel = { ...label, id: "label-urgent", name: "Urgent" };
    const backlogCard = {
      ...card,
      id: "card-1",
      labelIds: ["label-bug", "label-urgent"],
    };
    const doneCard = { ...card, id: "card-2", listId: "list-2", labelIds: [] };
    const testingCard = { ...card, id: "card-3", listId: "list-3", labelIds: ["label-bug"] };

    getBoard.mockResolvedValueOnce(board);
    getLists.mockResolvedValueOnce([list, doneList, testingList]);
    getCards
      .mockResolvedValueOnce([backlogCard])
      .mockResolvedValueOnce([doneCard])
      .mockResolvedValueOnce([testingCard]);
    getTasks
      .mockResolvedValueOnce([task, { ...task, id: "task-2", isCompleted: true }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...task, id: "task-3", isCompleted: true }]);
    getComments
      .mockResolvedValueOnce([comment])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...comment, id: "comment-2" }]);
    getLabels.mockResolvedValueOnce([bugLabel, urgentLabel]);

    const summary = await getBoardSummary({
      boardId: "board-1",
      includeTaskDetails: true,
      includeComments: true,
    });

    expect(summary.stats).toEqual({
      totalCards: 3,
      backlogCount: 1,
      inProgressCount: 0,
      testingCount: 1,
      doneCount: 1,
      urgentCount: 1,
      bugCount: 2,
      completionPercentage: 33,
    });
    expect(summary.workflowState).toEqual({
      hasCardsInBacklog: true,
      hasCardsInProgress: false,
      hasCardsInTesting: true,
      nextActionSuggestion: "Review cards in Testing that need feedback",
    });
    expect(summary.lists[0].cards[0].tasks).toEqual({
      items: [task, { ...task, id: "task-2", isCompleted: true }],
      total: 2,
      completed: 1,
      completionPercentage: 50,
    });
    expect(summary.lists[0].cards[0].comments).toEqual([comment]);
  });

  test("omits task and comment details unless requested", async () => {
    getBoard.mockResolvedValueOnce(board);
    getLists.mockResolvedValueOnce([list]);
    getCards.mockResolvedValueOnce([card]);
    getLabels.mockResolvedValueOnce([]);

    const summary = await getBoardSummary({
      boardId: "board-1",
      includeTaskDetails: false,
      includeComments: false,
    });

    expect(summary.lists[0].cards[0]).toMatchObject({ id: "card-1" });
    expect(summary.lists[0].cards[0].tasks).toBeUndefined();
    expect(summary.lists[0].cards[0].comments).toBeUndefined();
    expect(getTasks).not.toHaveBeenCalled();
    expect(getComments).not.toHaveBeenCalled();
  });

  test("throws when the board cannot be found", async () => {
    getBoard.mockResolvedValueOnce(null);

    await expect(
      getBoardSummary({
        boardId: "missing-board",
        includeTaskDetails: false,
        includeComments: false,
      }),
    ).rejects.toThrow("Board with ID missing-board not found");
  });
});
