import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { task, taskList } from "./fixtures.js";

type PlankaRequest = (path: string, options?: Record<string, unknown>) => Promise<unknown>;
type GetTaskLists = (cardId: string) => Promise<Array<{ id: string }>>;
type CreateTaskList = (options: { cardId: string; name: string }) => Promise<{ id: string }>;

const plankaRequest = jest.fn<PlankaRequest>();
const getTaskLists = jest.fn<GetTaskLists>();
const createTaskList = jest.fn<CreateTaskList>();

jest.unstable_mockModule("../common/utils.js", () => ({
  plankaRequest,
}));

jest.unstable_mockModule("../operations/taskLists.js", () => ({
  getTaskLists,
  createTaskList,
}));

const tasks = await import("../operations/tasks.js");

describe("task operations", () => {
  beforeEach(() => {
    plankaRequest.mockReset();
    getTaskLists.mockReset();
    createTaskList.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  test("creates a task directly in a task list with the default position", async () => {
    plankaRequest.mockResolvedValueOnce({ item: task });

    await expect(tasks.createTask({ taskListId: "task-list-1", name: "Task" })).resolves.toEqual(
      task,
    );

    expect(plankaRequest).toHaveBeenCalledWith("/api/task-lists/task-list-1/tasks", {
      method: "POST",
      body: { name: "Task", position: 65535 },
    });
  });

  test("creates a default task list when card compatibility mode finds none", async () => {
    getTaskLists.mockResolvedValueOnce([]);
    createTaskList.mockResolvedValueOnce(taskList);
    plankaRequest.mockResolvedValueOnce({ item: task });

    await expect(tasks.createTask({ cardId: "card-1", name: "Task" })).resolves.toEqual(task);

    expect(createTaskList).toHaveBeenCalledWith({ cardId: "card-1", name: "Tasks" });
    expect(plankaRequest).toHaveBeenCalledWith("/api/task-lists/task-list-1/tasks", {
      method: "POST",
      body: { name: "Task", position: 65535 },
    });
  });

  test("flattens tasks from all task lists on a card", async () => {
    getTaskLists.mockResolvedValueOnce([{ id: "task-list-1" }, { id: "task-list-2" }]);
    plankaRequest
      .mockResolvedValueOnce({ included: { tasks: [task] } })
      .mockResolvedValueOnce({ included: { tasks: [{ ...task, id: "task-2" }] } });

    await expect(tasks.getTasks("card-1")).resolves.toEqual([task, { ...task, id: "task-2" }]);
  });

  test("batchCreateTasks records successes and failures", async () => {
    plankaRequest
      .mockResolvedValueOnce({ item: task })
      .mockRejectedValueOnce(new Error("Planka rejected task"));

    await expect(
      tasks.batchCreateTasks({
        tasks: [
          { taskListId: "task-list-1", name: "First" },
          { taskListId: "task-list-1", name: "Second" },
        ],
      }),
    ).resolves.toMatchObject({
      results: [{ success: true, result: task }, { success: false }],
      successes: [task],
      failures: [{ index: 1, error: expect.stringContaining("Planka rejected task") }],
    });
  });

  test("getTask throws a contextual error when a task is absent", async () => {
    getTaskLists.mockResolvedValueOnce([{ id: "task-list-1" }]);
    plankaRequest.mockResolvedValueOnce({ included: { tasks: [task] } });

    await expect(tasks.getTask("card-1", "missing-task")).rejects.toThrow(
      "Failed to get task: Task missing-task not found on card card-1",
    );
  });

  test("updateTask strips the ID from the patch body and deleteTask returns success", async () => {
    plankaRequest
      .mockResolvedValueOnce({ item: { ...task, name: "Updated" } })
      .mockResolvedValueOnce({});

    await expect(
      tasks.updateTask("task-1", { id: "ignored", name: "Updated", isCompleted: true }),
    ).resolves.toMatchObject({ name: "Updated" });
    await expect(tasks.deleteTask("task-1")).resolves.toEqual({ success: true });

    expect(plankaRequest).toHaveBeenNthCalledWith(1, "/api/tasks/task-1", {
      method: "PATCH",
      body: { name: "Updated", isCompleted: true },
    });
    expect(plankaRequest).toHaveBeenNthCalledWith(2, "/api/tasks/task-1", {
      method: "DELETE",
    });
  });
});
