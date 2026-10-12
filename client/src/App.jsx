import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const roleLabels = {
  student: 'Student',
  supervisor: 'Supervisor',
  coordinator: 'Coordinator',
  examiner: 'Examiner',
};

const defaultForm = {
  name: '',
  email: '',
  password: '',
  department: '',
  studentId: '',
};

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [form, setForm] = useState(defaultForm);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('gradflow-user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('gradflow-token') || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState('overview');

  useEffect(() => {
    if (user) {
      localStorage.setItem('gradflow-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('gradflow-user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('gradflow-token', token);
    } else {
      localStorage.removeItem('gradflow-token');
    }
  }, [token]);

  const routeOptions = useMemo(
    () => [
      { key: 'overview', label: 'Overview', roles: ['student', 'supervisor', 'coordinator', 'examiner'] },
      { key: 'projects', label: 'Projects', roles: ['student', 'supervisor', 'coordinator'] },
      { key: 'review', label: 'Review Queue', roles: ['coordinator', 'supervisor'] },
      { key: 'evaluation', label: 'Assessments', roles: ['examiner'] },
    ],
    []
  );

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        authMode === 'login'
          ? { email: form.email, password: form.password }
          : {
              name: form.name,
              email: form.email,
              password: form.password,
              department: form.department,
              studentId: form.studentId,
              role: 'student',
            };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      setUser(data.user);
      setToken(data.token);
      setForm(defaultForm);
      setAuthMode('login');
    } catch (submitError) {
      setError(submitError.message || 'Unable to authenticate. Please try again.');
    } finally {
      setLoading(false);
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
    }
  };

  const roleAccess = (allowedRoles) => !user || allowedRoles.includes(user.role);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">GradFlow</p>
          <h1>Authentication and RBAC</h1>
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
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Jane Doe"
                  required
                />
              </label>
            ) : null}

            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="student@gradflow.edu"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
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
                    value={form.department}
                    onChange={(event) => updateField('department', event.target.value)}
                    placeholder="Computer Science"
                  />
                </label>

                <label>
                  Student ID
                  <input
                    type="text"
                    value={form.studentId}
                    onChange={(event) => updateField('studentId', event.target.value)}
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
                <h3>Role-based access</h3>
                <p>
                  This screen demonstrates the server-side RBAC model using the authenticated user role.
                </p>
              </article>
              <article className="info-card">
                <h3>Session status</h3>
                <p>JWT token issued successfully and protected endpoints can now be guarded by role.</p>
              </article>
            </div>
          ) : null}

          {route === 'projects' ? (
            <RoleGuard allowedRoles={['student', 'supervisor', 'coordinator']} userRole={user.role}>
              <div className="card-grid">
                <article className="info-card">
                  <h3>Project workspace</h3>
                  <p>Students can review proposals, supervisors can follow assigned work, and coordinators can manage the lifecycle.</p>
                </article>
              </div>
            </RoleGuard>
          ) : null}

          {route === 'review' ? (
            <RoleGuard allowedRoles={['coordinator', 'supervisor']} userRole={user.role}>
              <div className="card-grid">
                <article className="info-card">
                  <h3>Review queue</h3>
                  <p>Coordinator approvals and supervisor feedback appear here once the workflow is active.</p>
                </article>
              </div>
            </RoleGuard>
          ) : null}

          {route === 'evaluation' ? (
            <RoleGuard allowedRoles={['examiner']} userRole={user.role}>
              <div className="card-grid">
                <article className="info-card">
                  <h3>Assessment panel</h3>
                  <p>Examiners are allowed to evaluate final projects and record defense scores.</p>
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
