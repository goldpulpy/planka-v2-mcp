#!/usr/bin/env node
/**
 * @fileoverview Development-only board seed script
 *
 * This module provides a repeatable board seeding capability — creating a demo board
 * with realistic content (workflow lists, labels, cards, due dates, task lists,
 * tasks, comments, label assignments) in a specified project.
 *
 * This file intentionally owns both orchestration and CLI concerns so board seeding
 * stays outside the production MCP tool surface and normal build output.
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createBoard, getBoardsStrict } from "../operations/boards.js";
import { createCard } from "../operations/cards.js";
import { createComment } from "../operations/comments.js";
import { addLabelToCard, getLabels } from "../operations/labels.js";
import { getLists } from "../operations/lists.js";
import * as projects from "../operations/projects.js";
import { createTaskList as createTaskListOp } from "../operations/taskLists.js";
import { createTask, updateTask } from "../operations/tasks.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SeedTask {
  name: string;
  isCompleted: boolean;
}

export interface SeedTaskList {
  name: string;
  tasks: SeedTask[];
}

export interface SeedCard {
  /** Must match a list name created by createBoard's defaults. */
  listName: string;
  name: string;
  type: "project" | "story";
  description: string | null;
  /** Days offset from the seed-run clock. Omit for no due date. */
  dueDateOffsetDays?: number;
  /** Each name must match a label created by createBoard's defaults. */
  labelNames: string[];
  taskLists: SeedTaskList[];
  comments: string[];
}

export interface SeedSummary {
  projectId: string;
  boardId: string;
  boardName: string;
  resources: {
    cards: number;
    labels: number;
    taskLists: number;
    tasks: number;
    comments: number;
    labelAssignments: number;
  };
}

export interface SeedBoardOptions {
  projectId?: string;
  boardName?: string;
}

// ---------------------------------------------------------------------------
// Custom errors
// ---------------------------------------------------------------------------

/**
 * Thrown when preflight checks fail before any mutation.
 */
export class SeedPreflightError extends Error {
  override name = "SeedPreflightError";
}

/**
 * Thrown when command-line arguments are invalid.
 */
export class SeedArgumentError extends Error {
  override name = "SeedArgumentError";
}

/**
 * Thrown when a resource referenced by the seed definition does not exist on
 * the freshly created board.
 */
export class SeedResourceValidationError extends Error {
  override name = "SeedResourceValidationError";

  constructor(
    message: string,
    public readonly boardId: string,
  ) {
    super(message);
  }
}

/**
 * Thrown when a population operation fails after the board has been created.
 * Carries the failed stage name and board ID so the CLI can surface
 * actionable partial-failure context.
 */
export class SeedPopulationError extends Error {
  override name = "SeedPopulationError";

  constructor(
    message: string,
    public readonly stage: string,
    public readonly boardId: string,
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DEFAULT_BOARD_NAME = "Demo Board";
const DEFAULT_PROJECT_NAME = "Demo Project";

async function resolveProjectId(projectId?: string): Promise<string> {
  const explicitProjectId = projectId?.trim();
  if (explicitProjectId) {
    try {
      await projects.getProject(explicitProjectId);
      return explicitProjectId;
    } catch (error) {
      throw new Error(
        `Target project ${explicitProjectId} is not reachable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const { items } = await projects.getProjects(1, 100);
  const existingProject = items.find(
    (project: { id: string; name: string }) => project.name === DEFAULT_PROJECT_NAME,
  );
  if (existingProject) {
    return existingProject.id;
  }

  const project = await projects.createProject({
    name: DEFAULT_PROJECT_NAME,
    description: "Project created by the Planka MCP development seed script.",
    type: "private",
  });
  return project.id;
}

/**
 * Compute a Planka position value based on a 0-based index, using the
 * 65535-increment convention used throughout the codebase.
 */
export function positionFor(index: number): number {
  return (index + 1) * 65535;
}

/**
 * Compute an ISO-8601 due-date string from a base clock date and an optional
 * day offset. Returns `null` when no offset is given.
 */
export function computeDueDate(clock: Date, offsetDays?: number): string | null {
  if (offsetDays === undefined) {
    return null;
  }
  const result = new Date(clock);
  result.setDate(result.getDate() + offsetDays);
  return result.toISOString();
}

// ---------------------------------------------------------------------------
// Built-in seed data
// ---------------------------------------------------------------------------

/**
 * The default set of cards seeded into a new board.
 *
 * Each card references workflow-list and label names that match the defaults
 * created by `createBoard` in boards.ts. If those defaults change, the
 * validation step in `seedBoard` will catch every reference and report the
 * mismatches with the board ID.
 */
const require = createRequire(import.meta.url);
const SEED_CARDS = require("./seed-cards.json") as SeedCard[];

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Create and populate a demo board in the given project.
 *
 * Steps:
 * 1. Validate environment
 * 2. Preflight — verify project reachable, check for duplicate board name
 * 3. Create the board (which also creates default lists and labels)
 * 4. Load lists and labels from the board, build name→ID maps
 * 5. Validate every seed-definition list and label name exists
 * 6. Create cards with due dates, label associations, task lists, tasks, comments
 * 7. Return a typed completion summary
 *
 * On partial failure, a `SeedPopulationError` is thrown with the failed stage
 * name and the board ID so callers can surface actionable diagnostic output.
 */
export async function seedBoard(options: SeedBoardOptions): Promise<SeedSummary> {
  const boardName = options.boardName?.trim() || DEFAULT_BOARD_NAME;

  // -----------------------------------------------------------------------
  // 1. Validate environment
  // -----------------------------------------------------------------------
  if (!process.env.PLANKA_BASE_URL) {
    throw new Error("PLANKA_BASE_URL environment variable is required");
  }

  // -----------------------------------------------------------------------
  // 2. Resolve the project, then run the duplicate name guard
  // -----------------------------------------------------------------------
  const projectId = await resolveProjectId(options.projectId);

  let existingBoards: Awaited<ReturnType<typeof getBoardsStrict>>;
  try {
    existingBoards = await getBoardsStrict(projectId);
  } catch (error) {
    throw new SeedPreflightError(
      `Could not verify whether board name "${boardName}" already exists in project ` +
        `${projectId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const duplicate = existingBoards.find((b: { name?: string }) => b.name === boardName);
  if (duplicate) {
    throw new SeedPreflightError(
      `Board name "${boardName}" already exists in project ${projectId}. ` +
        "Choose a different name with --board-name.",
    );
  }

  // -----------------------------------------------------------------------
  // 3. Create the board (includes default lists & labels)
  // -----------------------------------------------------------------------
  let board: { id: string; name: string };
  try {
    board = await createBoard({ projectId, name: boardName, position: 65535 });
  } catch (error) {
    throw new Error(
      `Failed to create board: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // -----------------------------------------------------------------------
  // 4. Load lists and labels, build name→ID maps
  // -----------------------------------------------------------------------
  const boardLists: Array<{ id: string; name: string }> = await getLists(board.id);
  const boardLabels: Array<{ id: string; name: string }> = await getLabels(board.id);

  const listByName = new Map<string, string>();
  for (const list of boardLists) {
    if (list.name) {
      listByName.set(list.name, list.id);
    }
  }

  const labelByName = new Map<string, string>();
  for (const lbl of boardLabels) {
    if (lbl.name) {
      labelByName.set(lbl.name, lbl.id);
    }
  }

  // -----------------------------------------------------------------------
  // 5. Validate seed-definition references
  // -----------------------------------------------------------------------
  const missingLists = new Set<string>();
  const missingLabels = new Set<string>();

  for (const card of SEED_CARDS) {
    if (!listByName.has(card.listName)) {
      missingLists.add(card.listName);
    }
    for (const labelName of card.labelNames) {
      if (!labelByName.has(labelName)) {
        missingLabels.add(labelName);
      }
    }
  }

  if (missingLists.size > 0 || missingLabels.size > 0) {
    const parts: string[] = [];
    if (missingLists.size > 0) {
      parts.push(`Missing list(s): ${[...missingLists].join(", ")}`);
    }
    if (missingLabels.size > 0) {
      parts.push(`Missing label(s): ${[...missingLabels].join(", ")}`);
    }
    throw new SeedResourceValidationError(
      `Seed definition references missing from board "${board.name}" (${board.id}): ${parts.join("; ")}`,
      board.id,
    );
  }

  // -----------------------------------------------------------------------
  // 6. Populate cards and nested resources
  // -----------------------------------------------------------------------
  const clock = new Date();

  let cardsCreated = 0;
  let taskListsCreated = 0;
  let tasksCreated = 0;
  let commentsCreated = 0;
  let labelAssignments = 0;
  const cardCountByListId = new Map<string, number>();

  for (const seedCard of SEED_CARDS) {
    const listId = listByName.get(seedCard.listName);
    if (listId === undefined) {
      throw new SeedPopulationError(
        `List "${seedCard.listName}" not found for card "${seedCard.name}"`,
        `listLookup:${seedCard.listName}`,
        board.id,
      );
    }

    // 6a. Create the card
    let card: { id: string };
    try {
      const cardOptions: Parameters<typeof createCard>[0] = {
        listId,
        name: seedCard.name,
        type: seedCard.type,
        description: seedCard.description ?? null,
        position: positionFor(cardCountByListId.get(listId) ?? 0),
      };
      const dueDate = computeDueDate(clock, seedCard.dueDateOffsetDays);
      if (dueDate !== null) {
        cardOptions.dueDate = dueDate;
      }
      card = await createCard(cardOptions);
      cardCountByListId.set(listId, (cardCountByListId.get(listId) ?? 0) + 1);
      cardsCreated++;
    } catch (error) {
      throw new SeedPopulationError(
        `Failed to create card "${seedCard.name}": ${error instanceof Error ? error.message : String(error)}`,
        `createCard:${seedCard.name}`,
        board.id,
      );
    }

    // 6b. Assign labels
    for (const labelName of seedCard.labelNames) {
      const labelId = labelByName.get(labelName);
      if (labelId) {
        try {
          await addLabelToCard(card.id, labelId);
          labelAssignments++;
        } catch (error) {
          throw new SeedPopulationError(
            `Failed to assign label "${labelName}" to card "${seedCard.name}": ${error instanceof Error ? error.message : String(error)}`,
            `addLabelToCard:${seedCard.name}:${labelName}`,
            board.id,
          );
        }
      }
    }

    // 6c. Create task lists and their tasks
    for (let tli = 0; tli < seedCard.taskLists.length; tli++) {
      const seedTaskList = seedCard.taskLists[tli];
      if (!seedTaskList) continue;

      let createdTaskList: { id: string };
      try {
        createdTaskList = await createTaskListOp({
          cardId: card.id,
          name: seedTaskList.name,
          position: positionFor(tli),
        });
        taskListsCreated++;
      } catch (error) {
        throw new SeedPopulationError(
          `Failed to create task list "${seedTaskList.name}" for card "${seedCard.name}": ${error instanceof Error ? error.message : String(error)}`,
          `createTaskList:${seedCard.name}:${seedTaskList.name}`,
          board.id,
        );
      }

      for (let ti = 0; ti < seedTaskList.tasks.length; ti++) {
        const seedTask = seedTaskList.tasks[ti];
        if (!seedTask) continue;

        let createdTask: { id: string };
        try {
          createdTask = await createTask({
            taskListId: createdTaskList.id,
            name: seedTask.name,
            position: positionFor(ti),
          });
          tasksCreated++;
        } catch (error) {
          throw new SeedPopulationError(
            `Failed to create task "${seedTask.name}" for card "${seedCard.name}": ${error instanceof Error ? error.message : String(error)}`,
            `createTask:${seedCard.name}:${seedTask.name}`,
            board.id,
          );
        }

        // Mark completed tasks
        if (seedTask.isCompleted) {
          try {
            await updateTask(createdTask.id, { isCompleted: true });
          } catch (error) {
            throw new SeedPopulationError(
              `Failed to mark task "${seedTask.name}" as completed for card "${seedCard.name}": ${error instanceof Error ? error.message : String(error)}`,
              `updateTask:${seedCard.name}:${seedTask.name}`,
              board.id,
            );
          }
        }
      }
    }

    // 6d. Create comments
    for (const commentText of seedCard.comments) {
      try {
        await createComment({ cardId: card.id, text: commentText });
        commentsCreated++;
      } catch (error) {
        throw new SeedPopulationError(
          `Failed to create comment on card "${seedCard.name}": ${error instanceof Error ? error.message : String(error)}`,
          `createComment:${seedCard.name}`,
          board.id,
        );
      }
    }
  }

  // -----------------------------------------------------------------------
  // 7. Return summary
  // -----------------------------------------------------------------------
  const distinctLabels = new Set<string>();
  for (const card of SEED_CARDS) {
    for (const name of card.labelNames) {
      distinctLabels.add(name);
    }
  }

  return {
    projectId,
    boardId: board.id,
    boardName: board.name,
    resources: {
      cards: cardsCreated,
      labels: distinctLabels.size,
      taskLists: taskListsCreated,
      tasks: tasksCreated,
      comments: commentsCreated,
      labelAssignments,
    },
  };
}

// Expose the seed data for testing
export { DEFAULT_BOARD_NAME, DEFAULT_PROJECT_NAME, SEED_CARDS };

const HELP_TEXT = `
Usage: npm run seed -- [options]

Create and populate a demo board in Planka. Without --project-id, the command
reuses or creates a private project named "${DEFAULT_PROJECT_NAME}".

Options:
  --project-id <id>      Use an existing project instead of the default seed project
  --board-name <name>    Board name (default: "${DEFAULT_BOARD_NAME}")
  --help                 Show this help message and exit

Environment:
  PLANKA_BASE_URL        Planka server URL (required, loaded from .env or process)
  PLANKA_AGENT_EMAIL     Agent email for authentication
  PLANKA_AGENT_PASSWORD  Agent password for authentication

Examples:
  npm run seed
  npm run seed -- --project-id abc123
  npm run seed -- --board-name "My Demo"
`;

export interface ParsedArgs {
  projectId?: string;
  boardName?: string;
  help: boolean;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { help: false };

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === "--help") {
      args.help = true;
      continue;
    }

    if (argument !== "--project-id" && argument !== "--board-name") {
      throw new SeedArgumentError(`unknown argument "${argument}" (run with --help for usage)`);
    }

    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new SeedArgumentError(`${argument} requires a value`);
    }

    if (argument === "--project-id") {
      args.projectId = value;
    } else {
      args.boardName = value;
    }
    index++;
  }

  return args;
}

type SeedRunner = (options: SeedBoardOptions) => Promise<SeedSummary>;

export async function main(
  argv: string[] = process.argv.slice(2),
  runSeed: SeedRunner = seedBoard,
): Promise<number> {
  let args: ParsedArgs;
  try {
    args = parseArgs(argv);
  } catch (error) {
    if (error instanceof SeedArgumentError) {
      console.error(`Error: ${error.message}`);
      return 1;
    }
    throw error;
  }

  if (args.help) {
    console.log(HELP_TEXT.trim());
    return 0;
  }

  if (args.projectId !== undefined && args.projectId.trim().length === 0) {
    console.error("Error: --project-id must not be empty when provided");
    return 1;
  }

  if (args.boardName !== undefined && args.boardName.trim().length === 0) {
    console.error("Error: --board-name must not be empty when provided");
    return 1;
  }

  const seedOptions: SeedBoardOptions = {};
  if (args.projectId !== undefined) {
    seedOptions.projectId = args.projectId;
  }
  if (args.boardName !== undefined) {
    seedOptions.boardName = args.boardName;
  }

  try {
    const summary = await runSeed(seedOptions);

    console.log("");
    console.log("Board seeded successfully!");
    console.log("-------------------------");
    console.log(`  Project ID:  ${summary.projectId}`);
    console.log(`  Board ID:    ${summary.boardId}`);
    console.log(`  Board name:  ${summary.boardName}`);
    console.log("  Resources created:");
    console.log(`    Cards:             ${summary.resources.cards}`);
    console.log(`    Labels referenced: ${summary.resources.labels}`);
    console.log(`    Task lists:        ${summary.resources.taskLists}`);
    console.log(`    Tasks:             ${summary.resources.tasks}`);
    console.log(`    Comments:          ${summary.resources.comments}`);
    console.log(`    Label assignments: ${summary.resources.labelAssignments}`);
    console.log("");
    return 0;
  } catch (error) {
    if (error instanceof SeedPreflightError) {
      console.error(`Error: ${error.message}`);
      return 1;
    }

    if (error instanceof SeedResourceValidationError) {
      console.error(
        `Error: ${error.message}\n` +
          `Board "${error.boardId}" was created but does not have the expected default resources. ` +
          "The board may still be available for inspection.",
      );
      return 1;
    }

    if (error instanceof SeedPopulationError) {
      console.error(
        `Error: Board seeding failed at stage "${error.stage}".\n` +
          `Board "${error.boardId}" was partially populated and is available for inspection.\n` +
          `Details: ${error.message}`,
      );
      return 1;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return 1;
  }
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] === scriptPath) {
  process.exitCode = await main();
}
