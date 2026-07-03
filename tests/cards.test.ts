import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { board, card } from "./fixtures.js";

type PlankaRequest = (path: string, options?: Record<string, unknown>) => Promise<unknown>;

const plankaRequest = jest.fn<PlankaRequest>();

jest.unstable_mockModule("../common/utils.js", () => ({
  plankaRequest,
}));

const cards = await import("../operations/cards.js");

describe("card operations", () => {
  beforeEach(() => {
    plankaRequest.mockReset();
    jest.useRealTimers();
  });

  test("creates cards with default type and position", async () => {
    plankaRequest.mockResolvedValueOnce({ item: card });

    await expect(
      cards.createCard({ listId: "list-1", name: "Card", type: "project" }),
    ).resolves.toEqual(card);

    expect(plankaRequest).toHaveBeenCalledWith("/api/lists/list-1/cards", {
      method: "POST",
      body: {
        name: "Card",
        type: "project",
        description: undefined,
        position: 65535,
        dueDate: undefined,
      },
    });
  });

  test("updates completion using Planka due-completion field", async () => {
    plankaRequest.mockResolvedValueOnce({ item: { ...card, isDueCompleted: true } });

    await expect(cards.updateCard("card-1", { isCompleted: true })).resolves.toMatchObject({
      isDueCompleted: true,
    });

    expect(plankaRequest).toHaveBeenCalledWith("/api/cards/card-1", {
      method: "PATCH",
      body: { isDueCompleted: true },
    });
  });

  test("moves cards with default position and optional board ID", async () => {
    plankaRequest.mockResolvedValueOnce({ item: { ...card, listId: "list-2" } });

    await expect(cards.moveCard("card-1", "list-2", undefined, "board-2")).resolves.toMatchObject({
      listId: "list-2",
    });

    expect(plankaRequest).toHaveBeenCalledWith("/api/cards/card-1", {
      method: "PATCH",
      body: {
        listId: "list-2",
        position: 65535,
        boardId: "board-2",
      },
    });
  });

  test("archives cards by moving them to the board archive list", async () => {
    const archiveList = { id: "archive-list", type: "archive" };
    plankaRequest
      .mockResolvedValueOnce({ item: card })
      .mockResolvedValueOnce({ item: board, included: { lists: [archiveList] } })
      .mockResolvedValueOnce({ item: { ...card, listId: "archive-list" } });

    await expect(cards.archiveCard("card-1")).resolves.toMatchObject({ listId: "archive-list" });

    expect(plankaRequest).toHaveBeenNthCalledWith(3, "/api/cards/card-1", {
      method: "PATCH",
      body: {
        listId: "archive-list",
        position: 65535,
      },
    });
  });

  test("returns an empty card list when list lookup fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    plankaRequest.mockRejectedValueOnce(new Error("offline"));

    await expect(cards.getCards("list-1")).resolves.toEqual([]);
  });

  test("reports stopwatch status for idle and running cards", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-04T12:01:05.000Z"));
    plankaRequest
      .mockResolvedValueOnce({ item: { ...card, stopwatch: null } })
      .mockResolvedValueOnce({
        item: {
          ...card,
          stopwatch: {
            startedAt: "2026-07-04T12:00:00.000Z",
            total: 3600,
          },
        },
      });

    await expect(cards.getCardStopwatch("card-1")).resolves.toEqual({
      isRunning: false,
      total: 0,
      current: 0,
      formattedTotal: "0s",
      formattedCurrent: "0s",
    });
    await expect(cards.getCardStopwatch("card-1")).resolves.toEqual({
      isRunning: true,
      total: 3600,
      current: 65,
      startedAt: "2026-07-04T12:00:00.000Z",
      formattedTotal: "1h 0m 0s",
      formattedCurrent: "1m 5s",
    });
  });

  test("stops a running stopwatch by adding elapsed seconds to the total", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-04T12:01:30.000Z"));
    plankaRequest
      .mockResolvedValueOnce({
        item: {
          ...card,
          stopwatch: {
            startedAt: "2026-07-04T12:00:00.000Z",
            total: 30,
          },
        },
      })
      .mockResolvedValueOnce({ item: { ...card, stopwatch: { startedAt: null, total: 120 } } });

    await expect(cards.stopCardStopwatch("card-1")).resolves.toMatchObject({
      stopwatch: { startedAt: null, total: 120 },
    });

    expect(plankaRequest).toHaveBeenNthCalledWith(2, "/api/cards/card-1", {
      method: "PATCH",
      body: {
        stopwatch: {
          startedAt: null,
          total: 120,
        },
      },
    });
  });
});
