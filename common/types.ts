import { z } from "zod";

// Planka schemas
export const PlankaUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const PlankaProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  backgroundType: z.enum(["gradient", "image"]).nullable(),
  backgroundGradient: z.string().nullable(),
  backgroundImageId: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const PlankaBoardSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  position: z.number(),
  defaultView: z.enum(["kanban", "grid", "list"]).optional(),
  defaultCardType: z.enum(["project", "story"]).optional(),
  expandTaskListsByDefault: z.boolean().optional(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const PlankaListSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  name: z.string(),
  type: z.enum(["active", "closed", "archive", "trash"]).optional(),
  position: z.number().nullable(),
  color: z.string().nullable().optional(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const PlankaLabelSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  name: z.string().nullable(),
  color: z.string(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

// Define the stopwatch schema
export const PlankaStopwatchSchema = z.object({
  startedAt: z.string().nullable(),
  total: z.number(),
});

export const PlankaCardSchema = z.object({
  id: z.string(),
  listId: z.string(),
  boardId: z.string().optional(),
  name: z.string(),
  type: z.enum(["project", "story"]),
  description: z.string().nullable(),
  position: z.number().nullable(),
  dueDate: z.string().nullable(),
  isDueCompleted: z.boolean().nullable().optional(),
  stopwatch: PlankaStopwatchSchema.nullable().optional(),
  commentsTotal: z.number().optional(),
  isClosed: z.boolean().optional(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const PlankaTaskListSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  name: z.string(),
  position: z.number(),
  showOnFrontOfCard: z.boolean().optional(),
  hideCompletedTasks: z.boolean().optional(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const PlankaTaskSchema = z.object({
  id: z.string(),
  taskListId: z.string(),
  name: z.string(),
  isCompleted: z.boolean(),
  position: z.number(),
  assigneeUserId: z.string().nullable().optional(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const PlankaCommentSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  userId: z.string().nullable(),
  text: z.string(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const PlankaAttachmentSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  creatorUserId: z.string().nullable(),
  name: z.string(),
  type: z.enum(["file", "link"]).optional(),
  url: z.string().optional(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const PlankaCardMembershipSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  userId: z.string(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const PlankaBoardMembershipSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  userId: z.string(),
  role: z.enum(["editor", "admin", "viewer"]),
  canComment: z.boolean().nullable().optional(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const PlankaProjectMembershipSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  role: z.enum(["editor", "admin", "viewer"]),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const PlankaCardLabelSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  labelId: z.string(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

// Type exports for Planka
export type PlankaUser = z.infer<typeof PlankaUserSchema>;
export type PlankaProject = z.infer<typeof PlankaProjectSchema>;
export type PlankaBoard = z.infer<typeof PlankaBoardSchema>;
export type PlankaList = z.infer<typeof PlankaListSchema>;
export type PlankaLabel = z.infer<typeof PlankaLabelSchema>;
export type PlankaCard = z.infer<typeof PlankaCardSchema>;
export type PlankaTaskList = z.infer<typeof PlankaTaskListSchema>;
export type PlankaTask = z.infer<typeof PlankaTaskSchema>;
export type PlankaComment = z.infer<typeof PlankaCommentSchema>;
export type PlankaAttachment = z.infer<typeof PlankaAttachmentSchema>;
export type PlankaCardMembership = z.infer<typeof PlankaCardMembershipSchema>;
export type PlankaBoardMembership = z.infer<typeof PlankaBoardMembershipSchema>;
export type PlankaProjectMembership = z.infer<typeof PlankaProjectMembershipSchema>;
export type PlankaCardLabel = z.infer<typeof PlankaCardLabelSchema>;
