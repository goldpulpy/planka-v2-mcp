/**
 * @fileoverview Unit tests for board seed orchestration (scripts/seed.ts)
 *
 * Uses jest.unstable_mockModule to mock all operation dependencies and verify
 * the full seed lifecycle, error handling, and summary computation.
 */

import { beforeEach, describe, expect, jest, test } from "@jest/globals";

// ---------------------------------------------------------------------------
// Type aliases for mock function signatures
// ---------------------------------------------------------------------------

type GetProject = (id: string) => Promise<unknown>;
type GetProjects = (page?: number, perPage?: number) => Promise<{ items: unknown[] }>;
type CreateProject = (opts: Record<string, unknown>) => Promise<unknown>;
type GetBoards = (projectId: string) => Promise<unknown>;
type CreateBoard = (opts: Record<string, unknown>) => Promise<unknown>;
type GetLists = (boardId: string) => Promise<unknown>;
type GetLabels = (boardId: string) => Promise<unknown>;
type CreateCard = (opts: Record<string, unknown>) => Promise<unknown>;
type AddLabelToCard = (cardId: string, labelId: string) => Promise<unknown>;
type CreateTaskListFn = (opts: Record<string, unknown>) => Promise<unknown>;
type CreateTaskFn = (opts: Record<string, unknown>) => Promise<unknown>;
type UpdateTaskFn = (id: string, opts: Record<string, unknown>) => Promise<unknown>;
type CreateCommentFn = (opts: Record<string, unknown>) => Promise<unknown>;

// ---------------------------------------------------------------------------
// Mock functions
// ---------------------------------------------------------------------------

const getProject = jest.fn<GetProject>();
const getProjects = jest.fn<GetProjects>();
const createProject = jest.fn<CreateProject>();
const getBoardsStrict = jest.fn<GetBoards>();
const createBoard = jest.fn<CreateBoard>();
const getLists = jest.fn<GetLists>();
const getLabels = jest.fn<GetLabels>();
const createCard = jest.fn<CreateCard>();
const addLabelToCard = jest.fn<AddLabelToCard>();
const createTaskListOp = jest.fn<CreateTaskListFn>();
const createTask = jest.fn<CreateTaskFn>();
const updateTask = jest.fn<UpdateTaskFn>();
const createComment = jest.fn<CreateCommentFn>();

// ---------------------------------------------------------------------------
// Module mocks — must be at the top level before any dynamic import
// ---------------------------------------------------------------------------

jest.unstable_mockModule("../operations/projects.js", () => ({
  getProject,
  getProjects,
  createProject,
}));
jest.unstable_mockModule("../operations/boards.js", () => ({
  getBoardsStrict,
  createBoard,
}));
jest.unstable_mockModule("../operations/lists.js", () => ({ getLists }));
jest.unstable_mockModule("../operations/labels.js", () => ({
  getLabels,
  addLabelToCard,
}));
jest.unstable_mockModule("../operations/cards.js", () => ({ createCard }));
jest.unstable_mockModule("../operations/taskLists.js", () => ({
  createTaskList: createTaskListOp,
}));
jest.unstable_mockModule("../operations/tasks.js", () => ({
  createTask,
  updateTask,
}));
jest.unstable_mockModule("../operations/comments.js", () => ({
  createComment,
}));

// ---------------------------------------------------------------------------
// Module under test (imported after mocks are registered)
// ---------------------------------------------------------------------------

const boardSeed = await import("../scripts/seed.js");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const project = { id: "project-1", name: "Test Project" };
const board = { id: "board-1", name: "Demo Board", projectId: "project-1" };

const listFixtures = [
  { id: "list-backlog", name: "Backlog" },
  { id: "list-todo", name: "To Do" },
  { id: "list-ip", name: "In Progress" },
  { id: "list-oh", name: "On Hold" },
  { id: "list-review", name: "Review" },
  { id: "list-done", name: "Done" },
];

const labelFixtures = [
  { id: "label-p0", name: "P0: Critical" },
  { id: "label-p1", name: "P1: High" },
  { id: "label-p2", name: "P2: Medium" },
  { id: "label-p3", name: "P3: Low" },
  { id: "label-bug", name: "Bug" },
  { id: "label-feature", name: "Feature" },
  { id: "label-enhancement", name: "Enhancement" },
  { id: "label-docs", name: "Documentation" },
  { id: "label-blocked", name: "Blocked" },
  { id: "label-ni", name: "Needs Info" },
  { id: "label-ready", name: "Ready" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset all mocks and set up standard passing behaviour. */
function setupHappyPath() {
  getProject.mockResolvedValue(project);
  getProjects.mockResolvedValue({ items: [project] });
  createProject.mockResolvedValue(project);
  getBoardsStrict.mockResolvedValue([]);
  createBoard.mockResolvedValue(board);
  getLists.mockResolvedValue(listFixtures);
  getLabels.mockResolvedValue(labelFixtures);

  let cardIdx = 0;
  createCard.mockImplementation(async (opts) => ({
    id: `card-${++cardIdx}`,
    ...opts,
  }));

  let tli = 0;
  createTaskListOp.mockImplementation(async (opts) => ({
    id: `tasklist-${++tli}`,
    ...opts,
  }));

  let taskIdx = 0;
  createTask.mockImplementation(async (opts) => ({
    id: `task-${++taskIdx}`,
    ...opts,
  }));

  updateTask.mockImplementation(async (id, opts) => ({ id, ...opts }));
  addLabelToCard.mockResolvedValue({ success: true });

  let commentIdx = 0;
  createComment.mockImplementation(async (opts) => ({
    id: `comment-${++commentIdx}`,
    ...opts,
  }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("seedBoard orchestration", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    process.env.PLANKA_BASE_URL = "http://planka:3000";
  });

  afterEach(() => {
    delete process.env.PLANKA_BASE_URL;
  });

  // -----------------------------------------------------------------------
  // Success paths
  // -----------------------------------------------------------------------

  test("all cards with task lists use the project card type", () => {
    const cardsWithTaskLists = boardSeed.SEED_CARDS.filter((card) => card.taskLists.length > 0);

    expect(cardsWithTaskLists.length).toBeGreaterThan(0);
    expect(cardsWithTaskLists.every((card) => card.type === "project")).toBe(true);
  });

  test("seed data covers both supported card types", () => {
    expect(new Set(boardSeed.SEED_CARDS.map((card) => card.type))).toEqual(
      new Set(["project", "story"]),
    );
  });

  test("seedBoard completes successfully and returns correct resource summary", async () => {
    setupHappyPath();

    const summary = await boardSeed.seedBoard({ projectId: "project-1" });

    expect(summary).toEqual({
      projectId: "project-1",
      boardId: "board-1",
      boardName: "Demo Board",
      resources: {
        cards: 35,
        labels: 10,
        taskLists: 37,
        tasks: 153,
        comments: 54,
        labelAssignments: 85,
      },
    });

    // Preflight calls
    expect(getProject).toHaveBeenCalledWith("project-1");
    expect(getBoardsStrict).toHaveBeenCalledWith("project-1");

    // Board creation
    expect(createBoard).toHaveBeenCalledWith({
      projectId: "project-1",
      name: "Demo Board",
      position: 65535,
    });

    // List / label loading
    expect(getLists).toHaveBeenCalledWith("board-1");
    expect(getLabels).toHaveBeenCalledWith("board-1");

    // Resource counts
    expect(createCard).toHaveBeenCalledTimes(35);
    expect(createTaskListOp).toHaveBeenCalledTimes(37);
    expect(createTask).toHaveBeenCalledTimes(153);
    expect(updateTask).toHaveBeenCalledTimes(69);
    expect(createComment).toHaveBeenCalledTimes(54);
    expect(addLabelToCard).toHaveBeenCalledTimes(85);

    const doneCardCall = createCard.mock.calls.find(
      ([options]) => options.name === "Fix Login Timeout",
    );
    expect(doneCardCall?.[0]).not.toHaveProperty("dueDate");

    const backlogCardCall = createCard.mock.calls.find(
      ([options]) => options.name === "Q2 Platform Migration",
    );
    expect(backlogCardCall?.[0].dueDate).toEqual(expect.any(String));
  });

  test("assigns card positions independently in fixture order within each list", async () => {
    setupHappyPath();

    await boardSeed.seedBoard({ projectId: "project-1" });

    for (const list of listFixtures) {
      const callsForList = createCard.mock.calls.filter(([options]) => options.listId === list.id);
      expect(callsForList.map(([options]) => options.position)).toEqual(
        callsForList.map((_, index) => boardSeed.positionFor(index)),
      );
    }
  });

  test("seedBoard accepts a custom board name", async () => {
    setupHappyPath();
    createBoard.mockResolvedValueOnce({
      id: "board-custom",
      name: "My Demo",
      projectId: "project-1",
    });

    const summary = await boardSeed.seedBoard({
      projectId: "project-1",
      boardName: "My Demo",
    });

    expect(summary.boardName).toBe("My Demo");
    expect(summary.boardId).toBe("board-custom");
    expect(createBoard).toHaveBeenCalledWith({
      projectId: "project-1",
      name: "My Demo",
      position: 65535,
    });
  });

  test("seedBoard trims whitespace from board name", async () => {
    setupHappyPath();
    createBoard.mockResolvedValueOnce({
      id: "board-trimmed",
      name: "Trimmed Name",
      projectId: "project-1",
    });

    await boardSeed.seedBoard({
      projectId: "project-1",
      boardName: "  Trimmed Name  ",
    });

    expect(createBoard).toHaveBeenCalledWith({
      projectId: "project-1",
      name: "Trimmed Name",
      position: 65535,
    });
  });

  test("seedBoard falls back to default board name when none provided", async () => {
    setupHappyPath();

    await boardSeed.seedBoard({ projectId: "project-1" });

    expect(createBoard).toHaveBeenCalledWith(expect.objectContaining({ name: "Demo Board" }));
  });

  test("reuses the default project when project ID is omitted", async () => {
    setupHappyPath();
    getProjects.mockResolvedValue({
      items: [{ id: "project-1", name: "Demo Project" }],
    });

    const summary = await boardSeed.seedBoard({});

    expect(getProjects).toHaveBeenCalledWith(1, 100);
    expect(createProject).not.toHaveBeenCalled();
    expect(summary.projectId).toBe("project-1");
  });

  test("creates the default project when project ID is omitted and none exists", async () => {
    setupHappyPath();
    getProjects.mockResolvedValue({ items: [] });
    createProject.mockResolvedValue({
      id: "created-project",
      name: "Demo Project",
    });
    createBoard.mockResolvedValue({
      id: "board-1",
      name: "Demo Board",
      projectId: "created-project",
    });

    const summary = await boardSeed.seedBoard({});

    expect(createProject).toHaveBeenCalledWith({
      name: "Demo Project",
      description: "Project created by the Planka MCP development seed script.",
      type: "private",
    });
    expect(summary.projectId).toBe("created-project");
  });

  test("falls back to default project when projectId is an empty string", async () => {
    setupHappyPath();
    getProjects.mockResolvedValue({
      items: [{ id: "project-empty", name: "Demo Project" }],
    });

    const summary = await boardSeed.seedBoard({ projectId: "" });

    expect(getProjects).toHaveBeenCalledWith(1, 100);
    expect(createProject).not.toHaveBeenCalled();
    expect(getProject).not.toHaveBeenCalled();
    expect(summary.projectId).toBe("project-empty");
  });

  // -----------------------------------------------------------------------
  // Environment validation
  // -----------------------------------------------------------------------

  test("throws plain Error when PLANKA_BASE_URL is not set", async () => {
    setupHappyPath();
    delete process.env.PLANKA_BASE_URL;

    await expect(boardSeed.seedBoard({ projectId: "project-1" })).rejects.toThrow(
      "PLANKA_BASE_URL environment variable is required",
    );
  });

  // -----------------------------------------------------------------------
  // Preflight failures
  // -----------------------------------------------------------------------

  test("throws when target project is unreachable", async () => {
    setupHappyPath();
    getProject.mockRejectedValue(new Error("404 Not Found"));

    await expect(boardSeed.seedBoard({ projectId: "missing-project" })).rejects.toThrow(
      "Target project missing-project is not reachable: 404 Not Found",
    );
  });

  test("throws SeedPreflightError when board name already exists", async () => {
    setupHappyPath();
    getBoardsStrict.mockResolvedValue([{ id: "existing-1", name: "Demo Board" }]);

    await expect(boardSeed.seedBoard({ projectId: "project-1" })).rejects.toThrow(
      boardSeed.SeedPreflightError,
    );

    await expect(boardSeed.seedBoard({ projectId: "project-1" })).rejects.toThrow(
      'Board name "Demo Board" already exists in project project-1.',
    );
  });

  test("fails closed without creating a board when the duplicate lookup fails", async () => {
    setupHappyPath();
    getBoardsStrict.mockRejectedValue(new Error("network error"));

    await expect(boardSeed.seedBoard({ projectId: "project-1" })).rejects.toThrow(
      'Could not verify whether board name "Demo Board" already exists in project project-1: ' +
        "network error",
    );

    expect(createBoard).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Board creation failure
  // -----------------------------------------------------------------------

  test("throws plain Error when createBoard fails", async () => {
    setupHappyPath();
    createBoard.mockRejectedValue(new Error("API rate limit"));

    await expect(boardSeed.seedBoard({ projectId: "project-1" })).rejects.toThrow(
      "Failed to create board: API rate limit",
    );
  });

  // -----------------------------------------------------------------------
  // Resource validation failures
  // -----------------------------------------------------------------------

  test("throws SeedResourceValidationError when lists are missing", async () => {
    setupHappyPath();
    getLists.mockResolvedValue([{ id: "l1", name: "Wrong List" }]);

    let error: unknown;
    try {
      await boardSeed.seedBoard({ projectId: "project-1" });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(boardSeed.SeedResourceValidationError);
    if (error instanceof boardSeed.SeedResourceValidationError) {
      expect(error.boardId).toBe("board-1");
      expect(error.message).toContain("Missing list(s)");
      expect(error.message).toContain("Backlog");
    }
  });

  test("throws SeedResourceValidationError when labels are missing", async () => {
    setupHappyPath();
    getLabels.mockResolvedValue([{ id: "lab1", name: "Wrong Label" }]);

    let error: unknown;
    try {
      await boardSeed.seedBoard({ projectId: "project-1" });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(boardSeed.SeedResourceValidationError);
    if (error instanceof boardSeed.SeedResourceValidationError) {
      expect(error.boardId).toBe("board-1");
      expect(error.message).toContain("Missing label(s)");
    }
  });

  // -----------------------------------------------------------------------
  // Population failures
  // -----------------------------------------------------------------------

  test("throws SeedPopulationError when card creation fails", async () => {
    setupHappyPath();
    createCard.mockRejectedValue(new Error("rate limited"));

    let error: unknown;
    try {
      await boardSeed.seedBoard({ projectId: "project-1" });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(boardSeed.SeedPopulationError);
    if (error instanceof boardSeed.SeedPopulationError) {
      expect(error.stage).toContain("createCard");
      expect(error.stage).toContain("Q2 Platform Migration");
      expect(error.boardId).toBe("board-1");
    }
  });

  test("throws SeedPopulationError when label assignment fails", async () => {
    setupHappyPath();
    // First card create succeeds, then label assignment fails
    createCard.mockResolvedValueOnce({ id: "card-first" });
    addLabelToCard.mockRejectedValue(new Error("invalid label"));

    let error: unknown;
    try {
      await boardSeed.seedBoard({ projectId: "project-1" });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(boardSeed.SeedPopulationError);
    if (error instanceof boardSeed.SeedPopulationError) {
      expect(error.stage).toContain("addLabelToCard");
      expect(error.boardId).toBe("board-1");
    }
  });

  test("throws SeedPopulationError when task list creation fails", async () => {
    setupHappyPath();
    // Set up createCard to succeed once, then fail createTaskList
    createCard.mockResolvedValueOnce({
      id: "card-first",
      listId: "list-backlog",
    });
    createTaskListOp.mockRejectedValue(new Error("task list limit"));

    let error: unknown;
    try {
      await boardSeed.seedBoard({ projectId: "project-1" });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(boardSeed.SeedPopulationError);
    if (error instanceof boardSeed.SeedPopulationError) {
      expect(error.stage).toContain("createTaskList");
      expect(error.boardId).toBe("board-1");
    }
  });

  test("throws SeedPopulationError when task creation fails", async () => {
    setupHappyPath();
    createCard.mockResolvedValueOnce({
      id: "card-first",
      listId: "list-backlog",
    });
    createTaskListOp.mockResolvedValueOnce({ id: "tl-1" });

    // Set remaining mocks to resolve by default, but fail the first createTask
    addLabelToCard.mockResolvedValue({ success: true });
    createComment.mockResolvedValue({ id: "c1" });
    createTask.mockRejectedValue(new Error("task limit"));

    let error: unknown;
    try {
      await boardSeed.seedBoard({ projectId: "project-1" });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(boardSeed.SeedPopulationError);
    if (error instanceof boardSeed.SeedPopulationError) {
      expect(error.stage).toContain("createTask");
      expect(error.boardId).toBe("board-1");
    }
  });

  test("throws SeedPopulationError when updateTask fails", async () => {
    setupHappyPath();
    // First card create, task list create, and task creates succeed
    createCard.mockResolvedValueOnce({
      id: "card-first",
      listId: "list-backlog",
    });
    createTaskListOp.mockResolvedValueOnce({ id: "tl-1" });
    createTask.mockResolvedValueOnce({ id: "task-1" });
    // updateTask fails for the completed task
    updateTask.mockRejectedValue(new Error("update failed"));

    // Default resolve for other calls that may happen before the failure
    addLabelToCard.mockResolvedValue({ success: true });

    let error: unknown;
    try {
      await boardSeed.seedBoard({ projectId: "project-1" });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(boardSeed.SeedPopulationError);
    if (error instanceof boardSeed.SeedPopulationError) {
      expect(error.stage).toContain("updateTask");
      expect(error.boardId).toBe("board-1");
    }
  });

  test("throws SeedPopulationError when comment creation fails", async () => {
    setupHappyPath();
    // First card create and all other operations succeed, but comment creation fails
    createComment.mockRejectedValue(new Error("comment blocked"));

    let error: unknown;
    try {
      await boardSeed.seedBoard({ projectId: "project-1" });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(boardSeed.SeedPopulationError);
    if (error instanceof boardSeed.SeedPopulationError) {
      expect(error.stage).toContain("createComment");
      expect(error.stage).toContain("Q2 Platform Migration");
      expect(error.boardId).toBe("board-1");
    }
  });

  // -----------------------------------------------------------------------
  // Helper functions
  // -----------------------------------------------------------------------

  describe("positionFor", () => {
    test("returns (index + 1) * 65535", () => {
      expect(boardSeed.positionFor(0)).toBe(65535);
      expect(boardSeed.positionFor(1)).toBe(131070);
      expect(boardSeed.positionFor(2)).toBe(196605);
    });
  });

  describe("computeDueDate", () => {
    test("returns null when offsetDays is undefined", () => {
      const clock = new Date("2026-07-01T12:00:00.000Z");
      expect(boardSeed.computeDueDate(clock)).toBeNull();
    });

    test("returns ISO date string when offsetDays is 0", () => {
      const clock = new Date("2026-07-01T12:00:00.000Z");
      const result = boardSeed.computeDueDate(clock, 0);
      expect(result).toBe("2026-07-01T12:00:00.000Z");
    });

    test("computes future date from offset", () => {
      const clock = new Date("2026-07-01T12:00:00.000Z");
      const result = boardSeed.computeDueDate(clock, 7);
      expect(result).toBe("2026-07-08T12:00:00.000Z");
    });

    test("handles negative offset (past dates)", () => {
      const clock = new Date("2026-07-10T12:00:00.000Z");
      const result = boardSeed.computeDueDate(clock, -5);
      expect(result).toBe("2026-07-05T12:00:00.000Z");
    });

    test("does not mutate the original clock date", () => {
      const clock = new Date("2026-07-01T12:00:00.000Z");
      const originalIso = clock.toISOString();
      boardSeed.computeDueDate(clock, 30);
      expect(clock.toISOString()).toBe(originalIso);
    });
  });

  // -----------------------------------------------------------------------
  // Exported constants
  // -----------------------------------------------------------------------

  describe("DEFAULT_BOARD_NAME", () => {
    test('is "Demo Board"', () => {
      expect(boardSeed.DEFAULT_BOARD_NAME).toBe("Demo Board");
    });
  });

  describe("SEED_CARDS", () => {
    test("contains 35 cards", () => {
      expect(boardSeed.SEED_CARDS).toHaveLength(35);
    });

    test("each card has the required properties", () => {
      for (const card of boardSeed.SEED_CARDS) {
        expect(card).toHaveProperty("listName");
        expect(card).toHaveProperty("name");
        expect(card).toHaveProperty("type");
        expect(["project", "story"]).toContain(card.type);
        expect(card).toHaveProperty("labelNames");
        expect(Array.isArray(card.labelNames)).toBe(true);
        expect(card).toHaveProperty("taskLists");
        expect(Array.isArray(card.taskLists)).toBe(true);
        expect(card).toHaveProperty("comments");
        expect(Array.isArray(card.comments)).toBe(true);
      }
    });

    test("each card references a known list name", () => {
      const knownLists = new Set(["Backlog", "To Do", "In Progress", "On Hold", "Review", "Done"]);
      for (const card of boardSeed.SEED_CARDS) {
        expect(knownLists.has(card.listName)).toBe(true);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Error class identity
  // -----------------------------------------------------------------------

  describe("custom error classes", () => {
    test("SeedPreflightError has correct name", () => {
      const err = new boardSeed.SeedPreflightError("test");
      expect(err.name).toBe("SeedPreflightError");
      expect(err.message).toBe("test");
    });

    test("SeedResourceValidationError carries boardId", () => {
      const err = new boardSeed.SeedResourceValidationError("missing", "b-1");
      expect(err.name).toBe("SeedResourceValidationError");
      expect(err.boardId).toBe("b-1");
      expect(err.message).toBe("missing");
    });

    test("SeedPopulationError carries stage and boardId", () => {
      const err = new boardSeed.SeedPopulationError("failed", "createCard:X", "b-1");
      expect(err.name).toBe("SeedPopulationError");
      expect(err.stage).toBe("createCard:X");
      expect(err.boardId).toBe("b-1");
      expect(err.message).toBe("failed");
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  test("seedBoard works when getBoards returns no boards", async () => {
    setupHappyPath();
    // getBoardsStrict already returns [] from setupHappyPath

    const summary = await boardSeed.seedBoard({ projectId: "project-1" });
    expect(summary.boardName).toBe("Demo Board");
  });

  test("duplicate lookup failures are reported as preflight errors", async () => {
    setupHappyPath();
    getBoardsStrict.mockRejectedValue(new Error("fail"));

    await expect(boardSeed.seedBoard({ projectId: "project-1" })).rejects.toBeInstanceOf(
      boardSeed.SeedPreflightError,
    );
    expect(createBoard).not.toHaveBeenCalled();
  });
});
