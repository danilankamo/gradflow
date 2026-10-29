const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseTimeToMinutes,
  isTimeIntervalValid,
  isTimeOverlapping,
  isSameDay,
  detectDefenseConflicts,
} = require('../utils/defenseConflict');

test('parseTimeToMinutes parses HH:MM correctly', () => {
  assert.equal(parseTimeToMinutes('09:00'), 540);
  assert.equal(parseTimeToMinutes('00:00'), 0);
  assert.equal(parseTimeToMinutes('23:59'), 1439);
  assert.equal(parseTimeToMinutes('14:30'), 870);
  assert.equal(parseTimeToMinutes('invalid'), null);
  assert.equal(parseTimeToMinutes('25:00'), null);
  assert.equal(parseTimeToMinutes(''), null);
  assert.equal(parseTimeToMinutes(null), null);
});

test('isTimeIntervalValid checks start < end', () => {
  assert.equal(isTimeIntervalValid('09:00', '10:30').valid, true);
  assert.equal(isTimeIntervalValid('10:30', '09:00').valid, false);
  assert.equal(isTimeIntervalValid('10:00', '10:00').valid, false);
  assert.equal(isTimeIntervalValid('not-a-time', '10:00').valid, false);
  assert.equal(isTimeIntervalValid('09:00', 'invalid').valid, false);
});

test('isTimeOverlapping detects intervals correctly (half-open [start, end))', () => {
  // Overlapping
  assert.equal(isTimeOverlapping('09:00', '10:30', '10:00', '11:00'), true);
  assert.equal(isTimeOverlapping('09:00', '11:00', '09:30', '10:00'), true);
  assert.equal(isTimeOverlapping('10:00', '11:00', '09:00', '10:30'), true);

  // Consecutive non-overlapping (touching at boundary)
  assert.equal(isTimeOverlapping('09:00', '10:00', '10:00', '11:00'), false);
  assert.equal(isTimeOverlapping('10:00', '11:00', '09:00', '10:00'), false);

  // Disjoint non-overlapping
  assert.equal(isTimeOverlapping('09:00', '10:00', '11:00', '12:00'), false);
  assert.equal(isTimeOverlapping('13:00', '14:00', '09:00', '10:00'), false);
});

test('isSameDay compares calendar dates accurately', () => {
  assert.equal(isSameDay('2026-10-24T00:00:00.000Z', '2026-10-24T14:30:00.000Z'), true);
  assert.equal(isSameDay('2026-10-24', '2026-10-25'), false);
  assert.equal(isSameDay(new Date('2026-10-24'), new Date('2026-10-24')), true);
  assert.equal(isSameDay(null, '2026-10-24'), false);
});

test('detectDefenseConflicts flags room collision on overlapping times (TC-7)', () => {
  const existingDefenses = [
    {
      _id: '507f1f77bcf86cd799439001',
      date: new Date('2026-10-24'),
      startTime: '09:00',
      endTime: '10:30',
      room: 'Hall A',
      examinerIds: ['507f1f77bcf86cd799439002'],
      status: 'scheduled',
    },
  ];

  const target = {
    date: new Date('2026-10-24'),
    startTime: '10:00',
    endTime: '11:30',
    room: 'Hall A',
    examinerIds: ['507f1f77bcf86cd799439003'],
  };

  const result = detectDefenseConflicts(target, existingDefenses);
  assert.equal(result.conflict, true);
  assert.equal(result.type, 'room');
  assert.match(result.message, /Room "Hall A" is already booked/);
});

test('detectDefenseConflicts permits same room on consecutive non-overlapping slots', () => {
  const existingDefenses = [
    {
      _id: '507f1f77bcf86cd799439001',
      date: new Date('2026-10-24'),
      startTime: '09:00',
      endTime: '10:00',
      room: 'Hall A',
      examinerIds: ['507f1f77bcf86cd799439002'],
      status: 'scheduled',
    },
  ];

  const target = {
    date: new Date('2026-10-24'),
    startTime: '10:00',
    endTime: '11:00',
    room: 'Hall A',
    examinerIds: ['507f1f77bcf86cd799439003'],
  };

  const result = detectDefenseConflicts(target, existingDefenses);
  assert.equal(result.conflict, false);
});

test('detectDefenseConflicts flags examiner collision on overlapping times', () => {
  const existingDefenses = [
    {
      _id: '507f1f77bcf86cd799439001',
      date: new Date('2026-10-24'),
      startTime: '14:00',
      endTime: '15:30',
      room: 'Room 101',
      examinerIds: [{ _id: '507f1f77bcf86cd799439002', name: 'Dr. Alan Turing' }],
      status: 'scheduled',
    },
  ];

  const target = {
    date: new Date('2026-10-24'),
    startTime: '15:00',
    endTime: '16:30',
    room: 'Room 202', // Different room
    examinerIds: ['507f1f77bcf86cd799439002'], // Same examiner
  };

  const result = detectDefenseConflicts(target, existingDefenses);
  assert.equal(result.conflict, true);
  assert.equal(result.type, 'examiner');
  assert.match(result.message, /Dr\. Alan Turing/);
});

test('detectDefenseConflicts ignores cancelled defenses', () => {
  const existingDefenses = [
    {
      _id: '507f1f77bcf86cd799439001',
      date: new Date('2026-10-24'),
      startTime: '09:00',
      endTime: '10:30',
      room: 'Hall A',
      examinerIds: ['507f1f77bcf86cd799439002'],
      status: 'cancelled', // Cancelled!
    },
  ];

  const target = {
    date: new Date('2026-10-24'),
    startTime: '09:30',
    endTime: '10:30',
    room: 'Hall A',
    examinerIds: ['507f1f77bcf86cd799439002'],
  };

  const result = detectDefenseConflicts(target, existingDefenses);
  assert.equal(result.conflict, false);
});

test('detectDefenseConflicts ignores self when updating', () => {
  const existingDefenses = [
    {
      _id: '507f1f77bcf86cd799439001',
      date: new Date('2026-10-24'),
      startTime: '09:00',
      endTime: '10:30',
      room: 'Hall A',
      examinerIds: ['507f1f77bcf86cd799439002'],
      status: 'scheduled',
    },
  ];

  const target = {
    _id: '507f1f77bcf86cd799439001', // Same ID
    date: new Date('2026-10-24'),
    startTime: '09:00',
    endTime: '10:30',
    room: 'Hall A',
    examinerIds: ['507f1f77bcf86cd799439002'],
  };

  const result = detectDefenseConflicts(target, existingDefenses);
  assert.equal(result.conflict, false);
});
