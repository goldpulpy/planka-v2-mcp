/** @fileoverview Unit tests for the development-only board seed CLI. */

import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";

const cli = await import("../scripts/seed.js");
const runSeed = jest.fn<typeof cli.seedBoard>();

const summary: Awaited<ReturnType<typeof cli.seedBoard>> = {
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
};

describe("parseArgs", () => {
  test("allows an empty argument list", () => {
    expect(cli.parseArgs([])).toEqual({ help: false });
  });

  test("parses project and board overrides", () => {
    expect(cli.parseArgs(["--project-id", "project-1", "--board-name", "My Demo"])).toEqual({
      help: false,
      projectId: "project-1",
      boardName: "My Demo",
    });
  });

  test("parses help", () => {
    expect(cli.parseArgs(["--help"]).help).toBe(true);
  });

  test("rejects an option followed by another flag instead of a value", () => {
    expect(() => cli.parseArgs(["--project-id", "--board-name", "Demo"])).toThrow(
      "--project-id requires a value",
    );
  });

  test("rejects an option at the end of the argument list", () => {
    expect(() => cli.parseArgs(["--project-id"])).toThrow("--project-id requires a value");
  });

  test.each(["--project_id", "project-1"])("rejects unknown argument %s", (argument) => {
    expect(() => cli.parseArgs([argument])).toThrow(`unknown argument "${argument}"`);
  });
});

describe("main", () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    runSeed.mockReset();
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test("prints help without running the seed", async () => {
    await expect(cli.main(["--help"], runSeed)).resolves.toBe(0);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Usage: npm run seed"));
    expect(runSeed).not.toHaveBeenCalled();
  });

  test("runs without a project ID", async () => {
    runSeed.mockResolvedValue(summary);

    await expect(cli.main([], runSeed)).resolves.toBe(0);

    expect(runSeed).toHaveBeenCalledWith({});
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Board seeded successfully"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("project-1"));
  });

  test("passes project and board overrides", async () => {
    runSeed.mockResolvedValue({ ...summary, boardName: "Custom" });

    await expect(
      cli.main(["--project-id", "project-1", "--board-name", "Custom"], runSeed),
    ).resolves.toBe(0);

    expect(runSeed).toHaveBeenCalledWith({
      projectId: "project-1",
      boardName: "Custom",
    });
  });

  test("rejects an explicitly empty project ID", async () => {
    await expect(cli.main(["--project-id", "   "], runSeed)).resolves.toBe(1);

    expect(errorSpy).toHaveBeenCalledWith("Error: --project-id must not be empty when provided");
    expect(runSeed).not.toHaveBeenCalled();
  });

  test("rejects an explicitly empty board name", async () => {
    await expect(cli.main(["--board-name", "   "], runSeed)).resolves.toBe(1);

    expect(errorSpy).toHaveBeenCalledWith("Error: --board-name must not be empty when provided");
    expect(runSeed).not.toHaveBeenCalled();
  });

  test("rejects a missing option value without running the seed", async () => {
    await expect(cli.main(["--project-id", "--board-name", "Demo"], runSeed)).resolves.toBe(1);

    expect(errorSpy).toHaveBeenCalledWith("Error: --project-id requires a value");
    expect(runSeed).not.toHaveBeenCalled();
  });

  test("rejects unknown arguments without running the seed", async () => {
    await expect(cli.main(["--project_id", "project-1"], runSeed)).resolves.toBe(1);

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: unknown argument "--project_id" (run with --help for usage)',
    );
    expect(runSeed).not.toHaveBeenCalled();
  });

  test("reports duplicate-board failures", async () => {
    runSeed.mockRejectedValue(
      new cli.SeedPreflightError('Board name "Demo Board" already exists.'),
    );

    await expect(cli.main([], runSeed)).resolves.toBe(1);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Board name"));
  });

  test("reports missing resources with the partial board ID", async () => {
    runSeed.mockRejectedValue(
      new cli.SeedResourceValidationError("Missing list(s): Backlog", "board-123"),
    );

    await expect(cli.main([], runSeed)).resolves.toBe(1);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Board "board-123" was created'));
  });

  test("reports population stage and partial board ID", async () => {
    runSeed.mockRejectedValue(
      new cli.SeedPopulationError("Failed to create card", "createCard:Example", "board-456"),
    );

    await expect(cli.main([], runSeed)).resolves.toBe(1);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('stage "createCard:Example"'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Board "board-456"'));
  });

  test("reports generic failures", async () => {
    runSeed.mockRejectedValue(new Error("Network timeout"));

    await expect(cli.main([], runSeed)).resolves.toBe(1);

    expect(errorSpy).toHaveBeenCalledWith("Error: Network timeout");
  });
});
