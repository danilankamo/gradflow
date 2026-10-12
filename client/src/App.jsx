import { useCallback, useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const emptyProposal = {
  title: '',
  abstract: '',
  problemStatement: '',
  objectives: '',
  methodology: '',
  technologies: '',
  category: '',
  keywords: '',
};

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'The request could not be completed');
  }
  return data;
}

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('gradflow-token') || '');
  const [projects, setProjects] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [proposal, setProposal] = useState(emptyProposal);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const apiOptions = useCallback((method = 'GET', body) => ({
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }), [token]);

  const loadWorkspace = useCallback(async () => {
    if (!user || !token) return;

    try {
      if (user.role === 'coordinator') {
        const [reviewData, dashboardData] = await Promise.all([
          request('/api/projects/coordinator/review', apiOptions()),
          request('/api/projects/coordinator/dashboard', apiOptions()),
        ]);
        setProjects(reviewData.data);
        setDashboard(dashboardData.data);
        setSelectedProject((current) => {
          if (current && reviewData.data.some((project) => project._id === current._id)) {
            return reviewData.data.find((project) => project._id === current._id);
          }
          return reviewData.data[0] || null;
        });
      } else if (user.role === 'student') {
        const projectData = await request('/api/projects/my', apiOptions());
        setProjects(projectData.data);
        const current = projectData.data[0];
        if (current) {
          setProposal({
            title: current.title || '',
            abstract: current.abstract || '',
            problemStatement: current.problemStatement || '',
            objectives: Array.isArray(current.objectives) ? current.objectives.join('\n') : '',
            methodology: current.methodology || '',
            technologies: Array.isArray(current.technologies) ? current.technologies.join(', ') : '',
            category: current.category || '',
            keywords: Array.isArray(current.keywords) ? current.keywords.join(', ') : '',
          });
        } else {
          setProposal(emptyProposal);
        }
      }
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [apiOptions, token, user]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      localStorage.removeItem('gradflow-token');
      return;
    }

    localStorage.setItem('gradflow-token', token);
    let active = true;
    request('/api/auth/me', apiOptions())
      .then((result) => {
        if (active) setUser(result.data);
      })
      .catch(() => {
        if (active) {
          setToken('');
          setUser(null);
        }
      });

    return () => {
      active = false;
    };
  }, [apiOptions, token]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const handleAuth = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const endpoint = authMode === 'login' ? 'login' : 'register';
      const result = await request(`/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      setUser(result.user);
      setToken(result.token);
      setMessage('');
    } catch (authError) {
      setError(authError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProposal = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    const existingProject = projects[0];
    const toList = (value, separator = ',') =>
      value.split(separator).map((part) => part.trim()).filter(Boolean);
    const body = {
      ...proposal,
      objectives: toList(proposal.objectives, '\n'),
      technologies: toList(proposal.technologies),
      keywords: toList(proposal.keywords),
    };
    try {
      const result = await request(
        existingProject ? `/api/projects/${existingProject._id}` : '/api/projects',
        apiOptions(existingProject ? 'PUT' : 'POST', body)
      );
      setMessage('Proposal draft saved.');
      setProjects((current) => existingProject
        ? [result.data, ...current.slice(1)]
        : [result.data]);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitProposal = async () => {
    const existingProject = projects[0];
    setError('');
    setMessage('');
    if (!existingProject) {
      setError('Save the proposal draft before submitting it.');
      return;
    }
    setBusy(true);
    try {
      await request(`/api/projects/${existingProject._id}/submit`, apiOptions('PATCH'));
      setMessage('Proposal submitted to the coordinator.');
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReviewAction = async (action) => {
    if (!selectedProject) return;
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const result = await request(
        `/api/projects/${selectedProject._id}/review`,
        apiOptions('PATCH', { action, comment })
      );
      setMessage(`Proposal marked ${result.data.status.toLowerCase()}.`);
      setComment('');
      await loadWorkspace();
    } catch (reviewError) {
      setError(reviewError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await request('/api/auth/logout', apiOptions());
    } finally {
      setToken('');
      setUser(null);
      setProjects([]);
      setSelectedProject(null);
      setDashboard(null);
    }
  };

  const updateProposal = (field, value) =>
    setProposal((current) => ({ ...current, [field]: value }));

  const projectStatus = projects[0]?.status || 'No proposal';
  const editable = ['Draft', 'Revision'].includes(projectStatus);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">G</span>
          <div>
            <p className="eyebrow">GradFlow</p>
            <h1>Graduation project workspace</h1>
          </div>
        </div>
        {user && (
          <div className="account">
            <span>{user.name} <small>{user.role}</small></span>
            <button className="button button-quiet" type="button" onClick={handleLogout}>Sign out</button>
          </div>
        )}
      </header>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {message && <div className="alert alert-success" role="status">{message}</div>}

      {!user ? (
        <section className="auth-card">
          <div className="auth-intro">
            <p className="eyebrow">Welcome</p>
            <h2>{authMode === 'login' ? 'Sign in to GradFlow' : 'Create a student account'}</h2>
            <p>Manage proposals and keep the graduation project process moving.</p>
          </div>
          <div className="tabs">
            <button className={authMode === 'login' ? 'selected' : ''} type="button" onClick={() => setAuthMode('login')}>Sign in</button>
            <button className={authMode === 'register' ? 'selected' : ''} type="button" onClick={() => setAuthMode('register')}>Register</button>
          </div>
          <form className="form-grid" onSubmit={handleAuth}>
            {authMode === 'register' && (
              <label>Full name
                <input required value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} />
              </label>
            )}
            <label>Email
              <input type="email" required value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} />
            </label>
            <label>Password
              <input type="password" required minLength={8} value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} />
            </label>
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          {authMode === 'register' && <p className="form-note">New registrations receive the Student role. Staff access is provisioned by a coordinator.</p>}
        </section>
      ) : user.role === 'coordinator' ? (
        <section className="workspace">
          <div className="page-heading">
            <div><p className="eyebrow">Coordinator workspace</p><h2>Proposal review</h2></div>
            <button className="button button-quiet" type="button" onClick={loadWorkspace}>Refresh</button>
          </div>

          <div className="stats-grid">
            <StatCard label="Total projects" value={dashboard?.totalProjects ?? '—'} />
            <StatCard label="Pending proposals" value={dashboard?.pendingProposals ?? '—'} accent />
            <StatCard label="Approved" value={dashboard?.projectsByStatus?.Approved ?? 0} />
            <StatCard label="Revision requested" value={dashboard?.projectsByStatus?.Revision ?? 0} />
          </div>

          <div className="review-layout">
            <aside className="proposal-list">
              <div className="section-heading"><h3>Pending proposals</h3><span>{projects.length}</span></div>
              {projects.length === 0 ? (
                <p className="empty-state">There are no proposals awaiting review.</p>
              ) : projects.map((project) => {
                const student = project.students?.[0];
                return (
                  <button
                    type="button"
                    key={project._id}
                    onClick={() => { setSelectedProject(project); setComment(project.coordinatorComment || ''); }}
                    className={`proposal-list-item ${selectedProject?._id === project._id ? 'active' : ''}`}
                  >
                    <strong>{project.title}</strong>
                    <span>{student?.name || 'Student'} · {project.status}</span>
                  </button>
                );
              })}
            </aside>

            <section className="proposal-detail">
              {!selectedProject ? (
                <div className="empty-detail"><h3>Select a proposal</h3><p>Choose a proposal from the queue to review its details.</p></div>
              ) : (
                <>
                  <div className="detail-heading">
                    <div><p className="eyebrow">{selectedProject.category || 'Project proposal'}</p><h3>{selectedProject.title}</h3></div>
                    <StatusBadge status={selectedProject.status} />
                  </div>
                  <div className="student-byline">
                    <strong>{selectedProject.students?.map((student) => student.name).join(', ') || 'Student'}</strong>
                    <span>{selectedProject.students?.[0]?.email || ''}</span>
                    {selectedProject.submittedAt && <span>Submitted {new Date(selectedProject.submittedAt).toLocaleDateString()}</span>}
                  </div>
                  <ProposalDetails project={selectedProject} />
                  <div className="review-controls">
                    <label>Coordinator comment
                      <textarea rows="3" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add feedback or a decision note for the student" />
                    </label>
                    <div className="action-row">
                      {selectedProject.status !== 'Under Review' && (
                        <button className="button button-quiet" disabled={busy} type="button" onClick={() => handleReviewAction('start_review')}>Mark under review</button>
                      )}
                      <button className="button button-success" disabled={busy} type="button" onClick={() => handleReviewAction('approve')}>Approve</button>
                      <button className="button button-warning" disabled={busy} type="button" onClick={() => handleReviewAction('revision')}>Request revision</button>
                      <button className="button button-danger" disabled={busy} type="button" onClick={() => handleReviewAction('reject')}>Reject</button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </section>
      ) : user.role === 'student' ? (
        <section className="workspace student-workspace">
          <div className="page-heading">
            <div><p className="eyebrow">Student workspace</p><h2>Your proposal</h2></div>
            <StatusBadge status={projectStatus} />
          </div>
          {projects[0]?.coordinatorComment && (
            <div className="feedback-box">
              <strong>Coordinator feedback</strong>
              <p>{projects[0].coordinatorComment}</p>
            </div>
          )}
          <form className="proposal-form" onSubmit={handleSaveProposal}>
            <label>Project title<input required disabled={!editable} value={proposal.title} onChange={(event) => updateProposal('title', event.target.value)} /></label>
            <label>Category<input disabled={!editable} value={proposal.category} onChange={(event) => updateProposal('category', event.target.value)} /></label>
            <label className="full-width">Abstract<textarea required disabled={!editable} rows="4" value={proposal.abstract} onChange={(event) => updateProposal('abstract', event.target.value)} /></label>
            <label className="full-width">Problem statement<textarea required disabled={!editable} rows="4" value={proposal.problemStatement} onChange={(event) => updateProposal('problemStatement', event.target.value)} /></label>
            <label className="full-width">Objectives (one per line)<textarea disabled={!editable} rows="3" value={proposal.objectives} onChange={(event) => updateProposal('objectives', event.target.value)} /></label>
            <label className="full-width">Methodology<textarea required disabled={!editable} rows="3" value={proposal.methodology} onChange={(event) => updateProposal('methodology', event.target.value)} /></label>
            <label>Technologies (comma-separated)<input disabled={!editable} value={proposal.technologies} onChange={(event) => updateProposal('technologies', event.target.value)} /></label>
            <label>Keywords (comma-separated)<input disabled={!editable} value={proposal.keywords} onChange={(event) => updateProposal('keywords', event.target.value)} /></label>
            {editable && <div className="action-row full-width">
              <button className="button button-quiet" disabled={busy} type="submit">Save draft</button>
              <button className="button button-primary" disabled={busy} type="button" onClick={handleSubmitProposal}>Submit for review</button>
            </div>}
          </form>
          {!editable && <p className="form-note">This proposal is locked while it is under review or after a coordinator decision.</p>}
        </section>
      ) : (
        <section className="workspace empty-detail"><h2>Workspace not available</h2><p>This Day 4 interface is for coordinators and students.</p></section>
      )}
    </main>
  );
}

function StatCard({ label, value, accent = false }) {
  return <article className={`stat-card ${accent ? 'stat-accent' : ''}`}><span>{label}</span><strong>{value}</strong></article>;
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span>;
}

function ProposalDetails({ project }) {
  const fields = [
    ['Abstract', project.abstract],
    ['Problem statement', project.problemStatement],
    ['Objectives', Array.isArray(project.objectives) ? project.objectives.join('; ') : project.objectives],
    ['Methodology', project.methodology],
    ['Technologies', Array.isArray(project.technologies) ? project.technologies.join(', ') : project.technologies],
    ['Keywords', Array.isArray(project.keywords) ? project.keywords.join(', ') : project.keywords],
  ];
  return <dl className="proposal-fields">
    {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not provided'}</dd></div>)}
  </dl>;
}

export default App;
