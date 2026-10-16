/**
 * GradFlow Defense Scheduling & Conflict Detection Utilities
 * Enforces room availability, examiner calendar non-overlap, and project eligibility (FR-12, FR-13).
 */

function parseTimeToMinutes(timeStr) {
  if (typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  const match = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$/.exec(trimmed);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 60 + minutes;
}

function isTimeIntervalValid(startTime, endTime) {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  if (startMinutes === null) {
    return { valid: false, message: 'Start time must be a valid time in HH:MM format (e.g. 09:00).' };
  }
  if (endMinutes === null) {
    return { valid: false, message: 'End time must be a valid time in HH:MM format (e.g. 10:30).' };
  }
  if (startMinutes >= endMinutes) {
    return { valid: false, message: 'End time must be strictly after start time.' };
  }
  return { valid: true, startMinutes, endMinutes };
}

function isTimeOverlapping(startA, endA, startB, endB) {
  const a1 = typeof startA === 'number' ? startA : parseTimeToMinutes(startA);
  const a2 = typeof endA === 'number' ? endA : parseTimeToMinutes(endA);
  const b1 = typeof startB === 'number' ? startB : parseTimeToMinutes(startB);
  const b2 = typeof endB === 'number' ? endB : parseTimeToMinutes(endB);
  if (a1 === null || a2 === null || b1 === null || b2 === null) return false;
  return a1 < b2 && b1 < a2;
}

function getCalendarDayKey(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function isSameDay(date1, date2) {
  const k1 = getCalendarDayKey(date1);
  const k2 = getCalendarDayKey(date2);
  return Boolean(k1 && k2 && k1 === k2);
}

function detectDefenseConflicts(target, existingDefenses = []) {
  const targetDay = getCalendarDayKey(target.date);
  if (!targetDay) {
    return { conflict: true, type: 'validation', message: 'A valid defense date is required.' };
  }

  const intervalCheck = isTimeIntervalValid(target.startTime, target.endTime);
  if (!intervalCheck.valid) {
    return { conflict: true, type: 'validation', message: intervalCheck.message };
  }

  const targetExaminers = Array.isArray(target.examinerIds)
    ? target.examinerIds.map((id) => (id && id._id ? String(id._id) : String(id)))
    : [];

  const targetRoom = typeof target.room === 'string' ? target.room.trim().toLowerCase() : '';
  const targetDefenseId = target._id ? String(target._id) : null;

  for (const existing of existingDefenses) {
    // Ignore self when updating
    const existingId = existing._id ? String(existing._id) : null;
    if (targetDefenseId && existingId && targetDefenseId === existingId) {
      continue;
    }

    // Only scheduled defenses can conflict
    if (existing.status && existing.status !== 'scheduled') {
      continue;
    }

    // Must be on the exact same calendar day
    if (!isSameDay(existing.date, target.date)) {
      continue;
    }

    // Check time interval overlap
    const overlaps = isTimeOverlapping(
      intervalCheck.startMinutes,
      intervalCheck.endMinutes,
      existing.startTime,
      existing.endTime
    );

    if (!overlaps) {
      continue;
    }

    // 1. Room conflict check
    const existingRoom = typeof existing.room === 'string' ? existing.room.trim().toLowerCase() : '';
    if (targetRoom && existingRoom && targetRoom === existingRoom) {
      return {
        conflict: true,
        type: 'room',
        message: `Room "${existing.room}" is already booked for another defense on this date from ${existing.startTime} to ${existing.endTime}.`,
        conflictingDefense: existing,
      };
    }

    // 2. Examiner conflict check
    const existingExaminers = Array.isArray(existing.examinerIds)
      ? existing.examinerIds.map((item) => (item && item._id ? String(item._id) : String(item)))
      : [];

    for (const examinerId of targetExaminers) {
      if (existingExaminers.includes(examinerId)) {
        const populatedExaminer = Array.isArray(existing.examinerIds)
          ? existing.examinerIds.find((item) => item && item._id && String(item._id) === examinerId)
          : null;
        const name = populatedExaminer?.name ? `Examiner "${populatedExaminer.name}"` : 'One of the selected examiners';
        return {
          conflict: true,
          type: 'examiner',
          examinerId,
          message: `${name} is already scheduled for another defense on this date from ${existing.startTime} to ${existing.endTime}.`,
          conflictingDefense: existing,
        };
      }
    }
  }

  return { conflict: false };
}

module.exports = {
  parseTimeToMinutes,
  isTimeIntervalValid,
  isTimeOverlapping,
  getCalendarDayKey,
  isSameDay,
  detectDefenseConflicts,
};
