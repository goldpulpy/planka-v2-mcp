export const project = {
  id: "project-1",
  name: "Project",
  description: null,
  backgroundType: null,
  backgroundGradient: null,
  backgroundImageId: null,
  createdAt: null,
  updatedAt: null,
};

export const board = {
  id: "board-1",
  projectId: "project-1",
  name: "Board",
  position: 65535,
  createdAt: null,
  updatedAt: null,
};

export const list = {
  id: "list-1",
  boardId: "board-1",
  name: "Backlog",
  type: "active",
  position: 65535,
  color: null,
  createdAt: null,
  updatedAt: null,
};

export const card = {
  id: "card-1",
  listId: "list-1",
  boardId: "board-1",
  name: "Card",
  type: "project",
  description: null,
  position: 65535,
  dueDate: null,
  createdAt: null,
  updatedAt: null,
};

export const taskList = {
  id: "task-list-1",
  cardId: "card-1",
  name: "Tasks",
  position: 65535,
  createdAt: null,
  updatedAt: null,
};

export const task = {
  id: "task-1",
  taskListId: "task-list-1",
  name: "Task",
  isCompleted: false,
  position: 65535,
  createdAt: null,
  updatedAt: null,
};

export const label = {
  id: "label-1",
  boardId: "board-1",
  name: "Bug",
  color: "berry-red",
  createdAt: null,
  updatedAt: null,
};

export const comment = {
  id: "comment-1",
  cardId: "card-1",
  userId: null,
  text: "Looks good",
  createdAt: null,
  updatedAt: null,
};

export const cardMembership = {
  id: "card-membership-1",
  cardId: "card-1",
  userId: "user-1",
  createdAt: null,
  updatedAt: null,
};

export const boardMembership = {
  id: "board-membership-1",
  boardId: "board-1",
  userId: "user-1",
  role: "editor",
  canComment: null,
  createdAt: null,
  updatedAt: null,
};
