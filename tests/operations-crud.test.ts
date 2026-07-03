import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import {
  boardMembership,
  cardMembership,
  comment,
  label,
  list,
  project,
  taskList,
} from "./fixtures.js";

type PlankaRequest = (path: string, options?: Record<string, unknown>) => Promise<unknown>;

const plankaRequest = jest.fn<PlankaRequest>();

jest.unstable_mockModule("../common/utils.js", () => ({
  getUserIdByEmail: jest.fn(),
  plankaRequest,
}));

const projects = await import("../operations/projects.js");
const lists = await import("../operations/lists.js");
const labels = await import("../operations/labels.js");
const comments = await import("../operations/comments.js");
const users = await import("../operations/users.js");
const cardMemberships = await import("../operations/cardMemberships.js");
const taskLists = await import("../operations/taskLists.js");
const boardMemberships = await import("../operations/boardMemberships.js");

describe("operation CRUD wrappers", () => {
  beforeEach(() => {
    plankaRequest.mockReset();
  });

  test("project operations call the expected endpoints and shape responses", async () => {
    plankaRequest
      .mockResolvedValueOnce({ items: [project] })
      .mockResolvedValueOnce({ item: project })
      .mockResolvedValueOnce({ item: { ...project, type: "private" } })
      .mockResolvedValueOnce({ item: { ...project, name: "Renamed" } })
      .mockResolvedValueOnce({});

    await expect(projects.getProjects(2, 150)).resolves.toEqual({
      items: [project],
    });
    await expect(projects.getProject("project-1")).resolves.toEqual(project);
    await expect(
      projects.createProject({ name: "Project", type: "private" }),
    ).resolves.toMatchObject({
      name: "Project",
    });
    await expect(projects.updateProject("project-1", { name: "Renamed" })).resolves.toMatchObject({
      name: "Renamed",
    });
    await expect(projects.deleteProject("project-1")).resolves.toEqual({
      success: true,
    });

    expect(plankaRequest).toHaveBeenNthCalledWith(1, "/api/projects?page=2&perPage=100", {
      method: "GET",
    });
    expect(plankaRequest).toHaveBeenNthCalledWith(3, "/api/projects", {
      method: "POST",
      body: { name: "Project", type: "private" },
    });
    expect(plankaRequest).toHaveBeenNthCalledWith(5, "/api/projects/project-1", {
      method: "DELETE",
    });
  });

  test("list operations read included lists and default new lists to active", async () => {
    plankaRequest
      .mockResolvedValueOnce({ item: list })
      .mockResolvedValueOnce({ included: { lists: [list] } })
      .mockResolvedValueOnce({ item: { ...list, name: "Doing" } })
      .mockResolvedValueOnce({ item: { ...list, name: "Done" } })
      .mockResolvedValueOnce({});

    await expect(lists.createList({ boardId: "board-1", name: "Backlog" })).resolves.toEqual(list);
    await expect(lists.getLists("board-1")).resolves.toEqual([list]);
    await expect(lists.getList("list-1")).resolves.toMatchObject({
      id: "list-1",
    });
    await expect(lists.updateList("list-1", { name: "Done" })).resolves.toMatchObject({
      name: "Done",
    });
    await expect(lists.deleteList("list-1")).resolves.toEqual({
      success: true,
    });

    expect(plankaRequest).toHaveBeenNthCalledWith(1, "/api/boards/board-1/lists", {
      method: "POST",
      body: { name: "Backlog", position: undefined, type: "active" },
    });
  });

  test("label operations cover CRUD and card label endpoints", async () => {
    plankaRequest
      .mockResolvedValueOnce({ item: label })
      .mockResolvedValueOnce({ included: { labels: [label] } })
      .mockResolvedValueOnce({ item: label })
      .mockResolvedValueOnce({ item: { ...label, name: "Urgent" } })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    await expect(
      labels.createLabel({
        boardId: "board-1",
        name: "Bug",
        color: "berry-red",
      }),
    ).resolves.toEqual(label);
    await expect(labels.getLabels("board-1")).resolves.toEqual([label]);
    await expect(labels.getLabel("label-1")).resolves.toEqual(label);
    await expect(labels.updateLabel("label-1", { name: "Urgent" })).resolves.toMatchObject({
      name: "Urgent",
    });
    await expect(labels.deleteLabel("label-1")).resolves.toEqual({
      success: true,
    });
    await expect(labels.addLabelToCard("card-1", "label-1")).resolves.toEqual({
      success: true,
    });
    await expect(labels.removeLabelFromCard("card-1", "label-1")).resolves.toEqual({
      success: true,
    });

    expect(plankaRequest).toHaveBeenNthCalledWith(1, "/api/boards/board-1/labels", {
      method: "POST",
      body: { name: "Bug", color: "berry-red", position: 65535 },
    });
    expect(plankaRequest).toHaveBeenNthCalledWith(
      7,
      "/api/cards/card-1/card-labels/labelId:label-1",
      { method: "DELETE" },
    );
  });

  test("comment operations filter by card and use comment mutation endpoints", async () => {
    plankaRequest
      .mockResolvedValueOnce({ item: comment })
      .mockResolvedValueOnce({ items: [comment] })
      .mockResolvedValueOnce({ items: [comment] })
      .mockResolvedValueOnce({ item: { ...comment, text: "Updated" } })
      .mockResolvedValueOnce({});

    await expect(comments.createComment({ cardId: "card-1", text: "Looks good" })).resolves.toEqual(
      comment,
    );
    await expect(comments.getComments("card-1")).resolves.toEqual([comment]);
    await expect(comments.getComment("card-1", "comment-1")).resolves.toEqual(comment);
    await expect(comments.updateComment("comment-1", { text: "Updated" })).resolves.toMatchObject({
      text: "Updated",
    });
    await expect(comments.deleteComment("comment-1")).resolves.toEqual({
      success: true,
    });

    expect(plankaRequest).toHaveBeenNthCalledWith(1, "/api/cards/card-1/comments", {
      method: "POST",
      body: { text: "Looks good" },
    });
  });

  test("user operations return parsed users with pagination defaults", async () => {
    const user = { id: "user-1", email: "user@example.test", name: "User" };
    plankaRequest.mockResolvedValueOnce({ items: [user] }).mockResolvedValueOnce({ item: user });

    await expect(users.getUsers()).resolves.toEqual([user]);
    await expect(users.getUser("user-1")).resolves.toEqual(user);

    expect(plankaRequest).toHaveBeenNthCalledWith(1, "/api/users?page=1&perPage=100");
    expect(plankaRequest).toHaveBeenNthCalledWith(2, "/api/users/user-1");
  });

  test("card membership operations use included data and relationship endpoints", async () => {
    plankaRequest
      .mockResolvedValueOnce({
        included: { cardMemberships: [cardMembership] },
      })
      .mockResolvedValueOnce({ item: cardMembership })
      .mockResolvedValueOnce({});

    await expect(cardMemberships.getCardMemberships("card-1")).resolves.toEqual([cardMembership]);
    await expect(cardMemberships.createCardMembership("card-1", "user-1")).resolves.toEqual(
      cardMembership,
    );
    await expect(cardMemberships.deleteCardMembership("card-1", "user-1")).resolves.toEqual({
      success: true,
    });

    expect(plankaRequest).toHaveBeenNthCalledWith(2, "/api/cards/card-1/card-memberships", {
      method: "POST",
      body: { userId: "user-1" },
    });
    expect(plankaRequest).toHaveBeenNthCalledWith(
      3,
      "/api/cards/card-1/card-memberships/userId:user-1",
      { method: "DELETE" },
    );
  });

  test("task list operations use card and task-list endpoints", async () => {
    plankaRequest
      .mockResolvedValueOnce({ item: taskList })
      .mockResolvedValueOnce({ included: { taskLists: [taskList] } })
      .mockResolvedValueOnce({ item: taskList })
      .mockResolvedValueOnce({ item: { ...taskList, name: "Checklist" } })
      .mockResolvedValueOnce({});

    await expect(taskLists.createTaskList({ cardId: "card-1", name: "Tasks" })).resolves.toEqual(
      taskList,
    );
    await expect(taskLists.getTaskLists("card-1")).resolves.toEqual([taskList]);
    await expect(taskLists.getTaskList("task-list-1")).resolves.toEqual(taskList);
    await expect(
      taskLists.updateTaskList("task-list-1", { name: "Checklist" }),
    ).resolves.toMatchObject({
      name: "Checklist",
    });
    await expect(taskLists.deleteTaskList("task-list-1")).resolves.toEqual({
      success: true,
    });

    expect(plankaRequest).toHaveBeenNthCalledWith(1, "/api/cards/card-1/task-lists", {
      method: "POST",
      body: { name: "Tasks", position: 65535 },
    });
  });

  test("board memberships read included memberships and mutate by ID", async () => {
    plankaRequest
      .mockResolvedValueOnce({ item: boardMembership })
      .mockResolvedValueOnce({
        included: { boardMemberships: [boardMembership] },
      })
      .mockResolvedValueOnce({
        included: { boardMemberships: [boardMembership] },
      })
      .mockResolvedValueOnce({ item: { ...boardMembership, role: "viewer" } })
      .mockResolvedValueOnce({});

    await expect(
      boardMemberships.createBoardMembership({
        boardId: "board-1",
        projectId: "project-1",
        userId: "user-1",
        role: "editor",
      }),
    ).resolves.toEqual(boardMembership);
    await expect(boardMemberships.getBoardMemberships("board-1")).resolves.toEqual([
      boardMembership,
    ]);
    await expect(
      boardMemberships.getBoardMembership("board-1", "board-membership-1"),
    ).resolves.toEqual(boardMembership);
    await expect(
      boardMemberships.updateBoardMembership("board-membership-1", {
        id: "ignored",
        role: "viewer",
      }),
    ).resolves.toMatchObject({ role: "viewer" });
    await expect(boardMemberships.deleteBoardMembership("board-membership-1")).resolves.toEqual({
      success: true,
    });

    expect(plankaRequest).toHaveBeenNthCalledWith(1, "/api/boards/board-1/board-memberships", {
      method: "POST",
      body: { boardId: "board-1", userId: "user-1", role: "editor" },
    });
    expect(plankaRequest).toHaveBeenNthCalledWith(4, "/api/board-memberships/board-membership-1", {
      method: "PATCH",
      body: { role: "viewer" },
    });
  });
});
