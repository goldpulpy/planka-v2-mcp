import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { board } from "./fixtures.js";

type PlankaRequest = (path: string, options?: Record<string, unknown>) => Promise<unknown>;
type CreateList = (options: Record<string, unknown>) => Promise<unknown>;
type CreateLabel = (options: Record<string, unknown>) => Promise<unknown>;
type CreateBoardMembership = (options: Record<string, unknown>) => Promise<unknown>;

const plankaRequest = jest.fn<PlankaRequest>();
const getAdminUserId = jest.fn<() => Promise<string | null>>();
const createList = jest.fn<CreateList>();
const createLabel = jest.fn<CreateLabel>();
const createBoardMembership = jest.fn<CreateBoardMembership>();

jest.unstable_mockModule("../common/utils.js", () => ({
  plankaRequest,
}));

jest.unstable_mockModule("../common/setup.js", () => ({
  getAdminUserId,
}));

jest.unstable_mockModule("../operations/lists.js", () => ({
  createList,
}));

jest.unstable_mockModule("../operations/labels.js", () => ({
  createLabel,
}));

jest.unstable_mockModule("../operations/boardMemberships.js", () => ({
  createBoardMembership,
}));

const boards = await import("../operations/boards.js");

describe("board operations", () => {
  beforeEach(() => {
    plankaRequest.mockReset();
    getAdminUserId.mockReset();
    createList.mockReset();
    createLabel.mockReset();
    createBoardMembership.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  test("createBoard creates the board, admin membership, default lists, and default labels", async () => {
    plankaRequest.mockResolvedValueOnce({ item: board });
    getAdminUserId.mockResolvedValueOnce("admin-1");
    createBoardMembership.mockResolvedValueOnce({ id: "membership-1" });
    createList.mockResolvedValue({});
    createLabel.mockResolvedValue({});

    await expect(
      boards.createBoard({ projectId: "project-1", name: "Board", position: 42 }),
    ).resolves.toEqual(board);

    expect(plankaRequest).toHaveBeenCalledWith("/api/projects/project-1/boards", {
      method: "POST",
      body: { name: "Board", position: 42 },
    });
    expect(createBoardMembership).toHaveBeenCalledWith({
      boardId: "board-1",
      userId: "admin-1",
      role: "editor",
    });
    expect(createList).toHaveBeenCalledTimes(6);
    expect(createList).toHaveBeenNthCalledWith(1, {
      boardId: "board-1",
      name: "Backlog",
      position: 65535,
    });
    expect(createLabel).toHaveBeenCalledTimes(11);
    expect(createLabel).toHaveBeenCalledWith(
      expect.objectContaining({
        boardId: "board-1",
        name: "Bug",
        color: "coral-green",
      }),
    );
  });

  test("createBoard continues when adding an existing admin membership fails", async () => {
    plankaRequest.mockResolvedValueOnce({ item: board });
    getAdminUserId.mockResolvedValueOnce("admin-1");
    createBoardMembership.mockRejectedValueOnce(new Error("User already board member"));
    createList.mockResolvedValue({});
    createLabel.mockResolvedValue({});

    await expect(
      boards.createBoard({ projectId: "project-1", name: "Board", position: 65535 }),
    ).resolves.toEqual(board);
  });

  test("getBoards returns included boards and falls back to an empty list", async () => {
    plankaRequest
      .mockResolvedValueOnce({ included: { boards: [board] } })
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("offline"));

    await expect(boards.getBoards("project-1")).resolves.toEqual([board]);
    await expect(boards.getBoards("project-1")).resolves.toEqual([]);
    await expect(boards.getBoards("project-1")).resolves.toEqual([]);
  });

  test("get, update, and delete board use board endpoints", async () => {
    plankaRequest
      .mockResolvedValueOnce({ item: board })
      .mockResolvedValueOnce({ item: { ...board, name: "Renamed" } })
      .mockResolvedValueOnce({});

    await expect(boards.getBoard("board-1")).resolves.toEqual(board);
    await expect(boards.updateBoard("board-1", { name: "Renamed" })).resolves.toMatchObject({
      name: "Renamed",
    });
    await expect(boards.deleteBoard("board-1")).resolves.toEqual({ success: true });

    expect(plankaRequest).toHaveBeenNthCalledWith(1, "/api/boards/board-1");
    expect(plankaRequest).toHaveBeenNthCalledWith(2, "/api/boards/board-1", {
      method: "PATCH",
      body: { name: "Renamed" },
    });
    expect(plankaRequest).toHaveBeenNthCalledWith(3, "/api/boards/board-1", {
      method: "DELETE",
    });
  });
});
