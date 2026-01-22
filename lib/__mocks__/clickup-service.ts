// Manual mock for clickup-service to avoid loading dependencies in tests
export const updateTaskStatus = jest.fn();
export const updateTaskTags = jest.fn();
export const addCommentToTask = jest.fn();
export const getTask = jest.fn();
export const createTask = jest.fn();
