import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const roleLabels = {
  student: 'Student',
  supervisor: 'Supervisor',
  coordinator: 'Coordinator',
  examiner: 'Examiner',
};

const defaultAuthForm = {
  name: '',
  email: '',
  password: '',
  department: '',
  studentId: '',
};

const blankProject = {
  title: '',
  abstract: '',
  problemStatement: '',
  objectives: '',
  methodology: '',
  technologies: '',
  keywords: '',
  category: '',
};

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState(defaultAuthForm);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('gradflow-user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('gradflow-token') || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState('overview');
  const [profileForm, setProfileForm] = useState({ name: '', department: '', bio: '', skills: '' });
  const [projectForm, setProjectForm] = useState(blankProject);
  const [projectStatus, setProjectStatus] = useState('');
  const [projects, setProjects] = useState([]);
  const [projectMessage, setProjectMessage] = useState('');

  useEffect(() => {
    if (user) {
      localStorage.setItem('gradflow-user', JSON.stringify(user));
      setProfileForm({
        name: user.name || '',
        department: user.department || '',
        bio: user.bio || '',
        skills: user.skills ? user.skills.join(', ') : '',
      });
    } else {
      localStorage.removeItem('gradflow-user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('gradflow-token', token);
      loadMyProjects();
    } else {
      localStorage.removeItem('gradflow-token');
    }
  }, [token]);

  const loadMyProjects = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/projects/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load projects');
      }

      setProjects(data.data || []);
      if (data.data && data.data.length > 0) {
        const latestProject = data.data[0];
        setProjectForm({
          title: latestProject.title || '',
          abstract: latestProject.abstract || '',
          problemStatement: latestProject.problemStatement || '',
          objectives: Array.isArray(latestProject.objectives) ? latestProject.objectives.join('\n') : '',
          methodology: latestProject.methodology || '',
          technologies: Array.isArray(latestProject.technologies) ? latestProject.technologies.join(', ') : '',
          keywords: Array.isArray(latestProject.keywords) ? latestProject.keywords.join(', ') : '',
          category: latestProject.category || '',
        });
        setProjectStatus(latestProject.status || 'Draft');
      }
    } catch (loadError) {
      console.error('Project load error:', loadError);
    }
  };

  const routeOptions = useMemo(
    () => [
      { key: 'overview', label: 'Overview', roles: ['student', 'supervisor', 'coordinator', 'examiner'] },
      { key: 'profile', label: 'Profile', roles: ['student', 'supervisor', 'coordinator', 'examiner'] },
      { key: 'projects', label: 'Projects', roles: ['student', 'supervisor', 'coordinator'] },
      { key: 'review', label: 'Review Queue', roles: ['coordinator', 'supervisor'] },
      { key: 'evaluation', label: 'Assessments', roles: ['examiner'] },
    ],
    []
  );

  const updateAuthField = (field, value) => {
    setAuthForm((current) => ({ ...current, [field]: value }));
  };

  const updateProfileField = (field, value) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const updateProjectField = (field, value) => {
    setProjectForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        authMode === 'login'
          ? { email: authForm.email, password: authForm.password }
          : {
              name: authForm.name,
              email: authForm.email,
              password: authForm.password,
              department: authForm.department,
              studentId: authForm.studentId,
              role: 'student',
            };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      setUser(data.user);
      setToken(data.token);
      setAuthForm(defaultAuthForm);
      setAuthMode('login');
    } catch (submitError) {
      setError(submitError.message || 'Unable to authenticate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(`${API_URL}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileForm.name,
          department: profileForm.department,
          bio: profileForm.bio,
          skills: profileForm.skills
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to update profile');
      }

      setUser(data.data);
      setProjectMessage('Profile updated successfully.');
    } catch (profileError) {
      setProjectMessage(profileError.message || 'Profile update failed');
    }
  };

  const handleDraftSave = async (event) => {
    event.preventDefault();
    setProjectMessage('');

    const payload = {
      ...projectForm,
      objectives: projectForm.objectives
        .split('\n')
        .map((objective) => objective.trim())
        .filter(Boolean),
      technologies: projectForm.technologies
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      keywords: projectForm.keywords
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      status: 'Draft',
    };

    try {
      const isExistingProject = !!projects[0];
      const response = await fetch(
        `${API_URL}${isExistingProject ? `/api/projects/${projects[0]._id}` : '/api/projects'}`,
        {
          method: isExistingProject ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Proposal save failed');
      }

      setProjectStatus(data.data?.status || 'Draft');
      setProjectMessage('Draft proposal saved successfully.');
      await loadMyProjects();
    } catch (projectError) {
      setProjectMessage(projectError.message || 'Failed to save proposal');
    }
  };

  const handleSubmitProposal = async () => {
    setProjectMessage('');

    if (!projects[0] || !projects[0]._id) {
      setProjectMessage('Save your proposal draft before submitting.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/projects/${projects[0]._id}/submit`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Proposal submission failed');
      }

      setProjectStatus(data.status || 'Submitted');
      setProjectMessage('Proposal submitted successfully.');
      await loadMyProjects();
    } catch (submitError) {
      setProjectMessage(submitError.message || 'Proposal submission failed');
    }
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'GET',
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (logoutError) {
      console.error('Logout error:', logoutError);
    } finally {
      setUser(null);
      setToken('');
      setRoute('overview');
      setProjectForm(blankProject);
      setProjects([]);
    }
  };

  const roleAccess = (allowedRoles) => !user || allowedRoles.includes(user.role);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">GradFlow</p>
          <h1>Student workflow and proposal lifecycle</h1>
        </div>
        {user ? (
          <button className="secondary-button" onClick={handleLogout} type="button">
            Logout
          </button>
        ) : null}
      </header>

      {!user ? (
        <section className="auth-panel">
          <div className="auth-toggle" aria-label="Authentication mode">
            <button
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => setAuthMode('login')}
              type="button"
            >
              Login
            </button>
            <button
              className={authMode === 'register' ? 'active' : ''}
              onClick={() => setAuthMode('register')}
              type="button"
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {authMode === 'register' ? (
              <label>
                Full name
                <input
                  type="text"
                  value={authForm.name}
                  onChange={(event) => updateAuthField('name', event.target.value)}
                  placeholder="Jane Doe"
                  required
                />
              </label>
            ) : null}

            <label>
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => updateAuthField('email', event.target.value)}
                placeholder="student@gradflow.edu"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => updateAuthField('password', event.target.value)}
                placeholder="Enter your password"
                minLength={8}
                required
              />
            </label>

            {authMode === 'register' ? (
              <>
                <label>
                  Department
                  <input
                    type="text"
                    value={authForm.department}
                    onChange={(event) => updateAuthField('department', event.target.value)}
                    placeholder="Computer Science"
                  />
                </label>

                <label>
                  Student ID
                  <input
                    type="text"
                    value={authForm.studentId}
                    onChange={(event) => updateAuthField('studentId', event.target.value)}
                    placeholder="CS-2026-202"
                  />
                </label>
              </>
            ) : null}

            {error ? <p className="error-text">{error}</p> : null}

            <button className="primary-button" disabled={loading} type="submit">
              {loading ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Create account'}
            </button>
          </form>
        </section>
      ) : (
        <section className="dashboard-panel">
          <div className="user-summary">
            <div>
              <p className="eyebrow">Signed in as</p>
              <h2>{user.name}</h2>
            </div>
            <span className="role-badge">{roleLabels[user.role] || user.role}</span>
          </div>

          <nav className="route-nav" aria-label="Primary navigation">
            {routeOptions.map((option) => {
              const isVisible = roleAccess(option.roles);
              if (!isVisible) {
                return null;
              }

              return (
                <button
                  key={option.key}
                  type="button"
                  className={route === option.key ? 'active' : ''}
                  onClick={() => setRoute(option.key)}
                >
                  {option.label}
                </button>
              );
            })}
          </nav>

          {route === 'overview' ? (
            <div className="card-grid">
              <article className="info-card">
                <h3>Day 3 status</h3>
                <p>Students can now manage profile details and create proposal drafts that can be submitted for review.</p>
              </article>
              <article className="info-card">
                <h3>Lifecycle</h3>
                <p>Draft → Submitted → Under Review</p>
              </article>
            </div>
          ) : null}

          {route === 'profile' ? (
            <RoleGuard allowedRoles={['student', 'supervisor', 'coordinator', 'examiner']} userRole={user.role}>
              <form onSubmit={handleProfileSave} className="stacked-form">
                <label>
                  Full name
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(event) => updateProfileField('name', event.target.value)}
                  />
                </label>

                <label>
                  Department
                  <input
                    type="text"
                    value={profileForm.department}
                    onChange={(event) => updateProfileField('department', event.target.value)}
                  />
                </label>

                <label>
                  Bio
                  <textarea
                    rows="4"
                    value={profileForm.bio}
                    onChange={(event) => updateProfileField('bio', event.target.value)}
                  />
                </label>

                <label>
                  Skills
                  <input
                    type="text"
                    value={profileForm.skills}
                    onChange={(event) => updateProfileField('skills', event.target.value)}
                    placeholder="React, Node.js, Data Science"
                  />
                </label>

                <button className="primary-button" type="submit">
                  Save profile
                </button>
              </form>
            </RoleGuard>
          ) : null}

          {route === 'projects' ? (
            <RoleGuard allowedRoles={['student', 'supervisor', 'coordinator']} userRole={user.role}>
              <div className="proposal-panel">
                <div className="status-row">
                  <h3>Project proposal</h3>
                  <span className="role-badge subtle">{projectStatus || 'Draft'}</span>
                </div>

                <form className="stacked-form" onSubmit={handleDraftSave}>
                  <label>
                    Project title
                    <input
                      type="text"
                      value={projectForm.title}
                      onChange={(event) => updateProjectField('title', event.target.value)}
                      placeholder="AI-based project tracking system"
                    />
                  </label>

                  <label>
                    Category
                    <input
                      type="text"
                      value={projectForm.category}
                      onChange={(event) => updateProjectField('category', event.target.value)}
                      placeholder="Software Engineering"
                    />
                  </label>

                  <label>
                    Abstract
                    <textarea
                      rows="4"
                      value={projectForm.abstract}
                      onChange={(event) => updateProjectField('abstract', event.target.value)}
                    />
                  </label>

                  <label>
                    Problem statement
                    <textarea
                      rows="4"
                      value={projectForm.problemStatement}
                      onChange={(event) => updateProjectField('problemStatement', event.target.value)}
                    />
                  </label>

                  <label>
                    Objectives (one per line)
                    <textarea
                      rows="4"
                      value={projectForm.objectives}
                      onChange={(event) => updateProjectField('objectives', event.target.value)}
                    />
                  </label>

                  <label>
                    Methodology
                    <textarea
                      rows="3"
                      value={projectForm.methodology}
                      onChange={(event) => updateProjectField('methodology', event.target.value)}
                    />
                  </label>

                  <label>
                    Technologies
                    <input
                      type="text"
                      value={projectForm.technologies}
                      onChange={(event) => updateProjectField('technologies', event.target.value)}
                      placeholder="React, Node.js, MongoDB"
                    />
                  </label>

                  <label>
                    Keywords
                    <input
                      type="text"
                      value={projectForm.keywords}
                      onChange={(event) => updateProjectField('keywords', event.target.value)}
                      placeholder="AI, analytics, graduation project"
                    />
                  </label>

                  {projectMessage ? <p className="info-text">{projectMessage}</p> : null}

                  <div className="button-row">
                    <button className="secondary-button" type="submit">
                      Save draft
                    </button>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={handleSubmitProposal}
                    >
                      Submit proposal
                    </button>
                  </div>
                </form>

                {projects.length > 0 ? (
                  <div className="mini-list">
                    <h4>Recent project records</h4>
                    {projects.map((project) => (
                      <div key={project._id} className="list-item">
                        <strong>{project.title}</strong>
                        <span>{project.status}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </RoleGuard>
          ) : null}

          {route === 'review' ? (
            <RoleGuard allowedRoles={['coordinator', 'supervisor']} userRole={user.role}>
              <div className="card-grid">
                <article className="info-card">
                  <h3>Review queue</h3>
                  <p>Coordinator approvals and supervisor comments are managed here once proposals are submitted.</p>
                </article>
              </div>
            </RoleGuard>
          ) : null}

          {route === 'evaluation' ? (
            <RoleGuard allowedRoles={['examiner']} userRole={user.role}>
              <div className="card-grid">
                <article className="info-card">
                  <h3>Assessment panel</h3>
                  <p>Examiners evaluate final projects after defense scheduling and completion.</p>
                </article>
              </div>
            </RoleGuard>
          ) : null}
        </section>
      )}
    </main>
  );
}

function RoleGuard({ allowedRoles, userRole, children }) {
  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="info-card access-denied">
        <h3>Access forbidden</h3>
        <p>This route requires a role with elevated permissions for your current account.</p>
      </div>
    );
  }

  return children;
}

export default App;
