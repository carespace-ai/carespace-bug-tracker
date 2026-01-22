// Manual mock for github-service to avoid loading @octokit in tests
export const addCommentToIssue = jest.fn();
export const updateIssueStatus = jest.fn();
export const updateIssueLabels = jest.fn();
export const getIssueByNumber = jest.fn();
export const createIssue = jest.fn();
export const addLabelsToIssue = jest.fn();
