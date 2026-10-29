const READ_ONLY_PROJECT_STATUSES = ['Completed', 'Archived'];

const isReadOnlyProject = (project) =>
  Boolean(project && READ_ONLY_PROJECT_STATUSES.includes(project.status));

module.exports = { READ_ONLY_PROJECT_STATUSES, isReadOnlyProject };
