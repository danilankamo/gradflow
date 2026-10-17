import { useState, useMemo } from 'react';
import ExaminerEvaluationSuite from './ExaminerEvaluationSuite.jsx';

const STANDARD_TIME_SLOTS = [
  { start: '09:00', end: '10:30', label: '09:00 – 10:30' },
  { start: '11:00', end: '12:30', label: '11:00 – 12:30' },
  { start: '14:00', end: '15:30', label: '14:00 – 15:30' },
  { start: '16:00', end: '17:30', label: '16:00 – 17:30' },
];

const POPULAR_ROOMS = [
  'Auditorium Hall A',
  'Seminar Room 102',
  'Computing Lab 3B',
  'Boardroom 405',
];

export function CoordinatorDefenseScheduler({
  defenses = [],
  schedulableProjects = [],
  examiners = [],
  busy = false,
  onSchedule,
  onUpdate,
  onCancel,
  onRefresh,
}) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [room, setRoom] = useState('');
  const [selectedExaminerIds, setSelectedExaminerIds] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingDefense, setEditingDefense] = useState(null);
  const [formError, setFormError] = useState('');

  const selectedProject = useMemo(() => {
    return schedulableProjects.find((p) => p._id === selectedProjectId) || null;
  }, [schedulableProjects, selectedProjectId]);

  const activeDefensesCount = useMemo(() => {
    return defenses.filter((d) => d.status === 'scheduled').length;
  }, [defenses]);

  const filteredDefenses = useMemo(() => {
    if (filterStatus === 'all') return defenses;
    return defenses.filter((d) => d.status === filterStatus);
  }, [defenses, filterStatus]);

  const toggleExaminer = (examinerId) => {
    setSelectedExaminerIds((prev) =>
      prev.includes(examinerId)
        ? prev.filter((id) => id !== examinerId)
        : [...prev, examinerId]
    );
  };

  const handleApplySlot = (slot) => {
    setStartTime(slot.start);
    setEndTime(slot.end);
  };

  const resetForm = () => {
    setSelectedProjectId('');
    setRoom('');
    setSelectedExaminerIds([]);
    setEditingDefense(null);
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!editingDefense && !selectedProjectId) {
      setFormError('Please select an eligible project for defense.');
      return;
    }
    if (!date) {
      setFormError('Please select a defense date.');
      return;
    }
    if (!startTime || !endTime) {
      setFormError('Start time and end time are required.');
      return;
    }
    if (startTime >= endTime) {
      setFormError('End time must be after start time.');
      return;
    }
    if (!room.trim()) {
      setFormError('Please specify a defense venue or room.');
      return;
    }
    if (selectedExaminerIds.length === 0) {
      setFormError('Please assign at least one examiner to the defense panel.');
      return;
    }

    // Client-side supervisor check
    const currentProj = editingDefense ? editingDefense.projectId : selectedProject;
    const supervisorId = currentProj?.supervisorId?._id || currentProj?.supervisorId;
    if (supervisorId && selectedExaminerIds.includes(String(supervisorId))) {
      setFormError('The project supervisor cannot serve as an examiner for the same project.');
      return;
    }

    const payload = {
      projectId: editingDefense ? editingDefense.projectId._id : selectedProjectId,
      date,
      startTime,
      endTime,
      room: room.trim(),
      examinerIds: selectedExaminerIds,
    };

    let success;
    if (editingDefense) {
      success = await onUpdate(editingDefense._id, payload);
    } else {
      success = await onSchedule(payload);
    }

    if (success) {
      resetForm();
    }
  };

  const handleStartEdit = (defense) => {
    setEditingDefense(defense);
    setSelectedProjectId(defense.projectId?._id || '');
    setDate(new Date(defense.date).toISOString().slice(0, 10));
    setStartTime(defense.startTime || '09:00');
    setEndTime(defense.endTime || '10:30');
    setRoom(defense.room || '');
    setSelectedExaminerIds((defense.examinerIds || []).map((e) => e._id || e));
    setFormError('');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  return (
    <section className="subsection space-y-6">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Academic Administration</p>
          <h2>Defense Scheduling &amp; Panel Management</h2>
        </div>
        <button
          className="button button-quiet"
          type="button"
          onClick={onRefresh}
          disabled={busy}
        >
          Refresh Schedules
        </button>
      </div>

      <div className="stats-grid">
        <article className="stat-card stat-accent">
          <span>Active Defenses</span>
          <strong>{activeDefensesCount}</strong>
        </article>
        <article className="stat-card">
          <span>Ready for Scheduling</span>
          <strong>{schedulableProjects.length}</strong>
        </article>
        <article className="stat-card">
          <span>Registered Examiners</span>
          <strong>{examiners.length}</strong>
        </article>
        <article className="stat-card">
          <span>Total Defense Records</span>
          <strong>{defenses.length}</strong>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* Scheduling Form */}
        <section className="management-card flex flex-col gap-4">
          <div className="section-heading border-b border-slate-100 pb-3">
            <div>
              <h3>{editingDefense ? 'Reschedule Defense' : 'Schedule Project Defense'}</h3>
              <p className="text-xs text-slate-500">
                {editingDefense
                  ? `Editing session for "${editingDefense.projectId?.title}"`
                  : 'Assign presentation venue, time window, and examination committee'}
              </p>
            </div>
            {editingDefense && (
              <button
                type="button"
                className="button button-quiet text-xs py-1 px-2.5"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}
          </div>

          {formError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!editingDefense ? (
              <label>
                Eligible Project (Final Submission)
                <select
                  required
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={busy || schedulableProjects.length === 0}
                >
                  <option value="">-- Select project ready for defense --</option>
                  {schedulableProjects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title} ({p.students?.map((s) => s.name).join(', ') || 'Student'})
                    </option>
                  ))}
                </select>
                {schedulableProjects.length === 0 && (
                  <span className="mt-1 block text-xs text-amber-600">
                    No projects currently in "Final Submission" status. Only projects with all
                    approved milestones can be scheduled.
                  </span>
                )}
              </label>
            ) : (
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Target Project
                </span>
                <strong className="block text-sm text-slate-800 mt-0.5">
                  {editingDefense.projectId?.title}
                </strong>
                <span className="text-xs text-slate-500">
                  Candidate: {editingDefense.projectId?.students?.map((s) => s.name).join(', ')}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label>
                Defense Date
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={busy}
                />
              </label>

              <label>
                Venue / Room
                <input
                  type="text"
                  required
                  placeholder="e.g. Auditorium Hall A"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  disabled={busy}
                />
              </label>
            </div>

            {/* Quick Room Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 -mt-2">
              <span className="text-[11px] font-medium text-slate-400">Suggested:</span>
              {POPULAR_ROOMS.map((suggestedRoom) => (
                <button
                  key={suggestedRoom}
                  type="button"
                  onClick={() => setRoom(suggestedRoom)}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
                >
                  {suggestedRoom}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label>
                Start Time
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label>
                End Time
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={busy}
                />
              </label>
            </div>

            {/* Time slot quick buttons */}
            <div className="flex flex-wrap items-center gap-1.5 -mt-2">
              <span className="text-[11px] font-medium text-slate-400">Standard slots:</span>
              {STANDARD_TIME_SLOTS.map((slot) => (
                <button
                  key={slot.label}
                  type="button"
                  onClick={() => handleApplySlot(slot)}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
                    startTime === slot.start && endTime === slot.end
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>

            {/* Examiner Selection */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">
                  Assign Examiners ({selectedExaminerIds.length} selected)
                </label>
                <span className="text-xs text-slate-500">Min. 1 examiner required</span>
              </div>

              {examiners.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 text-center">
                  No examiner accounts registered yet. Register an account with role "Examiner" to
                  assign them to defenses.
                </p>
              ) : (
                <div className="grid max-h-48 overflow-y-auto gap-2 rounded-xl border border-slate-200 p-2.5 bg-slate-50/60">
                  {examiners.map((examiner) => {
                    const isSelected = selectedExaminerIds.includes(examiner._id);
                    const currentProj = editingDefense ? editingDefense.projectId : selectedProject;
                    const isSupervisor =
                      currentProj?.supervisorId &&
                      String(currentProj.supervisorId._id || currentProj.supervisorId) ===
                        String(examiner._id);

                    return (
                      <label
                        key={examiner._id}
                        className={`flex items-start gap-2.5 rounded-lg p-2 transition cursor-pointer ${
                          isSelected
                            ? 'bg-brand-50 border border-brand-200'
                            : 'bg-white border border-slate-200/80 hover:bg-slate-50'
                        } ${isSupervisor ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 rounded text-brand-600 focus:ring-brand-500"
                          checked={isSelected}
                          disabled={isSupervisor || busy}
                          onChange={() => toggleExaminer(examiner._id)}
                        />
                        <div className="flex-1 text-xs">
                          <strong className="block text-slate-800 font-semibold">
                            {examiner.name}
                          </strong>
                          <span className="text-slate-500 block">
                            {examiner.department || 'Academic Staff'} · {examiner.email}
                          </span>
                          {isSupervisor && (
                            <span className="text-[10px] text-amber-600 font-medium">
                              (Project supervisor — cannot serve on examination panel)
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="action-row pt-2">
              <button
                className="button button-primary w-full"
                type="submit"
                disabled={busy}
              >
                {busy
                  ? 'Processing…'
                  : editingDefense
                  ? 'Update Defense Schedule'
                  : 'Schedule Defense Session'}
              </button>
            </div>
          </form>
        </section>

        {/* Defense List */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900">
              Scheduled Defense Sessions ({filteredDefenses.length})
            </h3>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              <button
                type="button"
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  filterStatus === 'all' ? 'bg-brand-600 text-white' : 'text-slate-600'
                }`}
                onClick={() => setFilterStatus('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  filterStatus === 'scheduled' ? 'bg-brand-600 text-white' : 'text-slate-600'
                }`}
                onClick={() => setFilterStatus('scheduled')}
              >
                Scheduled
              </button>
              <button
                type="button"
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  filterStatus === 'cancelled' ? 'bg-brand-600 text-white' : 'text-slate-600'
                }`}
                onClick={() => setFilterStatus('cancelled')}
              >
                Cancelled
              </button>
            </div>
          </div>

          {filteredDefenses.length === 0 ? (
            <div className="empty-detail">
              <h3>No defenses match criteria</h3>
              <p>Schedule a project defense using the panel on the left.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {filteredDefenses.map((defense) => {
                const isCancelled = defense.status === 'cancelled';
                const formattedDate = new Date(defense.date).toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <article
                    key={defense._id}
                    className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                      isCancelled
                        ? 'border-slate-200 bg-slate-50/70 opacity-75'
                        : 'border-slate-200 hover:border-brand-300'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isCancelled
                                ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                                : 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
                            }`}
                          >
                            {defense.status.toUpperCase()}
                          </span>
                          <span className="text-xs font-semibold text-slate-700">
                            {formattedDate}
                          </span>
                        </div>
                        <h4 className="mt-1 text-base font-semibold text-slate-900">
                          {defense.projectId?.title || 'Graduation Project'}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isCancelled && (
                          <>
                            <button
                              type="button"
                              className="button button-quiet text-xs py-1 px-2.5"
                              disabled={busy}
                              onClick={() => handleStartEdit(defense)}
                            >
                              Reschedule
                            </button>
                            <button
                              type="button"
                              className="button button-danger text-xs py-1 px-2.5"
                              disabled={busy}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Are you sure you want to cancel the defense for "${defense.projectId?.title}"?`
                                  )
                                ) {
                                  onCancel(defense._id);
                                }
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-3.5 grid gap-2 sm:grid-cols-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                      <div>
                        <span className="font-semibold text-slate-800">Time Window: </span>
                        {defense.startTime} – {defense.endTime}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Venue: </span>
                        {defense.room}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Candidate: </span>
                        {defense.projectId?.students?.map((s) => s.name).join(', ') || 'N/A'}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Supervisor: </span>
                        {defense.projectId?.supervisorId?.name || 'Assigned Supervisor'}
                      </div>
                    </div>

                    <div className="mt-3 border-t border-slate-100 pt-2.5">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        Examiners Panel:
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {defense.examinerIds?.length ? (
                          defense.examinerIds.map((examiner) => (
                            <span
                              key={examiner._id || examiner}
                              className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700 font-medium"
                            >
                              {examiner.name || 'Examiner'}
                              {examiner.department ? ` (${examiner.department})` : ''}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">No examiners listed</span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

export function StudentDefenseCard({ defense, projectStatus, evaluations = [] }) {
  if (!defense) {
    return (
      <div className="info-card">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Oral Defense &amp; Viva Voce</h3>
          <span className="status-badge status-pending">Pending Scheduling</span>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {projectStatus === 'Final Submission'
            ? 'Your final milestone deliverable has been approved. The department coordinator will schedule your oral defense and appoint the examination panel.'
            : 'Complete and obtain supervisor approval on all project milestones to advance to defense scheduling.'}
        </p>
      </div>
    );
  }

  const formattedDate = new Date(defense.date).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const latestEval = evaluations && evaluations.length > 0 ? evaluations[0] : null;

  return (
    <article className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50/50 to-white p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 pb-4">
        <div>
          <span className="eyebrow text-violet-700">Official Defense Notice</span>
          <h3 className="text-xl font-bold text-slate-900 mt-0.5">Oral Defense &amp; Viva Voce</h3>
        </div>
        <div className="flex items-center gap-2">
          {latestEval && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F0FDFA] px-3 py-1 text-xs font-bold text-[#0F766E] border border-[#CCFBF1]">
              <span className="h-2 w-2 rounded-full bg-[#0F766E]" />
              SCORE: {latestEval.total} / 100
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
            {defense.status.toUpperCase()}
          </span>
        </div>
      </div>

      {latestEval && (
        <div className="rounded-xl border border-[#0F766E]/30 bg-[#F0FDFA]/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E]">
                Official Committee Evaluation
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-extrabold text-slate-900">{latestEval.total} / 100</span>
                <span className="text-xs font-bold text-[#0F766E]">
                  {latestEval.verdict ? String(latestEval.verdict).toUpperCase() : 'EVALUATED'}
                </span>
              </div>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Examiner: <strong>{latestEval.examinerId?.name || 'Assigned Examiner'}</strong>
            </span>
          </div>

          {latestEval.comments && (
            <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-[#0F766E]/20">
              <strong className="block text-slate-800 mb-1">Commendations &amp; Remarks:</strong>
              <p>{latestEval.comments}</p>
            </div>
          )}

          {latestEval.manuscriptAmendments && (
            <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200">
              <strong className="block text-amber-900 mb-1">Required Amendments:</strong>
              <p>{latestEval.manuscriptAmendments}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Date &amp; Day
          </span>
          <strong className="block text-sm font-bold text-slate-800 mt-1">
            {formattedDate}
          </strong>
        </div>

        <div className="rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Time Slot
          </span>
          <strong className="block text-sm font-bold text-slate-800 mt-1">
            {defense.startTime} – {defense.endTime}
          </strong>
        </div>

        <div className="rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Venue / Room
          </span>
          <strong className="block text-sm font-bold text-slate-800 mt-1">
            {defense.room}
          </strong>
        </div>
      </div>

      <div className="mt-5 border-t border-violet-100 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Assigned Examination Committee
        </h4>
        <div className="grid gap-2 sm:grid-cols-2">
          {defense.examinerIds?.map((examiner) => (
            <div
              key={examiner._id || examiner}
              className="flex items-center gap-2.5 rounded-xl bg-white p-3 border border-slate-200/80"
            >
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">
                {(examiner.name || 'E')[0]}
              </div>
              <div className="text-xs">
                <strong className="block text-slate-800 font-semibold">{examiner.name}</strong>
                <span className="text-slate-500">{examiner.department || 'Examiner'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-violet-50/70 p-3.5 border border-violet-200 text-xs text-violet-900">
        <strong>Candidate Instructions: </strong>
        Please arrive 15 minutes prior to your scheduled time slot with your presentation slides,
        working software demonstration, and system architecture diagrams.
      </div>
    </article>
  );
}

export function ExaminerWorkspace({
  defenses = [],
  user,
  busy = false,
  onRefresh,
  onSaveEvaluation,
}) {
  const [selectedDefenseForEval, setSelectedDefenseForEval] = useState(null);
  const [defenseEvaluations, setDefenseEvaluations] = useState({});

  if (selectedDefenseForEval) {
    return (
      <ExaminerEvaluationSuite
        defense={selectedDefenseForEval}
        user={user}
        existingEvaluation={defenseEvaluations[selectedDefenseForEval._id]}
        busy={busy}
        onSaveEvaluation={async (defenseId, payload) => {
          const success = await onSaveEvaluation(defenseId, payload);
          if (success) {
            setDefenseEvaluations((prev) => ({
              ...prev,
              [defenseId]: {
                defenseId,
                scores: payload.scores,
                total:
                  (Number(payload.scores.problemUnderstanding) || 0) +
                  (Number(payload.scores.implementation) || 0) +
                  (Number(payload.scores.functionality) || 0) +
                  (Number(payload.scores.documentation) || 0) +
                  (Number(payload.scores.presentation) || 0),
                comments: payload.comments,
                manuscriptAmendments: payload.manuscriptAmendments,
                verdict: payload.verdict,
              },
            }));
            onRefresh?.();
          }
          return success;
        }}
        onBack={() => setSelectedDefenseForEval(null)}
      />
    );
  }

  const completedCount = defenses.filter(
    (d) => d.status === 'completed' || d.projectId?.status === 'Evaluated' || defenseEvaluations[d._id]
  ).length;
  const pendingCount = Math.max(0, defenses.length - completedCount);

  return (
    <section className="subsection space-y-6">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Evaluation Panel</p>
          <h2>Assigned Defense Presentations</h2>
        </div>
        <button
          className="button button-quiet"
          type="button"
          onClick={onRefresh}
          disabled={busy}
        >
          Refresh Defenses
        </button>
      </div>

      <div className="stats-grid">
        <article className="stat-card stat-accent">
          <span>Assigned Defenses</span>
          <strong>{defenses.length}</strong>
        </article>
        <article className="stat-card">
          <span>Pending Evaluation</span>
          <strong>{pendingCount}</strong>
        </article>
        <article className="stat-card">
          <span>Completed Vivas</span>
          <strong>{completedCount}</strong>
        </article>
      </div>

      {defenses.length === 0 ? (
        <div className="empty-detail">
          <h3>No assigned defenses yet</h3>
          <p>You have not been assigned to any project defense panels for this cohort.</p>
        </div>
      ) : (
        <div className="grid gap-5">
          {defenses.map((defense) => {
            const isEvaluated =
              defense.status === 'completed' ||
              defense.projectId?.status === 'Evaluated' ||
              Boolean(defenseEvaluations[defense._id]);

            const formattedDate = new Date(defense.date).toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <article
                key={defense._id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-brand-300 transition flex flex-col gap-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="eyebrow">{defense.projectId?.category || 'Final Year Project'}</span>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">
                      {defense.projectId?.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEvaluated && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F0FDFA] px-3 py-1 text-xs font-bold text-[#0F766E] border border-[#CCFBF1]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#0F766E]" />
                        Evaluated
                      </span>
                    )}
                    <span className={`status-badge status-${defense.status}`}>
                      {defense.status}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">
                      Date &amp; Time
                    </span>
                    <strong className="text-sm text-slate-800">
                      {formattedDate} · {defense.startTime} – {defense.endTime}
                    </strong>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">
                      Defense Venue
                    </span>
                    <strong className="text-sm text-slate-800">{defense.room}</strong>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">
                      Student Lead(s)
                    </span>
                    <strong className="text-sm text-slate-800">
                      {defense.projectId?.students?.map((s) => s.name).join(', ') || 'Student'}
                    </strong>
                  </div>
                </div>

                {defense.projectId?.abstract && (
                  <div className="text-xs text-slate-600">
                    <strong className="block text-slate-800 mb-1">Project Abstract:</strong>
                    <p className="line-clamp-3">{defense.projectId.abstract}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500 gap-3">
                  <span>
                    Faculty Supervisor: <strong>{defense.projectId?.supervisorId?.name || 'Assigned'}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedDefenseForEval(defense)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold transition shadow-xs ${
                      isEvaluated
                        ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        : 'bg-primary-container text-white hover:brightness-110'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {isEvaluated ? 'visibility' : 'rate_review'}
                    </span>
                    <span>{isEvaluated ? 'View / Amend Evaluation' : 'Evaluate Oral Defense'}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
