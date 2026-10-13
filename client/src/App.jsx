import { useCallback, useEffect, useMemo, useState } from 'react';
import SupervisorManagement, { SupervisorWorkspace } from './SupervisorManagement.jsx';

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
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || 'The request could not be completed');
  }
  return data;
}

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', department: '', studentId: '' });
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('gradflow-token') || '');
  const [route, setRoute] = useState('overview');
  const [projects, setProjects] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [assignmentProjects, setAssignmentProjects] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [proposal, setProposal] = useState(emptyProposal);
  const [profile, setProfile] = useState({ name: '', department: '', bio: '', skills: '' });
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const apiOptions = useCallback((method = 'GET', body) => ({
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }), [token]);

  const loadWorkspace = useCallback(async () => {
    if (!user || !token) return;
    setError('');
    try {
      if (user.role === 'coordinator') {
        const [reviewData, dashboardData, supervisorData, assignmentData] = await Promise.all([
          request('/api/projects/coordinator/review', apiOptions()),
          request('/api/projects/coordinator/dashboard', apiOptions()),
          request('/api/users/supervisors', apiOptions()),
          request('/api/projects/coordinator/assignments', apiOptions()),
        ]);
        setProjects(reviewData.data);
        setDashboard(dashboardData.data);
        setSupervisors(supervisorData.data);
        setAssignmentProjects(assignmentData.data);
        setSelectedProject((current) => {
          const retained = reviewData.data.find((project) => project._id === current?._id);
          return retained || reviewData.data[0] || null;
        });
      } else if (user.role === 'student') {
        const result = await request('/api/projects/my', apiOptions());
        setProjects(result.data);
        const current = result.data[0];
        setProposal(current ? {
          title: current.title || '',
          abstract: current.abstract || '',
          problemStatement: current.problemStatement || '',
          objectives: Array.isArray(current.objectives) ? current.objectives.join('\n') : '',
          methodology: current.methodology || '',
          technologies: Array.isArray(current.technologies) ? current.technologies.join(', ') : '',
          category: current.category || '',
          keywords: Array.isArray(current.keywords) ? current.keywords.join(', ') : '',
        } : emptyProposal);
      } else if (user.role === 'supervisor') {
        const result = await request('/api/projects/supervisor/assigned', apiOptions());
        setProjects(result.data);
      }
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [apiOptions, token, user]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      localStorage.removeItem('gradflow-token');
      return undefined;
    }

    localStorage.setItem('gradflow-token', token);
    let active = true;
    request('/api/auth/me', apiOptions())
      .then((result) => {
        if (active) {
          setUser(result.data);
          setProfile({
            name: result.data.name || '',
            department: result.data.department || '',
            bio: result.data.bio || '',
            skills: Array.isArray(result.data.skills) ? result.data.skills.join(', ') : '',
          });
        }
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

  const routes = useMemo(() => {
    if (!user) return [];
    const shared = [{ key: 'overview', label: 'Overview' }, { key: 'profile', label: 'Profile' }];
    if (user.role === 'student') {
      return [...shared, { key: 'proposal', label: 'My Proposal' }];
    }
    if (user.role === 'coordinator') {
      return [
        ...shared,
        { key: 'review', label: 'Proposal Review' },
        { key: 'supervisors', label: 'Supervisors' },
      ];
    }
    return [...shared, { key: 'workspace', label: 'Workspace' }];
  }, [user]);

  const handleAuth = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const endpoint = authMode === 'login' ? 'login' : 'register';
      const payload = authMode === 'register'
        ? authForm
        : { email: authForm.email, password: authForm.password };
      const result = await request(`/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setToken(result.token);
      setUser(result.user);
      setProfile({
        name: result.user.name || '',
        department: result.user.department || '',
        bio: '',
        skills: '',
      });
      setMessage('');
    } catch (authError) {
      setError(authError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await request('/api/users/me', apiOptions('PUT', {
        name: profile.name,
        department: profile.department,
        bio: profile.bio,
        skills: profile.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
      }));
      setUser(result.data);
      setMessage('Profile updated.');
    } catch (profileError) {
      setError(profileError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProposal = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const current = projects[0];
    const list = (value, separator = ',') =>
      value.split(separator).map((item) => item.trim()).filter(Boolean);
    const body = {
      ...proposal,
      objectives: list(proposal.objectives, '\n'),
      technologies: list(proposal.technologies),
      keywords: list(proposal.keywords),
    };
    try {
      const result = await request(
        current ? `/api/projects/${current._id}` : '/api/projects',
        apiOptions(current ? 'PUT' : 'POST', body)
      );
      setProjects((previous) => current
        ? [result.data, ...previous.slice(1)]
        : [result.data]);
      setMessage('Proposal draft saved.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitProposal = async () => {
    const current = projects[0];
    if (!current) {
      setError('Save the proposal draft before submitting it.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request(`/api/projects/${current._id}/submit`, apiOptions('PATCH'));
      setMessage('Proposal submitted for coordinator review.');
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReviewAction = async (action) => {
    if (!selectedProject) return;
    setBusy(true);
    setError('');
    setMessage('');
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

  const handleSupervisorSave = async (supervisorData, supervisorId) => {
    setBusy(true);
    setError('');
    setMessage('');
    const payload = { ...supervisorData };
    if (!payload.password) delete payload.password;
    try {
      await request(
        supervisorId
          ? `/api/users/supervisors/${supervisorId}`
          : '/api/users/supervisors',
        apiOptions(supervisorId ? 'PUT' : 'POST', payload)
      );
      setMessage(supervisorId ? 'Supervisor profile updated.' : 'Supervisor account created.');
      await loadWorkspace();
      return true;
    } catch (supervisorError) {
      setError(supervisorError.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleSupervisorDelete = async (supervisorId) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request(`/api/users/supervisors/${supervisorId}`, apiOptions('DELETE'));
      setMessage('Supervisor account deleted.');
      await loadWorkspace();
    } catch (supervisorError) {
      setError(supervisorError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSupervisorAssign = async (project, supervisorId, currentSupervisorId) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await request(
        `/api/projects/${project._id}/supervisor`,
        apiOptions('PATCH', {
          supervisorId,
          ...(currentSupervisorId ? { currentSupervisorId } : {}),
        })
      );
      setMessage(`${result.data.title} assigned to ${result.data.supervisorId.name}.`);
      await loadWorkspace();
      return true;
    } catch (assignmentError) {
      setError(assignmentError.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (token) await request('/api/auth/logout', apiOptions());
    } catch (logoutError) {
      console.error('Logout error:', logoutError);
    } finally {
      setToken('');
      setUser(null);
      setRoute('overview');
      setProjects([]);
      setSupervisors([]);
      setAssignmentProjects([]);
      setSelectedProject(null);
      setDashboard(null);
      setMessage('');
      setError('');
    }
  };

  const updateProposal = (field, value) =>
    setProposal((current) => ({ ...current, [field]: value }));
  const projectStatus = projects[0]?.status || 'No proposal';
  const canEditProposal = ['Draft', 'Revision'].includes(projectStatus);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">G</span>
          <div><p className="eyebrow">GradFlow</p><h1>Graduation project workspace</h1></div>
        </div>
        {user && (
          <div className="account">
            <span>{user.name}<small>{user.role}</small></span>
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
              <>
                <label>Full name<input required value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} /></label>
                <label>Department<input value={authForm.department} onChange={(event) => setAuthForm({ ...authForm, department: event.target.value })} /></label>
                <label>Student ID<input value={authForm.studentId} onChange={(event) => setAuthForm({ ...authForm, studentId: event.target.value })} /></label>
              </>
            )}
            <label>Email<input type="email" required value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} /></label>
            <label>Password<input type="password" minLength={8} required value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} /></label>
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          {authMode === 'register' && <p className="form-note">New registrations receive the Student role. Staff access is provisioned by a coordinator.</p>}
        </section>
      ) : (
        <section className="workspace">
          <nav className="route-nav" aria-label="Primary navigation">
            {routes.map((item) => (
              <button key={item.key} type="button" className={route === item.key ? 'active' : ''} onClick={() => setRoute(item.key)}>
                {item.label}
              </button>
            ))}
          </nav>

          {route === 'overview' && (
            <div className="page-heading">
              <div><p className="eyebrow">{user.role} workspace</p><h2>Welcome, {user.name}</h2></div>
              {user.role === 'student' && <StatusBadge status={projectStatus} />}
            </div>
          )}

          {route === 'profile' && (
            <section className="subsection">
              <div className="page-heading"><div><p className="eyebrow">Account</p><h2>Your profile</h2></div></div>
              <form className="proposal-form" onSubmit={handleProfileSave}>
                <label>Full name<input required value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
                <label>Department<input value={profile.department} onChange={(event) => setProfile({ ...profile, department: event.target.value })} /></label>
                <label className="full-width">Bio<textarea rows="3" value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} /></label>
                <label className="full-width">Skills (comma-separated)<input value={profile.skills} onChange={(event) => setProfile({ ...profile, skills: event.target.value })} /></label>
                <div className="action-row full-width"><button className="button button-primary" type="submit" disabled={busy}>Save profile</button></div>
              </form>
            </section>
          )}

          {route === 'proposal' && user.role === 'student' && (
            <section className="subsection student-workspace">
              <div className="page-heading">
                <div><p className="eyebrow">Student workspace</p><h2>Your proposal</h2></div>
                <StatusBadge status={projectStatus} />
              </div>
              {projects[0]?.coordinatorComment && (
                <div className="feedback-box"><strong>Coordinator feedback</strong><p>{projects[0].coordinatorComment}</p></div>
              )}
              <form className="proposal-form" onSubmit={handleSaveProposal}>
                <label>Project title<input required disabled={!canEditProposal} value={proposal.title} onChange={(event) => updateProposal('title', event.target.value)} /></label>
                <label>Category<input disabled={!canEditProposal} value={proposal.category} onChange={(event) => updateProposal('category', event.target.value)} /></label>
                <label className="full-width">Abstract<textarea required disabled={!canEditProposal} rows="4" value={proposal.abstract} onChange={(event) => updateProposal('abstract', event.target.value)} /></label>
                <label className="full-width">Problem statement<textarea required disabled={!canEditProposal} rows="4" value={proposal.problemStatement} onChange={(event) => updateProposal('problemStatement', event.target.value)} /></label>
                <label className="full-width">Objectives (one per line)<textarea disabled={!canEditProposal} rows="3" value={proposal.objectives} onChange={(event) => updateProposal('objectives', event.target.value)} /></label>
                <label className="full-width">Methodology<textarea required disabled={!canEditProposal} rows="3" value={proposal.methodology} onChange={(event) => updateProposal('methodology', event.target.value)} /></label>
                <label>Technologies (comma-separated)<input disabled={!canEditProposal} value={proposal.technologies} onChange={(event) => updateProposal('technologies', event.target.value)} /></label>
                <label>Keywords (comma-separated)<input disabled={!canEditProposal} value={proposal.keywords} onChange={(event) => updateProposal('keywords', event.target.value)} /></label>
                {canEditProposal ? (
                  <div className="action-row full-width">
                    <button className="button button-quiet" type="submit" disabled={busy}>Save draft</button>
                    <button className="button button-primary" type="button" disabled={busy} onClick={handleSubmitProposal}>Submit for review</button>
                  </div>
                ) : <p className="form-note full-width">Proposal editing is locked until the coordinator requests revision.</p>}
              </form>
            </section>
          )}

          {route === 'review' && user.role === 'coordinator' && (
            <CoordinatorReview
              projects={projects}
              dashboard={dashboard}
              selectedProject={selectedProject}
              setSelectedProject={(project) => {
                setSelectedProject(project);
                setComment(project.coordinatorComment || '');
              }}
              comment={comment}
              setComment={setComment}
              busy={busy}
              onAction={handleReviewAction}
              onRefresh={loadWorkspace}
            />
          )}

          {route === 'supervisors' && user.role === 'coordinator' && (
            <SupervisorManagement
              supervisors={supervisors}
              projects={assignmentProjects}
              busy={busy}
              onSave={handleSupervisorSave}
              onDelete={handleSupervisorDelete}
              onAssign={handleSupervisorAssign}
              onRefresh={loadWorkspace}
            />
          )}

          {route === 'overview' && user.role === 'coordinator' && dashboard && (
            <div className="stats-grid">
              <StatCard label="Total projects" value={dashboard.totalProjects} />
              <StatCard label="Pending proposals" value={dashboard.pendingProposals} accent />
              <StatCard label="Approved" value={dashboard.projectsByStatus?.Approved || 0} />
              <StatCard label="Revision requested" value={dashboard.projectsByStatus?.Revision || 0} />
            </div>
          )}

          {route === 'overview' && user.role === 'student' && (
            <div className="info-card"><h3>Proposal status</h3><p>{projectStatus === 'No proposal' ? 'Start by creating your graduation project proposal.' : `Your proposal is ${projectStatus.toLowerCase()}.`}</p></div>
          )}

          {route === 'workspace' && (
            user.role === 'supervisor'
              ? <SupervisorWorkspace projects={projects} onRefresh={loadWorkspace} />
              : <div className="info-card"><h3>{user.role} workspace</h3><p>Role-specific project tools will appear here as their workflows are implemented.</p></div>
          )}
        </section>
      )}
    </main>
  );
}

function CoordinatorReview({ projects, dashboard, selectedProject, setSelectedProject, comment, setComment, busy, onAction, onRefresh }) {
  return (
    <section className="subsection">
      <div className="page-heading">
        <div><p className="eyebrow">Coordinator workspace</p><h2>Proposal review</h2></div>
        <button className="button button-quiet" type="button" onClick={onRefresh}>Refresh</button>
      </div>
      <div className="stats-grid">
        <StatCard label="Total projects" value={dashboard?.totalProjects ?? '—'} />
        <StatCard label="Pending proposals" value={dashboard?.pendingProposals ?? '—'} accent />
        <StatCard label="Approved" value={dashboard?.projectsByStatus?.Approved || 0} />
        <StatCard label="Revision requested" value={dashboard?.projectsByStatus?.Revision || 0} />
      </div>
      <div className="review-layout">
        <aside className="proposal-list">
          <div className="section-heading"><h3>Pending proposals</h3><span>{projects.length}</span></div>
          {!projects.length ? <p className="empty-state">There are no proposals awaiting review.</p> : projects.map((project) => (
            <button
              key={project._id}
              className={`proposal-list-item ${selectedProject?._id === project._id ? 'active' : ''}`}
              type="button"
              onClick={() => setSelectedProject(project)}
            >
              <strong>{project.title}</strong>
              <span>{project.students?.[0]?.name || 'Student'} · {project.status}</span>
            </button>
          ))}
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
                <label>Coordinator comment<textarea rows="3" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add feedback or a decision note for the student" /></label>
                <div className="action-row">
                  {selectedProject.status !== 'Under Review' && <button className="button button-quiet" type="button" disabled={busy} onClick={() => onAction('start_review')}>Mark under review</button>}
                  <button className="button button-success" type="button" disabled={busy} onClick={() => onAction('approve')}>Approve</button>
                  <button className="button button-warning" type="button" disabled={busy} onClick={() => onAction('revision')}>Request revision</button>
                  <button className="button button-danger" type="button" disabled={busy} onClick={() => onAction('reject')}>Reject</button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </section>
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
  return (
    <dl className="proposal-fields">
      {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not provided'}</dd></div>)}
    </dl>
  );
}

export default App;
