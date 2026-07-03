#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { z } from "zod";
import { getUserIdByEmail, getUserIdByUsername } from "./common/utils.js";
import { VERSION } from "./common/version.js";
// Import Planka operations
import * as boardMemberships from "./operations/boardMemberships.js";
import * as boards from "./operations/boards.js";
import * as cardMemberships from "./operations/cardMemberships.js";
import * as cards from "./operations/cards.js";
import * as comments from "./operations/comments.js";
import * as labels from "./operations/labels.js";
import * as lists from "./operations/lists.js";
import * as projects from "./operations/projects.js";
import * as taskLists from "./operations/taskLists.js";
import * as tasks from "./operations/tasks.js";
import * as users from "./operations/users.js";

// Import custom tools
import {
  createCardWithTasks,
  getBoardSummary,
  getCardDetails,
  getProjectSummary,
} from "./tools/index.js";

const server = new McpServer(
  {
    name: "planka-mcp-server",
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

const registerTool = server.tool.bind(server) as (
  name: string,
  description: string,
  paramsSchema: Record<string, z.ZodTypeAny>,
  cb: (args: any) => Promise<{ content: Array<{ type: "text"; text: string }> }>,
) => unknown;

// ----- CONSOLIDATED KANBAN TOOLS -----

// 1. Project and Board Manager
registerTool(
  "mcp_kanban_project_board_manager",
  "Manage projects and boards with various operations",
  {
    action: z
      .enum([
        "get_projects",
        "create_project",
        "get_project",
        "update_project",
        "delete_project",
        "get_boards",
        "create_board",
        "get_board",
        "update_board",
        "delete_board",
        "get_board_summary",
        "get_project_summary",
      ])
      .describe("The action to perform"),
    id: z.string().optional().describe("The ID of the project or board"),
    projectId: z.string().optional().describe("The ID of the project"),
    name: z.string().optional().describe("The name of the project or board"),
    description: z.string().optional().describe("The description of the project"),
    position: z.number().optional().describe("The position of the board"),
    type: z.string().optional().describe("The type of the project (private/shared) or board"),
    backgroundType: z
      .enum(["gradient", "image"])
      .optional()
      .describe("Background type for update_project"),
    backgroundGradient: z.string().optional().describe("Background gradient for update_project"),
    page: z.number().optional().describe("The page number for pagination (1-indexed)"),
    perPage: z.number().optional().describe("The number of items per page"),
    boardId: z.string().optional().describe("The ID of the board to get a summary for"),
    includeTaskDetails: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to include detailed task information for each card"),
    includeComments: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to include comments for each card"),
  },
  async (args) => {
    let result;

    switch (args.action) {
      case "get_projects":
        result = await projects.getProjects(args.page || 1, args.perPage || 50);
        break;

      case "create_project":
        if (!args.name) throw new Error("name is required for create_project action");
        result = await projects.createProject({
          name: args.name,
          description: args.description,
          type: (args.type as "private" | "shared") || "private",
        });
        break;

      case "get_project":
        if (!args.id) throw new Error("id is required for get_project action");
        result = await projects.getProject(args.id);
        break;

      case "update_project":
        if (!args.id) throw new Error("id is required for update_project action");
        result = await projects.updateProject(args.id, {
          name: args.name,
          description: args.description,
          backgroundType: args.backgroundType as any,
          backgroundGradient: args.backgroundGradient,
        });
        break;

      case "delete_project":
        if (!args.id) throw new Error("id is required for delete_project action");
        result = await projects.deleteProject(args.id);
        break;

      case "get_boards":
        if (!args.projectId) throw new Error("projectId is required for get_boards action");
        result = await boards.getBoards(args.projectId);
        break;

      case "create_board":
        if (!args.projectId || !args.name || args.position === undefined)
          throw new Error("projectId, name, and position are required for create_board action");
        result = await boards.createBoard({
          projectId: args.projectId,
          name: args.name,
          position: args.position,
        });
        break;

      case "get_board":
        if (!args.id) throw new Error("id is required for get_board action");
        result = await boards.getBoard(args.id);
        break;

      case "update_board":
        if (!args.id) throw new Error("id is required for update_board action");

        result = await boards.updateBoard(args.id, {
          name: args.name,
          position: args.position,
          defaultCardType: args.type as any,
        });
        break;

      case "delete_board":
        if (!args.id) throw new Error("id is required for delete_board action");
        result = await boards.deleteBoard(args.id);
        break;

      case "get_board_summary":
        if (!args.boardId) throw new Error("boardId is required for get_board_summary action");
        result = await getBoardSummary({
          boardId: args.boardId,
          includeTaskDetails: args.includeTaskDetails || false,
          includeComments: args.includeComments || false,
        });
        break;

      case "get_project_summary": {
        const projectId = args.projectId || args.id;
        if (!projectId) throw new Error("projectId is required for get_project_summary action");
        result = await getProjectSummary({
          projectId,
        });
        break;
      }

      default:
        throw new Error(`Unknown action: ${args.action}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  },
);

// 2. List Manager
registerTool(
  "mcp_kanban_list_manager",
  "Manage kanban lists with various operations",
  {
    action: z
      .enum(["get_all", "create", "update", "delete", "get_one"])
      .describe("The action to perform"),
    id: z.string().optional().describe("The ID of the list"),
    boardId: z.string().optional().describe("The ID of the board"),
    name: z.string().optional().describe("The name of the list"),
    position: z.number().optional().describe("The position of the list"),
    type: z
      .enum(["active", "closed", "archive", "trash"])
      .optional()
      .describe("The type of the list"),
    color: z.string().optional().describe("The color of the list"),
  },
  async (args) => {
    let result;

    switch (args.action) {
      case "get_all":
        if (!args.boardId) throw new Error("boardId is required for get_all action");
        result = await lists.getLists(args.boardId);
        break;

      case "create":
        if (!args.boardId || !args.name || args.position === undefined)
          throw new Error("boardId, name, and position are required for create action");
        result = await lists.createList({
          boardId: args.boardId,
          name: args.name,
          position: args.position,
        });
        break;

      case "get_one":
        if (!args.id) throw new Error("id is required for get_one action");
        result = await lists.getList(args.id);
        break;

      case "update":
        if (!args.id) throw new Error("id is required for update action");
        result = await lists.updateList(args.id, {
          name: args.name,
          position: args.position,
          type: args.type as any,
          color: args.color,
        });
        break;

      case "delete":
        if (!args.id) throw new Error("id is required for delete action");
        result = await lists.deleteList(args.id);
        break;

      default:
        throw new Error(`Unknown action: ${args.action}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  },
);

// 3. Card Manager
registerTool(
  "mcp_kanban_card_manager",
  "Manage kanban cards with various operations",
  {
    action: z
      .enum([
        "get_all",
        "create",
        "get_one",
        "update",
        "move",
        "duplicate",
        "delete",
        "create_with_tasks",
        "get_details",
      ])
      .describe("The action to perform"),
    id: z.string().optional().describe("The ID of the card"),
    listId: z.string().optional().describe("The ID of the list"),
    boardId: z.string().optional().describe("The ID of the board (if moving between boards)"),
    projectId: z.string().optional().describe("The ID of the project (if moving between projects)"),
    name: z.string().optional().describe("The name of the card"),
    type: z
      .enum(["project", "story"])
      .optional()
      .describe("The type of the card (project or story)"),
    description: z.string().optional().describe("The description of the card"),
    position: z.number().optional().describe("The position of the card"),
    dueDate: z.string().optional().describe("The due date for the card (ISO format)"),
    isCompleted: z.boolean().optional().describe("Whether the card is completed"),
    isDueCompleted: z.boolean().optional().describe("Whether the card due date is completed"),
    isClosed: z.boolean().optional().describe("Whether the card is closed"),
    tasks: z
      .array(z.string())
      .optional()
      .describe("Array of task descriptions to create for create_with_tasks action"),
    comment: z.string().optional().describe("Optional comment to add to the card"),
    cardId: z.string().optional().describe("The ID of the card to get details for"),
  },
  async (args) => {
    let result;

    switch (args.action) {
      case "get_all":
        if (!args.listId) throw new Error("listId is required for get_all action");
        result = await cards.getCards(args.listId);
        break;

      case "create":
        if (!args.listId || !args.name)
          throw new Error("listId and name are required for create action");
        result = await cards.createCard({
          listId: args.listId as string,
          name: args.name as string,
          type: (args.type as "project" | "story") || "project",
          description: (args.description as string) || null,
          position: (args.position as number) || 65535,
          dueDate: args.dueDate,
        });
        break;

      case "get_one":
        if (!args.id) throw new Error("id is required for get_one action");
        result = await cards.getCard(args.id);
        break;

      case "update":
        if (!args.id) throw new Error("id is required for update action");

        // Planka v2 doesn't support isClosed via PATCH - use dedicated archive function
        if (args.isClosed === true) {
          result = await cards.archiveCard(args.id);
        } else {
          result = await cards.updateCard(args.id, {
            name: args.name,
            description: args.description,
            type: args.type as any,
            position: args.position,
            dueDate: args.dueDate,
            isCompleted: args.isCompleted,
            isDueCompleted: args.isDueCompleted,
          });
        }
        break;

      case "move":
        if (!args.id || !args.listId || args.position === undefined)
          throw new Error("id, listId, and position are required for move action");
        result = await cards.moveCard(args.id, args.listId, args.position, args.boardId);
        break;

      case "duplicate":
        if (!args.id || args.position === undefined)
          throw new Error("id and position are required for duplicate action");
        result = await cards.duplicateCard(args.id, args.position);
        break;

      case "delete":
        if (!args.id) throw new Error("id is required for delete action");
        result = await cards.deleteCard(args.id);
        break;

      case "create_with_tasks":
        if (!args.listId || !args.name)
          throw new Error("listId and name are required for create_with_tasks action");
        result = await createCardWithTasks({
          listId: args.listId,
          name: args.name,
          description: args.description,
          tasks: args.tasks,
          comment: args.comment,
          position: args.position,
        });
        break;

      case "get_details":
        if (!args.cardId) throw new Error("cardId is required for get_details action");
        result = await getCardDetails({
          cardId: args.cardId,
        });
        break;

      default:
        throw new Error(`Unknown action: ${args.action}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  },
);

// 4. Stopwatch Manager
registerTool(
  "mcp_kanban_stopwatch",
  "Manage card stopwatches for time tracking",
  {
    action: z.enum(["start", "stop", "get", "reset"]).describe("The action to perform"),
    id: z.string().describe("The ID of the card"),
  },
  async (args) => {
    let result;

    switch (args.action) {
      case "start":
        result = await cards.startCardStopwatch(args.id);
        break;

      case "stop":
        result = await cards.stopCardStopwatch(args.id);
        break;

      case "get":
        result = await cards.getCardStopwatch(args.id);
        break;

      case "reset":
        result = await cards.resetCardStopwatch(args.id);
        break;

      default:
        throw new Error(`Unknown action: ${args.action}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  },
);

// 5. Label Manager
registerTool(
  "mcp_kanban_label_manager",
  "Manage kanban labels with various operations",
  {
    action: z
      .enum(["get_all", "create", "update", "delete", "add_to_card", "remove_from_card"])
      .describe("The action to perform"),
    id: z.string().optional().describe("The ID of the label"),
    boardId: z.string().optional().describe("The ID of the board"),
    cardId: z.string().optional().describe("The ID of the card"),
    labelId: z.string().optional().describe("The ID of the label (for card operations)"),
    name: z.string().optional().describe("The name of the label"),
    color: z
      .enum([
        "muddy-grey",
        "autumn-leafs",
        "morning-sky",
        "antique-blue",
        "egg-yellow",
        "desert-sand",
        "dark-granite",
        "fresh-salad",
        "lagoon-blue",
        "midnight-blue",
        "light-orange",
        "pumpkin-orange",
        "light-concrete",
        "sunny-grass",
        "navy-blue",
        "lilac-eyes",
        "apricot-red",
        "orange-peel",
        "silver-glint",
        "bright-moss",
        "deep-ocean",
        "summer-sky",
        "berry-red",
        "light-cocoa",
        "grey-stone",
        "tank-green",
        "coral-green",
        "sugar-plum",
        "pink-tulip",
        "shady-rust",
        "wet-rock",
        "wet-moss",
        "turquoise-sea",
        "lavender-fields",
        "piggy-red",
        "light-mud",
        "gun-metal",
        "modern-green",
        "french-coast",
        "sweet-lilac",
        "red-burgundy",
        "pirate-gold",
      ])
      .optional()
      .describe("The color of the label"),
    position: z.number().optional().describe("The position of the label"),
  },
  async (args) => {
    let result;

    switch (args.action) {
      case "get_all":
        if (!args.boardId) throw new Error("boardId is required for get_all action");
        result = await labels.getLabels(args.boardId);
        break;

      case "create":
        if (!args.boardId || !args.name || !args.color)
          throw new Error("boardId, name, and color are required for create action");
        result = await labels.createLabel({
          boardId: args.boardId,
          name: args.name,
          color: args.color as any,
          position: args.position,
        });
        break;

      case "update":
        if (!args.id) throw new Error("id is required for update action");
        result = await labels.updateLabel(args.id, {
          name: args.name,
          color: args.color as any,
          position: args.position,
        });
        break;

      case "delete":
        if (!args.id) throw new Error("id is required for delete action");
        result = await labels.deleteLabel(args.id);
        break;

      case "add_to_card":
        if (!args.cardId || !args.labelId)
          throw new Error("cardId and labelId are required for add_to_card action");
        result = await labels.addLabelToCard(args.cardId, args.labelId);
        break;

      case "remove_from_card":
        if (!args.cardId || !args.labelId)
          throw new Error("cardId and labelId are required for remove_from_card action");
        result = await labels.removeLabelFromCard(args.cardId, args.labelId);
        break;

      default:
        throw new Error(`Unknown action: ${args.action}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  },
);

// 6. Task List Manager (New for v2.0)
registerTool(
  "mcp_kanban_task_list_manager",
  "Manage task lists with various operations (Planka v2.0)",
  {
    action: z
      .enum(["get_all", "create", "update", "delete", "get_one"])
      .describe("The action to perform"),
    id: z.string().optional().describe("The ID of the task list"),
    cardId: z.string().optional().describe("The ID of the card"),
    name: z.string().optional().describe("The name of the task list"),
    position: z.number().optional().describe("The position of the task list"),
  },
  async (args) => {
    let result;

    switch (args.action) {
      case "get_all":
        if (!args.cardId) throw new Error("cardId is required for get_all action");
        result = await taskLists.getTaskLists(args.cardId);
        break;

      case "create":
        if (!args.cardId || !args.name)
          throw new Error("cardId and name are required for create action");
        result = await taskLists.createTaskList({
          cardId: args.cardId,
          name: args.name,
          position: args.position,
        });
        break;

      case "get_one":
        if (!args.id) throw new Error("id is required for get_one action");
        result = await taskLists.getTaskList(args.id);
        break;

      case "update":
        if (!args.id) throw new Error("id is required for update action");
        result = await taskLists.updateTaskList(args.id, {
          name: args.name,
          position: args.position,
        });
        break;

      case "delete":
        if (!args.id) throw new Error("id is required for delete action");
        result = await taskLists.deleteTaskList(args.id);
        break;

      default:
        throw new Error(`Unknown action: ${args.action}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  },
);

// 7. Task Manager
registerTool(
  "mcp_kanban_task_manager",
  "Manage kanban tasks with various operations",
  {
    action: z
      .enum(["get_all", "create", "batch_create", "get_one", "update", "delete", "complete_task"])
      .describe("The action to perform"),
    id: z.string().optional().describe("The ID of the task"),
    cardId: z.string().optional().describe("The ID of the card (flattens all lists)"),
    taskListId: z.string().optional().describe("The ID of the task list (v2 direct)"),
    name: z.string().optional().describe("The name of the task"),
    isCompleted: z.boolean().optional().describe("Whether the task is completed"),
    position: z.number().optional().describe("The position of the task"),
    tasks: z
      .array(
        z.object({
          cardId: z.string().optional().describe("The ID of the card"),
          taskListId: z.string().optional().describe("The ID of the task list"),
          name: z.string().describe("The name of this task"),
          position: z.number().optional().describe("The position of this task"),
        }),
      )
      .optional()
      .describe("Array of tasks to create in batch"),
  },
  async (args) => {
    let result;

    switch (args.action) {
      case "get_all":
        if (args.taskListId) {
          result = await tasks.getTaskListTasks(args.taskListId);
        } else if (args.cardId) {
          result = await tasks.getTasks(args.cardId);
        } else {
          throw new Error("Either cardId or taskListId is required for get_all action");
        }
        break;

      case "create":
        if (!args.name) throw new Error("name is required for create action");
        result = await tasks.createTask({
          cardId: args.cardId,
          taskListId: args.taskListId,
          name: args.name,
          position: args.position,
        });
        break;

      case "batch_create":
        if (!args.tasks || args.tasks.length === 0)
          throw new Error("tasks array is required for batch_create action");
        result = await tasks.batchCreateTasks({ tasks: args.tasks as any });
        break;

      case "get_one":
        if (!args.id || !args.cardId)
          throw new Error("id and cardId are required for get_one action");
        result = await tasks.getTask(args.cardId, args.id);
        break;

      case "update":
        if (!args.id) throw new Error("id is required for update action");
        result = await tasks.updateTask(args.id, {
          name: args.name,
          position: args.position,
          isCompleted: args.isCompleted,
        });
        break;

      case "complete_task":
        if (!args.id) throw new Error("id is required for complete_task action");
        result = await tasks.updateTask(args.id, { isCompleted: true });
        break;

      case "delete":
        if (!args.id) throw new Error("id is required for delete action");
        result = await tasks.deleteTask(args.id);
        break;

      default:
        throw new Error(`Unknown action: ${args.action}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  },
);

// 8. Comment Manager
registerTool(
  "mcp_kanban_comment_manager",
  "Manage card comments with various operations",
  {
    action: z
      .enum(["get_all", "create", "get_one", "update", "delete"])
      .describe("The action to perform"),
    id: z.string().optional().describe("The ID of the comment"),
    cardId: z.string().optional().describe("The ID of the card"),
    text: z.string().optional().describe("The text content of the comment"),
  },
  async (args) => {
    let result;

    switch (args.action) {
      case "get_all":
        if (!args.cardId) throw new Error("cardId is required for get_all action");
        result = await comments.getComments(args.cardId);
        break;

      case "create":
        if (!args.cardId || !args.text)
          throw new Error("cardId and text are required for create action");
        result = await comments.createComment({
          cardId: args.cardId,
          text: args.text,
        });
        break;

      case "get_one":
        if (!args.id || !args.cardId)
          throw new Error("id and cardId are required for get_one action");
        result = await comments.getComment(args.cardId, args.id);
        break;

      case "update":
        if (!args.id || !args.text) throw new Error("id and text are required for update action");
        result = await comments.updateComment(args.id, {
          text: args.text,
        });
        break;

      case "delete":
        if (!args.id) throw new Error("id is required for delete action");
        result = await comments.deleteComment(args.id);
        break;

      default:
        throw new Error(`Unknown action: ${args.action}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  },
);

// 9. Membership Manager
registerTool(
  "mcp_kanban_membership_manager",
  "Manage board memberships with various operations",
  {
    action: z
      .enum(["get_all", "create", "get_one", "update", "delete"])
      .describe("The action to perform"),
    id: z.string().optional().describe("The ID of the membership"),
    boardId: z.string().optional().describe("The ID of the board"),
    projectId: z.string().optional().describe("The ID of the project"),
    userId: z.string().optional().describe("The ID of the user"),
    role: z.enum(["editor", "viewer"]).optional().describe("The role of the user in the board"),
    canComment: z.boolean().optional().describe("Whether the user can comment on the board"),
  },
  async (args) => {
    let result;

    switch (args.action) {
      case "get_all":
        if (!args.boardId) throw new Error("boardId is required for get_all action");
        result = await boardMemberships.getBoardMemberships(args.boardId, args.projectId);
        break;

      case "create":
        if (!args.boardId || !args.userId || !args.role)
          throw new Error("boardId, userId, and role are required for create action");
        result = await boardMemberships.createBoardMembership({
          boardId: args.boardId,
          userId: args.userId,
          role: args.role,
          projectId: args.projectId,
        });
        break;

      case "get_one":
        if (!args.id) throw new Error("id is required for get_one action");
        if (!args.boardId) throw new Error("boardId is required for get_one action");
        result = await boardMemberships.getBoardMembership(args.boardId, args.id);
        break;

      case "update":
        if (!args.id) throw new Error("id is required for update action");
        result = await boardMemberships.updateBoardMembership(args.id, {
          role: args.role,
          canComment: args.canComment,
        });
        break;

      case "delete":
        if (!args.id) throw new Error("id is required for delete action");
        result = await boardMemberships.deleteBoardMembership(args.id);
        break;

      default:
        throw new Error(`Unknown action: ${args.action}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  },
);

// 10. Card Membership Manager (with user resolution)
registerTool(
  "mcp_kanban_card_membership_manager",
  "Manage memberships of a card (assign users by ID, email, or username)",
  {
    action: z.enum(["get_all", "create", "delete", "get_users"]).describe("The action to perform"),
    cardId: z.string().optional().describe("The ID of the card"),
    userId: z.string().optional().describe("The ID of the user"),
    email: z.string().optional().describe("The email of the user"),
    username: z.string().optional().describe("The username of the user"),
  },
  async (args) => {
    let result;

    // Helper to resolve userId from email or username
    const resolveUserId = async () => {
      if (args.userId) return args.userId;
      if (args.email) return await getUserIdByEmail(args.email);
      if (args.username) return await getUserIdByUsername(args.username);
      return null;
    };

    switch (args.action) {
      case "get_all":
        if (!args.cardId) throw new Error("cardId is required for get_all action");
        result = await cardMemberships.getCardMemberships(args.cardId);
        break;

      case "get_users":
        result = await users.getUsers();
        break;

      case "create": {
        if (!args.cardId) throw new Error("cardId is required for create action");
        const uid = await resolveUserId();
        if (!uid)
          throw new Error("Could not resolve user ID from provided userId, email, or username");
        result = await cardMemberships.createCardMembership(args.cardId, uid);
        break;
      }

      case "delete": {
        if (!args.cardId) throw new Error("cardId is required for delete action");
        const uid = await resolveUserId();
        if (!uid)
          throw new Error("Could not resolve user ID from provided userId, email, or username");
        result = await cardMemberships.deleteCardMembership(args.cardId, uid);
        break;
      }

      default:
        throw new Error(`Unknown action: ${args.action}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  },
);

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch((err) => {
  console.error("Error running server:", err);
  process.exit(1);
});
