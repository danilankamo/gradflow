const DAY_IN_MS = 24 * 60 * 60 * 1000;
const RECENT_ACTIVITY_WINDOW_DAYS = 14;
const UPCOMING_DEADLINE_WINDOW_DAYS = 7;

const evaluateProjectHealth = (project, milestones = [], activityItems = [], now = new Date()) => {
  const isComplete = ['Completed', 'Archived'].includes(project.status);
  const openMilestones = isComplete
    ? []
    : milestones.filter((milestone) => milestone.status !== 'approved');
  const overdueMilestones = openMilestones.filter(
    (milestone) => milestone.dueDate && new Date(milestone.dueDate) < now
  );
  const nextDeadline = openMilestones
    .filter((milestone) => milestone.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0] || null;
  const progress = isComplete
    ? 100
    : milestones.length
      ? Math.round((milestones.length - openMilestones.length) / milestones.length * 100)
      : Number(project.progress) || 0;
  const activityDates = [project.updatedAt, ...milestones.map((item) => item.updatedAt),
    ...activityItems.flatMap((item) => [item.updatedAt, item.submittedAt])]
    .filter(Boolean)
    .map((date) => new Date(date))
    .filter((date) => !Number.isNaN(date.getTime()));
  const lastActivityAt = activityDates.length
    ? new Date(Math.max(...activityDates.map((date) => date.getTime())))
    : null;
  const daysSinceActivity = lastActivityAt
    ? Math.floor((now.getTime() - lastActivityAt.getTime()) / DAY_IN_MS)
    : null;
  const daysUntilNextDeadline = nextDeadline
    ? Math.ceil((new Date(nextDeadline.dueDate).getTime() - now.getTime()) / DAY_IN_MS)
    : null;

  let status = 'Healthy';
  if (!isComplete && overdueMilestones.length > 0) {
    status = 'Delayed';
  } else if (!isComplete && (
    lastActivityAt === null ||
    (daysSinceActivity !== null && daysSinceActivity >= RECENT_ACTIVITY_WINDOW_DAYS) ||
    (daysUntilNextDeadline !== null && (
      daysUntilNextDeadline <= UPCOMING_DEADLINE_WINDOW_DAYS ||
      (daysUntilNextDeadline <= RECENT_ACTIVITY_WINDOW_DAYS && progress < 50)
    ))
  )) {
    status = 'At Risk';
  }

  return {
    status,
    progress,
    totalMilestones: milestones.length,
    completedMilestones: milestones.length - openMilestones.length,
    overdueMilestones: overdueMilestones.length,
    nextDeadline: nextDeadline?.dueDate || null,
    lastActivityAt,
    daysSinceActivity,
  };
};

module.exports = { evaluateProjectHealth };
