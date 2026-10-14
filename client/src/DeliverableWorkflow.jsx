import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const resolveFileUrl = (fileUrl) =>
  fileUrl && fileUrl.startsWith('http') ? fileUrl : `${API_URL}${fileUrl}`;

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : null);

function DeliverableStatus({ status }) {
  return (
    <span className={`status-badge status-${String(status).toLowerCase().replaceAll(' ', '-')}`}>
      {status}
    </span>
  );
}

const PROPOSAL_STAGE_STATUSES = [
  'Draft',
  'Submitted',
  'Under Review',
  'Approved',
  'Rejected',
  'Revision',
  'Resubmitted',
];

const latestSubmissionsByMilestone = (submissions) =>
  submissions.reduce((map, submission) => {
    const key = String(submission.milestoneId?._id || submission.milestoneId);
    const existing = map[key];
    const submittedAt = new Date(submission.submittedAt || submission.createdAt).getTime();
    const existingAt = existing
      ? new Date(existing.submittedAt || existing.createdAt).getTime()
      : -1;
    if (!existing || submittedAt >= existingAt) map[key] = submission;
    return map;
  }, {});

function DeliverableForm({ milestone, busy, onSubmit }) {
  const [file, setFile] = useState(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [description, setDescription] = useState('');

  const isRevision = milestone.status === 'revision';

  const submit = async (event) => {
    event.preventDefault();
    const saved = await onSubmit(milestone._id, { file, githubUrl, description });
    if (saved) {
      setFile(null);
      setGithubUrl('');
      setDescription('');
      event.target.reset();
    }
  };

  return (
    <form className="deliverable-form" onSubmit={submit}>
      <label>
        Deliverable file (PDF, Office, ZIP, text or image · max 10 MB)
        <input
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,.png,.jpg,.jpeg"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
      </label>
      <label>
        GitHub URL (optional)
        <input
          type="url"
          placeholder="https://github.com/username/repository"
          value={githubUrl}
          onChange={(event) => setGithubUrl(event.target.value)}
        />
      </label>
      <label className="full-width">
        Description (optional)
        <textarea
          rows="2"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Summarize what you are submitting"
        />
      </label>
      <div className="action-row full-width">
        <button className="button button-primary" type="submit" disabled={busy}>
          {isRevision ? 'Resubmit deliverable' : 'Submit deliverable'}
        </button>
        <span className="form-note">Provide a file or a GitHub URL.</span>
      </div>
    </form>
  );
}

function SubmissionSummary({ submission }) {
  return (
    <div className="submission-summary">
      <div className="submission-summary-head">
        <DeliverableStatus status={submission.status} />
        <span className="form-note">Submitted {formatDate(submission.submittedAt)}</span>
      </div>
      {submission.description && <p>{submission.description}</p>}
      <div className="submission-links">
        {submission.fileUrl && (
          <a href={resolveFileUrl(submission.fileUrl)} target="_blank" rel="noreferrer">
            {submission.fileName || 'Attached file'}
          </a>
        )}
        {submission.githubUrl && (
          <a href={submission.githubUrl} target="_blank" rel="noreferrer">GitHub repository</a>
        )}
      </div>
      {submission.feedback && (
        <div className="feedback-box">
          <strong>Supervisor feedback</strong>
          <p>{submission.feedback}</p>
          {submission.reviewedAt && (
            <small>Reviewed {formatDate(submission.reviewedAt)}</small>
          )}
        </div>
      )}
    </div>
  );
}

export function StudentMilestones({ project, milestones, submissions, busy, onSubmit }) {
  if (!project) {
    return (
      <section className="subsection">
        <div className="empty-detail">
          <h3>No project yet</h3>
          <p>Create and submit a proposal before milestone deliverables become available.</p>
        </div>
      </section>
    );
  }

  const latest = latestSubmissionsByMilestone(submissions);
  const ordered = [...milestones].sort((a, b) => (a.order || 0) - (b.order || 0));
  const projectActive = !PROPOSAL_STAGE_STATUSES.includes(project.status);

  return (
    <section className="subsection">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Student workspace</p>
          <h2>Milestone deliverables</h2>
        </div>
        <DeliverableStatus status={project.status} />
      </div>

      {!ordered.length ? (
        <div className="empty-detail">
          <h3>No milestones yet</h3>
          <p>Your supervisor has not set up milestone deliverables.</p>
        </div>
      ) : (
        <div className="milestone-list">
          {ordered.map((milestone) => {
            const submission = latest[String(milestone._id)];
            const canSubmit = projectActive && ['pending', 'revision'].includes(milestone.status);
            return (
              <article className="milestone-card" key={milestone._id}>
                <div className="detail-heading">
                  <div>
                    <p className="eyebrow">Milestone {milestone.order || ''}</p>
                    <h3>{milestone.title}</h3>
                  </div>
                  <DeliverableStatus status={milestone.status} />
                </div>
                {milestone.description && <p>{milestone.description}</p>}
                {milestone.dueDate && (
                  <p className="form-note">Due {formatDate(milestone.dueDate)}</p>
                )}
                {submission && <SubmissionSummary submission={submission} />}
                {canSubmit ? (
                  <DeliverableForm milestone={milestone} busy={busy} onSubmit={onSubmit} />
                ) : !projectActive ? (
                  <p className="form-note">
                    Deliverables unlock once your proposal is approved and a supervisor assigns the project.
                  </p>
                ) : milestone.status === 'submitted' ? (
                  <p className="form-note">Awaiting supervisor review.</p>
                ) : (
                  <p className="form-note">This milestone has been approved.</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ReviewControls({ submission, busy, onReview }) {
  const [feedback, setFeedback] = useState('');

  return (
    <div className="review-controls">
      <label>
        Feedback
        <textarea
          rows="2"
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          placeholder="Explain your decision (required to request a revision)"
        />
      </label>
      <div className="action-row">
        <button
          className="button button-success"
          type="button"
          disabled={busy}
          onClick={() => onReview(submission._id, 'approve', feedback)}
        >
          Approve
        </button>
        <button
          className="button button-warning"
          type="button"
          disabled={busy}
          onClick={() => onReview(submission._id, 'revision', feedback)}
        >
          Request revision
        </button>
      </div>
    </div>
  );
}

export function SupervisorSubmissions({ project, milestones, submissions, busy, onReview, onRefresh }) {
  if (!project) {
    return (
      <div className="empty-detail">
        <h3>Select a project</h3>
        <p>Choose an assigned project to review its milestone deliverables.</p>
      </div>
    );
  }

  const milestoneTitles = milestones.reduce((map, milestone) => {
    map[String(milestone._id)] = milestone.title;
    return map;
  }, {});

  const ordered = [...submissions].sort(
    (a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt)
  );

  return (
    <section className="management-card assignment-card">
      <div className="section-heading supervisor-section-heading">
        <div>
          <p className="eyebrow">Submission review</p>
          <h3>{project.title}</h3>
        </div>
        <button className="button button-quiet" type="button" onClick={onRefresh}>
          Refresh
        </button>
      </div>
      {!ordered.length ? (
        <p className="empty-state">No deliverables have been submitted for this project.</p>
      ) : (
        <div className="submission-list">
          {ordered.map((submission) => (
            <article className="submission-card" key={submission._id}>
              <div className="detail-heading">
                <div>
                  <p className="eyebrow">
                    {milestoneTitles[String(submission.milestoneId)] || 'Milestone'}
                  </p>
                  <h4>{submission.studentId?.name || 'Student'}</h4>
                </div>
                <DeliverableStatus status={submission.status} />
              </div>
              {submission.description && <p>{submission.description}</p>}
              <div className="submission-links">
                {submission.fileUrl && (
                  <a href={resolveFileUrl(submission.fileUrl)} target="_blank" rel="noreferrer">
                    {submission.fileName || 'Attached file'}
                  </a>
                )}
                {submission.githubUrl && (
                  <a href={submission.githubUrl} target="_blank" rel="noreferrer">GitHub repository</a>
                )}
              </div>
              <p className="form-note">Submitted {formatDate(submission.submittedAt)}</p>
              {submission.status === 'submitted' ? (
                <ReviewControls submission={submission} busy={busy} onReview={onReview} />
              ) : (
                submission.feedback && (
                  <div className="feedback-box">
                    <strong>Feedback sent</strong>
                    <p>{submission.feedback}</p>
                  </div>
                )
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default StudentMilestones;
