import { useState, useMemo, useEffect, useRef } from 'react';

function Icon({ name, size = 18, fill = false, className = '' }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`.trim()}
      style={{ fontSize: `${size}px`, fontVariationSettings: fill ? "'FILL' 1" : undefined, lineHeight: 1 }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

const RUBRIC_CRITERIA = [
  {
    id: 'problemUnderstanding',
    number: 1,
    title: 'Problem Understanding & Research Formulation',
    weight: 20,
    description:
      'Comprehension of domain constraints, validation of agricultural/system problem statements, rigorous research questions formulation, and feasibility scoping.',
    benchmarks: [
      { label: 'Poor', points: 7, range: '0 – 9 pts', note: 'Superficial context; vague problem definition.' },
      { label: 'Satisfactory', points: 12, range: '10 – 14 pts', note: 'Acceptable context; general questions addressed.' },
      { label: 'Proficient', points: 16, range: '15 – 17 pts', note: 'Clear domain analysis; solid boundary validation.' },
      { label: 'Exemplary', points: 18, range: '18 – 20 pts', note: 'Deep insight; novel framing of telemetry and problem.' },
    ],
  },
  {
    id: 'implementation',
    number: 2,
    title: 'Technical Implementation & Architecture',
    weight: 25,
    description:
      'Code modularity, task isolation, microservice concurrency, API safety, cryptographic integrity, and algorithmic rigor.',
    benchmarks: [
      { label: 'Poor', points: 10, range: '0 – 12 pts', note: 'High coupling; absent concurrency safety.' },
      { label: 'Satisfactory', points: 15, range: '13 – 17 pts', note: 'Monolithic code works; rudimentary modularity.' },
      { label: 'Proficient', points: 19, range: '18 – 21 pts', note: 'Proper abstraction; documented async patterns.' },
      { label: 'Exemplary', points: 23, range: '22 – 25 pts', note: 'Industrial grade; excellent microservice resilience & memory safety.' },
    ],
  },
  {
    id: 'functionality',
    number: 3,
    title: 'Functionality, Testing & Live Demo',
    weight: 25,
    description:
      'Live execution of project deliverables, unit/integration test suite pass rates, error handling verification, and viva live demonstration.',
    benchmarks: [
      { label: 'Poor', points: 9, range: '0 – 12 pts', note: 'Live demo failed; missing test fixtures.' },
      { label: 'Satisfactory', points: 14, range: '13 – 17 pts', note: 'Core loop functional; brittle to network interruptions.' },
      { label: 'Proficient', points: 19, range: '18 – 21 pts', note: 'Verified >80% test coverage; seamless demonstration.' },
      { label: 'Exemplary', points: 22, range: '22 – 25 pts', note: 'Flawless execution with edge-case failover simulation.' },
    ],
  },
  {
    id: 'documentation',
    number: 4,
    title: 'Academic Documentation & Specification',
    weight: 15,
    description:
      'Technical thesis structure, citation accuracy, schematic architecture diagrams, state transition models, and reproducibility guidelines.',
    benchmarks: [
      { label: 'Poor', points: 5, range: '0 – 7 pts', note: 'Incomplete chapters; unverified references.' },
      { label: 'Satisfactory', points: 9, range: '8 – 10 pts', note: 'Format compliant; lacks rigorous comparative benchmarks.' },
      { label: 'Proficient', points: 13, range: '11 – 13 pts', note: 'Thorough diagrams; minor benchmark details needed.' },
      { label: 'Exemplary', points: 15, range: '14 – 15 pts', note: 'Ready for peer-reviewed journal submission verbatim.' },
    ],
  },
  {
    id: 'presentation',
    number: 5,
    title: 'Oral Defense, Presentation & Q&A Response',
    weight: 15,
    description:
      'Articulation, poise under panel cross-examination, and command of underlying system trade-offs.',
    benchmarks: [
      { label: 'Poor', points: 6, range: '0 – 7 pts', note: 'Struggled to answer examiner technical critiques.' },
      { label: 'Satisfactory', points: 9, range: '8 – 10 pts', note: 'Answers adequate but lacked depth on architecture.' },
      { label: 'Proficient', points: 12, range: '11 – 13 pts', note: 'Clear speaker coordination; cogent answers to technical queries.' },
      { label: 'Exemplary', points: 14, range: '14 – 15 pts', note: 'Exceptional defense; candidates exhibited mastery of topic.' },
    ],
  },
];

const VERDICT_OPTIONS = [
  {
    value: 'distinction',
    title: 'Approved with Distinction',
    icon: 'workspace_premium',
    color: 'text-secondary',
    bg: 'bg-secondary/10',
    border: 'border-secondary',
    description: 'No manuscript revisions required. Recommended for University Academic Excellence Award.',
  },
  {
    value: 'minor-corrections',
    title: 'Approved Subject to Minor Corrections',
    icon: 'task_alt',
    color: 'text-[#0F766E]',
    bg: 'bg-[#F0FDFA]',
    border: 'border-[#0F766E]',
    description: 'Candidate granted 14 days to incorporate minor amendments verified by Lead Examiner before deposit.',
  },
  {
    value: 'major-revisions',
    title: 'Substantial Revisions & Re-Defense',
    icon: 'sync_problem',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-400',
    description: 'Major architectural flaws identified; candidate must submit amended thesis within 60 days.',
  },
  {
    value: 'fail',
    title: 'Fail / Rejected',
    icon: 'cancel',
    color: 'text-error',
    bg: 'bg-error-container/30',
    border: 'border-error',
    description: 'Deliverables do not meet graduation standards; referral to academic coordinator.',
  },
];

export default function ExaminerEvaluationSuite({
  defense,
  user,
  existingEvaluation,
  busy = false,
  onSaveEvaluation,
  onBack,
}) {
  const [scores, setScores] = useState({
    problemUnderstanding: 18,
    implementation: 23,
    functionality: 22,
    documentation: 13,
    presentation: 14,
  });

  const [comments, setComments] = useState(
    'The committee commends the candidate(s) for a rigorous empirical implementation and clear defense presentation.'
  );
  const [manuscriptAmendments, setManuscriptAmendments] = useState(
    '1. Provide an explicit performance and resource benchmark table in Section 4.\n2. Clarify system boundary constraints and failure mode handling.'
  );
  const [verdict, setVerdict] = useState('minor-corrections');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!isModalOpen) return;
    const previousFocus = document.activeElement;
    const onKeyDown = event => {
      if (event.key === 'Escape') { setIsModalOpen(false); return; }
      if (event.key !== 'Tab') return;
      const buttons = [...dialogRef.current.querySelectorAll('button:not(:disabled)')];
      const first = buttons[0];
      const last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previousFocus?.focus(); };
  }, [isModalOpen]);
  const [toastMessage, setToastMessage] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Populate from existing evaluation if available
  useEffect(() => {
    if (existingEvaluation) {
      if (existingEvaluation.scores) {
        setScores({
          problemUnderstanding: existingEvaluation.scores.problemUnderstanding ?? 18,
          implementation: existingEvaluation.scores.implementation ?? 23,
          functionality: existingEvaluation.scores.functionality ?? 22,
          documentation: existingEvaluation.scores.documentation ?? 13,
          presentation: existingEvaluation.scores.presentation ?? 14,
        });
      }
      if (existingEvaluation.comments !== undefined) {
        setComments(existingEvaluation.comments);
      }
      if (existingEvaluation.manuscriptAmendments !== undefined) {
        setManuscriptAmendments(existingEvaluation.manuscriptAmendments);
      }
      if (existingEvaluation.verdict) {
        setVerdict(existingEvaluation.verdict);
      }
      setIsReadOnly(true);
    }
  }, [existingEvaluation]);

  const totalScore = useMemo(() => {
    return (
      (Number(scores.problemUnderstanding) || 0) +
      (Number(scores.implementation) || 0) +
      (Number(scores.functionality) || 0) +
      (Number(scores.documentation) || 0) +
      (Number(scores.presentation) || 0)
    );
  }, [scores]);

  const classification = useMemo(() => {
    if (totalScore >= 85) {
      return {
        label: 'First Class Distinction (≥ 85)',
        badgeClass: 'bg-[#F0FDFA] text-[#0F766E] border border-[#0F766E]/40',
        tone: 'text-[#0F766E]',
        tag: 'Exemplary',
      };
    }
    if (totalScore >= 70) {
      return {
        label: 'Pass with Merit (70–84)',
        badgeClass: 'bg-surface-container text-secondary border border-secondary/30',
        tone: 'text-secondary',
        tag: 'Merit',
      };
    }
    if (totalScore >= 50) {
      return {
        label: 'Pass Standard (50–69)',
        badgeClass: 'bg-surface-container-high text-primary border border-outline-variant',
        tone: 'text-primary',
        tag: 'Pass',
      };
    }
    return {
      label: 'Below Pass Standard (< 50)',
      badgeClass: 'bg-error-container text-error border border-error/30',
      tone: 'text-error',
      tag: 'Fail',
    };
  }, [totalScore]);

  const project = defense?.projectId || {};
  const students = project.students || [];
  const supervisor = project.supervisorId || {};

  const formattedDate = useMemo(() => {
    if (!defense?.date) return 'TBD';
    return new Date(defense.date).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [defense?.date]);

  const handleScoreChange = (criteriaId, maxPoints, rawValue) => {
    const num = Math.min(maxPoints, Math.max(0, Number(rawValue) || 0));
    setScores((prev) => ({ ...prev, [criteriaId]: num }));
  };

  const handleSetBenchmark = (criteriaId, points) => {
    if (isReadOnly) return;
    setScores((prev) => ({ ...prev, [criteriaId]: points }));
  };

  const handleConfirmSubmit = async () => {
    setIsModalOpen(false);
    const payload = {
      scores,
      comments: comments.trim(),
      manuscriptAmendments: manuscriptAmendments.trim(),
      verdict,
    };

    const success = await onSaveEvaluation(defense._id, payload);
    if (success) {
      setIsReadOnly(true);
      setToastMessage('Evaluation successfully finalized and stored.');
      setTimeout(() => setToastMessage(''), 4500);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" className="fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-6 sm:right-6 z-50 flex items-center gap-3 rounded-xl bg-primary-container p-4 text-white shadow-2xl border border-outline-variant/30 animate-in slide-in-from-bottom duration-300">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0F766E] text-white">
            <Icon name="verified" size={20} fill />
          </div>
          <div>
            <strong className="block text-sm font-bold text-white">Evaluation Officialized</strong>
            <span className="text-xs text-surface-container-highest">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* TOP BAR / BREADCRUMB */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low transition"
            title="Back to Assigned Defenses"
          >
            <Icon name="arrow_back" size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#0F766E] animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Day 10 • Examiner Evaluation Suite
              </span>
            </div>
            <h2 className="text-xl font-bold text-primary">Oral Defense &amp; Viva Voce Assessment</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1.5 border border-outline-variant text-xs">
            <Icon name="account_circle" size={18} className="text-secondary" />
            <span className="font-semibold text-primary">{user?.name || 'Active Examiner'}</span>
            <span className="text-outline">({user?.department || 'Panel Member'})</span>
          </div>

          {isReadOnly ? (
            <button
              type="button"
              onClick={() => setIsReadOnly(false)}
              className="flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-container-low transition"
            >
              <Icon name="edit" size={16} />
              <span>Amend Evaluation</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-primary-container px-4 py-2 text-xs font-bold text-white shadow-sm hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
            >
              <Icon name="verified" size={16} fill />
              <span>Finalize &amp; Lock Grade</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. DEFENSE OVERVIEW & CANDIDATE SUMMARY CARD (Stitch Top Banner) */}
      <section className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#0F766E]" />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-surface-container-low px-2 py-0.5 font-mono text-xs font-semibold text-primary border border-outline-variant">
                #{String(project._id || 'PRJ').slice(-6).toUpperCase()}
              </span>
              <span className="rounded bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-secondary">
                {project.category || 'Final Year Project'}
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-[#F0FDFA] px-2.5 py-0.5 text-xs font-medium text-[#0F766E] border border-[#CCFBF1]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0F766E] animate-ping" />
                {defense.status === 'completed' || project.status === 'Evaluated'
                  ? 'Evaluation Stored / Evaluated'
                  : 'In Session / Oral Defense'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              {project.title || 'Graduation Project Title'}
            </h1>
          </div>

          {/* Schedule Quick Block */}
          <div className="w-full sm:w-auto sm:min-w-[270px] rounded-xl border border-outline-variant bg-surface-container-low p-3.5 text-xs">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <Icon name="event" size={16} className="text-secondary" />
              <span>{formattedDate}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-on-surface-variant">
              <span>
                {defense.startTime} – {defense.endTime}
              </span>
              <span className="font-semibold text-secondary">Venue: {defense.room}</span>
            </div>
          </div>
        </div>

        {/* Candidate Students & Supervisor Matrix */}
        <div className="mt-6 grid gap-4 border-t border-outline-variant/60 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((student, idx) => (
            <div
              key={student._id || idx}
              className="flex items-center gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container font-semibold text-primary text-sm">
                {(student.name || 'S')[0]}
              </div>
              <div className="text-xs truncate">
                <span className="text-slate-400 font-medium block">Candidate Student {idx + 1}</span>
                <strong className="block text-sm font-semibold text-primary truncate">
                  {student.name}
                </strong>
                <span className="text-slate-500 text-[11px] truncate block">
                  {student.studentId || student.email || 'CS Candidate'} • {student.department || 'Computing'}
                </span>
              </div>
            </div>
          ))}

          {/* Supervisor Card */}
          <div className="flex items-center gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container font-bold text-white text-sm">
              {(supervisor.name || 'F')[0]}
            </div>
            <div className="text-xs truncate">
              <span className="text-slate-400 font-medium block">Project Supervisor</span>
              <strong className="block text-sm font-semibold text-primary truncate">
                {supervisor.name || 'Faculty Advisor'}
              </strong>
              <span className="text-slate-500 text-[11px] truncate block">
                {supervisor.department || 'Faculty of Engineering'}
              </span>
            </div>
          </div>
        </div>

        {/* Abstract Snippet */}
        {project.abstract && (
          <details className="group mt-4 rounded-xl border border-outline-variant/60 bg-surface-container-low/50 p-3.5 text-xs cursor-pointer">
            <summary className="flex items-center justify-between font-semibold text-primary select-none">
              <div className="flex items-center gap-2">
                <Icon name="description" size={16} className="text-secondary" />
                <span>Project Abstract &amp; Technical Methodology</span>
              </div>
              <Icon
                name="expand_more"
                size={18}
                className="text-slate-400 transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="mt-2 text-slate-600 leading-relaxed pl-6">{project.abstract}</p>
          </details>
        )}
      </section>

      {/* 3. STICKY REAL-TIME SCORE ENGINE & GRADE SUMMARY BAR (Stitch Layout) */}
      <div className="sticky top-4 z-30 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-outline-variant/40 bg-primary-container p-4 text-white shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/10 p-2.5">
            <div className="flex h-12 w-12 items-center justify-center rounded bg-tertiary-container font-mono text-xl font-bold text-tertiary-fixed-dim">
              {totalScore}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-inverse-primary">
                Cumulative Viva Score
              </p>
              <strong className="text-base font-bold text-white">{totalScore} / 100 Pts</strong>
            </div>
          </div>

          {/* Classification Pill */}
          <div className={`hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${classification.badgeClass}`}>
            <Icon name="stars" size={16} fill />
            <span>{classification.label}</span>
          </div>
        </div>

        {/* Scale Legend */}
        <div className="flex items-center gap-2 text-xs font-medium text-inverse-primary flex-wrap">
          <span className="flex items-center gap-1 font-semibold text-tertiary-fixed-dim">
            <span className="h-2 w-2 rounded-full bg-tertiary-fixed-dim" /> Distinction ≥85
          </span>
          <span className="opacity-40">•</span>
          <span className="flex items-center gap-1 text-surface-container-highest">
            <span className="h-2 w-2 rounded-full bg-surface-container-highest" /> Merit 70–84
          </span>
          <span className="opacity-40">•</span>
          <span className="flex items-center gap-1 text-surface-container-high">
            <span className="h-2 w-2 rounded-full bg-surface-container-high" /> Pass 50–69
          </span>
          <span className="opacity-40">•</span>
          <span className="flex items-center gap-1 text-error-container">
            <span className="h-2 w-2 rounded-full bg-error" /> Fail &lt;50
          </span>
        </div>
      </div>

      {/* 4. STRUCTURED SCORING RUBRIC (5-Criteria Matrix from Stitch) */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-primary">Criterion-Referenced Assessment Matrix</h3>
          <p className="text-xs text-on-surface-variant">
            Evaluation conforms to University Functional Requirements FR-14, FR-15, and Section 7.6 of Department Viva Protocols.
          </p>
        </div>

        <div className="space-y-4">
          {RUBRIC_CRITERIA.map((criterion) => {
            const currentScore = Number(scores[criterion.id]) || 0;

            return (
              <article
                key={criterion.id}
                className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition hover:border-slate-300"
              >
                <div className="flex flex-col gap-3 pb-3 border-b border-outline-variant/60 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-container text-xs font-bold text-primary">
                        {criterion.number}
                      </span>
                      <h4 className="text-sm font-bold text-primary">{criterion.title}</h4>
                      <span className="rounded bg-secondary-fixed/50 px-2 py-0.5 text-[11px] font-bold text-secondary">
                        Weight: {criterion.weight} Pts
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 pl-8">{criterion.description}</p>
                  </div>

                  {/* Stepper / Input */}
                  <div className="flex items-center gap-2 self-end sm:self-auto rounded-lg border border-outline-variant bg-surface-container-low p-2">
                    <span className="text-xs font-semibold text-slate-500">Awarded:</span>
                    <input
                      type="number"
                      min="0"
                      max={criterion.weight}
                      disabled={isReadOnly}
                      value={currentScore}
                      onChange={(e) =>
                        handleScoreChange(criterion.id, criterion.weight, e.target.value)
                      }
                      className="w-16 rounded border border-outline-variant bg-surface-container-lowest px-2 py-1 text-center font-bold text-primary text-sm shadow-xs focus:ring-2 focus:ring-secondary focus:outline-none disabled:bg-slate-100"
                    />
                    <span className="text-xs font-semibold text-slate-400">/ {criterion.weight}</span>
                  </div>
                </div>

                {/* Preset Benchmark Selection Buttons */}
                <div className="mt-3">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Preset Benchmark Rubric:
                  </span>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {criterion.benchmarks.map((bm) => {
                      const isSelected = currentScore === bm.points;

                      return (
                        <button
                          key={bm.label}
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => handleSetBenchmark(criterion.id, bm.points)}
                          className={`rounded-xl p-2.5 text-left border transition text-xs ${
                            isSelected
                              ? 'border-[#0F766E] bg-[#F0FDFA] shadow-xs ring-1 ring-[#0F766E]/40'
                              : 'border-outline-variant/70 hover:bg-surface-container-low text-slate-700'
                          } disabled:cursor-not-allowed`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className={isSelected ? 'text-[#0F766E]' : 'text-primary'}>
                              {bm.label}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">{bm.range}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">{bm.note}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 5. QUALITATIVE REMARKS & REVISIONS DOSSIER (Stitch Layout) */}
      <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-4">
        <div className="border-b border-outline-variant/60 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-primary">Qualitative Examiner Remarks &amp; Feedback Dossier</h3>
            <p className="text-xs text-on-surface-variant">
              Observations and amendments are archived in the permanent capstone repository and communicated to candidates.
            </p>
          </div>
          <Icon name="rate_review" size={24} className="text-slate-400" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-primary mb-1">
              Examiner Technical Observations &amp; Commendations
            </label>
            <textarea
              rows="4"
              disabled={isReadOnly}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Highlight algorithmic breakthroughs, architectural merits, and live viva demonstration responses..."
              className="w-full rounded-xl border border-outline-variant p-3 text-xs text-primary shadow-xs focus:border-secondary focus:ring-2 focus:ring-secondary/20 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary mb-1">
              Required Post-Defense Corrections / Manuscript Amendments
            </label>
            <textarea
              rows="4"
              disabled={isReadOnly}
              value={manuscriptAmendments}
              onChange={(e) => setManuscriptAmendments(e.target.value)}
              placeholder="Stipulated amendments required prior to degree conferral sign-off..."
              className="w-full rounded-xl border border-outline-variant p-3 text-xs text-primary shadow-xs focus:border-secondary focus:ring-2 focus:ring-secondary/20 disabled:bg-slate-100"
            />
          </div>
        </div>
      </section>

      {/* 6. FINAL DEFENSE RECOMMENDATION / VERDICT (Stitch Layout) */}
      <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-4">
        <div className="border-b border-outline-variant/60 pb-3">
          <h3 className="text-base font-bold text-primary">Final Defense Recommendation &amp; Official Verdict</h3>
          <p className="text-xs text-on-surface-variant">
            Selection of degree candidacy recommendation in accordance with Capstone Examination Board protocols.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {VERDICT_OPTIONS.map((opt) => {
            const isSelected = verdict === opt.value;

            return (
              <label
                key={opt.value}
                className={`relative flex flex-col p-4 rounded-xl border cursor-pointer transition text-xs ${
                  isSelected
                    ? `${opt.border} ${opt.bg} shadow-xs ring-2 ring-primary/10`
                    : 'border-outline-variant hover:bg-surface-container-low'
                } ${isReadOnly ? 'cursor-not-allowed opacity-80' : ''}`}
              >
                <input
                  type="radio"
                  name="verdict"
                  value={opt.value}
                  checked={isSelected}
                  disabled={isReadOnly}
                  onChange={(e) => setVerdict(e.target.value)}
                  className="sr-only"
                />
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      isSelected ? 'border-primary bg-primary' : 'border-slate-300'
                    }`}
                  >
                    {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                  <Icon name={opt.icon} size={20} className={opt.color} />
                </div>
                <strong className={`block text-xs font-bold ${isSelected ? 'text-primary' : 'text-slate-800'}`}>
                  {opt.title}
                </strong>
                <p className="mt-1 text-[11px] text-slate-500 leading-snug">{opt.description}</p>
              </label>
            );
          })}
        </div>

        {/* Digital Signature & Actions */}
        <div className="mt-6 flex flex-col gap-4 border-t border-outline-variant/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1]">
              <Icon name="fingerprint" size={18} />
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Examiner Digital Verification
              </span>
              <strong className="text-primary font-semibold">
                Signature verified: {user?.name || 'Examiner'}
              </strong>
            </div>
          </div>

          {!isReadOnly && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary-container px-6 py-3 text-sm font-bold text-white shadow-md hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
            >
              <Icon name="verified" size={18} fill />
              <span>Submit Official Defense Evaluation</span>
            </button>
          )}
        </div>
      </section>

      {/* CONFIRMATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="evaluation-confirm-title" className="w-full max-h-[90dvh] overflow-y-auto max-w-lg rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container text-primary">
                <Icon name="gavel" size={24} className="text-secondary" />
              </div>
              <div>
                <h3 id="evaluation-confirm-title" className="text-lg font-bold text-primary">Confirm Defense Evaluation Submission</h3>
                <p className="text-xs text-slate-500 mt-0.5">{project.title}</p>
              </div>
            </div>

            <div className="rounded-xl border border-outline-variant/80 bg-surface-container-low p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Final Cumulative Grade
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <strong className="text-2xl font-black text-primary">{totalScore} / 100</strong>
                  <span className={`text-xs font-bold ${classification.tone}`}>
                    {classification.tag}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  Verdict: {verdict.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>This action commits the official defense evaluation into the department ledger:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-500">
                <li>
                  Project status will advance to <strong>Evaluated</strong>.
                </li>
                <li>
                  Candidate student(s) and supervisor <strong>{supervisor.name}</strong> will be notified.
                </li>
                <li>Score rubric and amendments will be permanently archived.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                autoFocus
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Return to Review
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleConfirmSubmit}
                className="flex items-center gap-1.5 rounded-lg bg-primary-container px-5 py-2 text-xs font-bold text-white shadow-sm hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
              >
                <Icon name="lock" size={16} />
                <span>Confirm &amp; Lock Grade</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
