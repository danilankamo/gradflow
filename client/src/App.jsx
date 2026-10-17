import { useCallback, useEffect, useMemo, useState } from 'react';
import SupervisorManagement, { SupervisorWorkspace } from './SupervisorManagement.jsx';
import { StudentMilestones, SupervisorSubmissions } from './DeliverableWorkflow.jsx';
import {
  CoordinatorDefenseScheduler,
  StudentDefenseCard,
  ExaminerWorkspace,
} from './DefenseScheduling.jsx';

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

const AUTH_ROLES = [
  {
    id: 'student',
    label: 'Student',
    sub: 'Proposer/Lead',
    icon: 'school',
    note: 'Student Candidate mode: submit abstracts, track advisor sign-offs, and view defense viva details.',
  },
  {
    id: 'supervisor',
    label: 'Supervisor',
    sub: 'Advisory/Sign-off',
    icon: 'psychology',
    note: 'Supervisor / Faculty Advisory mode: review specifications, manage milestones, evaluate deliverables, and monitor defenses.',
  },
  {
    id: 'coordinator',
    label: 'Coordinator',
    sub: 'Department Head',
    icon: 'admin_panel_settings',
    note: 'Department Coordinator mode: review proposals, assign supervisors, and schedule oral defense panels with conflict detection.',
  },
  {
    id: 'examiner',
    label: 'Examiner',
    sub: 'Viva Panel',
    icon: 'balance',
    note: 'Defence Examination Panel mode: inspect assigned graduation projects, attend oral vivas, and record evaluations.',
  },
];

const MILESTONE_STEPS = [
  { icon: 'check_circle', fill: true, label: '1. Proposal', state: 'Approved', wrap: 'bg-surface-container-high', iconTone: 'text-on-tertiary-container', stateTone: 'text-on-surface-variant' },
  { icon: 'edit_document', fill: true, label: '2. Design', state: 'In Review', wrap: 'bg-surface-container', iconTone: 'text-secondary', stateTone: 'text-secondary' },
  { icon: 'verified', fill: false, label: '3. Mid-Eval', state: 'Week 14', wrap: 'bg-surface-container-low opacity-80', iconTone: 'text-on-surface-variant', stateTone: 'text-on-surface-variant' },
  { icon: 'gavel', fill: false, label: '4. Defence', state: 'Viva Panel', wrap: 'bg-surface-container-low opacity-80', iconTone: 'text-on-surface-variant', stateTone: 'text-on-surface-variant' },
];

const authField = 'w-full rounded-lg border-0 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface shadow-sm transition-shadow outline-none placeholder:text-on-surface-variant focus:border-0 focus:ring-0 focus:shadow-md disabled:cursor-not-allowed disabled:opacity-60';
const authFieldWithIcon = 'w-full rounded-lg border-0 bg-surface-container-lowest py-2.5 pl-10 pr-3 text-sm text-on-surface shadow-sm transition-shadow outline-none placeholder:text-on-surface-variant focus:border-0 focus:ring-0 focus:shadow-md';
const authPasswordField = 'w-full rounded-lg border-0 bg-surface-container-lowest py-2.5 pl-10 pr-10 text-sm text-on-surface shadow-sm transition-shadow outline-none placeholder:text-on-surface-variant focus:border-0 focus:ring-0 focus:shadow-md';

function AuthScreen({ authMode, setAuthMode, authForm, setAuthForm, authRole, setAuthRole, busy, error, onSubmit }) {
  const [showPassword, setShowPassword] = useState(false);
  const update = (field) => (event) => setAuthForm({ ...authForm, [field]: event.target.value });
  const activeRole = AUTH_ROLES.find((role) => role.id === authRole) || AUTH_ROLES[0];

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-5 py-2">
      <header className="flex flex-col items-center text-center">
        <div className="relative mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-surface-container shadow-sm">
          <span className="brand-mark h-14 w-14 rounded-full text-2xl">G</span>
          <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-surface-container-lowest shadow-sm">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-on-tertiary-container" />
          </span>
        </div>
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-0.5 text-xs font-medium text-on-surface-variant shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-on-tertiary-container" />
          Cycle 2024–2025 • Active Milestones
        </div>
        <h1 className="font-display text-3xl font-extrabold text-on-surface">GradFlow</h1>
        <p className="mt-1 max-w-xs text-sm text-on-surface-variant">Final Year Project &amp; Defence Management Portal</p>
      </header>

      <section className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">Capstoning Milestone Track</span>
          <span className="text-xs font-semibold text-secondary">Cohort 2025</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {MILESTONE_STEPS.map((step) => (
            <div key={step.label} className={`flex flex-col items-center rounded-lg p-1.5 text-center ${step.wrap}`}>
              <Icon name={step.icon} size={18} fill={step.fill} className={step.iconTone} />
              <span className="mt-1 text-[10px] leading-tight font-semibold text-on-surface">{step.label}</span>
              <span className={`text-[9px] ${step.stateTone}`}>{step.state}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center rounded-full bg-surface-container p-1 shadow-inner">
        <button
          type="button"
          onClick={() => setAuthMode('login')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${authMode === 'login' ? 'bg-primary-container text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setAuthMode('register')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${authMode === 'register' ? 'bg-primary-container text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Register Team
        </button>
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-on-surface-variant">Academic Role</span>
          <span className="flex items-center gap-0.5 text-xs font-semibold text-secondary">
            <Icon name="shield_person" size={14} /> Verified Portal
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AUTH_ROLES.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => setAuthRole(role.id)}
              className={`flex flex-col items-center justify-center rounded-xl p-3 text-center shadow-sm transition-all duration-150 ${authRole === role.id ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant'}`}
            >
              <Icon name={role.icon} size={22} className="mb-1" />
              <span className="text-xs leading-tight font-semibold">{role.label}</span>
              <span className="mt-0.5 text-[9px] opacity-80">{role.sub}</span>
            </button>
          ))}
        </div>
        <div className="mt-1 flex items-start gap-2 rounded-lg bg-surface-container-low p-3 shadow-sm">
          <Icon name="info" size={18} className="mt-0.5 shrink-0 text-secondary" />
          <p className="text-xs text-on-surface-variant">{activeRole.note}</p>
        </div>
      </section>

      {authMode === 'login' ? (
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <div className="flex flex-col gap-1">
            <label htmlFor="signin-email" className="flex items-center justify-between text-on-surface">
              <span>Institutional Identifier</span>
              <span className="text-xs font-normal text-on-surface-variant">Email</span>
            </label>
            <div className="relative flex items-center">
              <Icon name="badge" size={20} className="absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant" />
              <input
                id="signin-email"
                type="email"
                required
                autoComplete="email"
                className={authFieldWithIcon}
                placeholder="e.g. j.harvard@university.edu"
                value={authForm.email}
                onChange={update('email')}
              />
            </div>
            <p className="pl-1 text-[11px] text-on-surface-variant">Use your official university email address.</p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="signin-password" className="text-on-surface">Access Key / Password</label>
            <div className="relative flex items-center">
              <Icon name="lock" size={20} className="absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant" />
              <input
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="current-password"
                className={authPasswordField}
                placeholder="••••••••••••"
                value={authForm.password}
                onChange={update('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-on-surface">
              <input type="checkbox" defaultChecked className="mt-0 h-4 w-4 rounded bg-surface-container-lowest text-secondary" />
              <span className="text-sm">Remember this workstation</span>
            </label>
            <span className="flex items-center gap-1 text-xs text-on-surface-variant">
              <Icon name="lock_clock" size={14} /> 14d session
            </span>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-4 py-3 text-sm font-semibold text-on-primary shadow-md transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{busy ? 'Please wait…' : 'Enter Portal'}</span>
            {!busy && <Icon name="arrow_forward" size={18} />}
          </button>
        </form>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <div className="flex items-start gap-2 rounded-lg bg-surface-container-high p-3 shadow-sm">
            <Icon name="group_add" size={20} className="mt-0.5 shrink-0 text-secondary" />
            <div>
              <h4 className="text-sm font-semibold text-on-surface">FYP Cohort Candidate Onboarding</h4>
              <p className="text-xs text-on-surface-variant">Register your project roster, nominate a capstone advisor &amp; claim your milestone workspace.</p>
            </div>
          </div>

          {authRole !== 'student' && (
            <p className="rounded-lg bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
              Staff and committee access is provisioned by a coordinator. New registrations always start with the Student role.
            </p>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="reg-name" className="text-on-surface">Candidate / Team Lead Name</label>
            <div className="relative flex items-center">
              <Icon name="person" size={20} className="absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant" />
              <input
                id="reg-name"
                type="text"
                required
                className={authFieldWithIcon}
                placeholder="e.g. Alex Morgan"
                value={authForm.name}
                onChange={update('name')}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="reg-email" className="text-on-surface">Official University Email</label>
            <div className="relative flex items-center">
              <Icon name="alternate_email" size={20} className="absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant" />
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                className={authFieldWithIcon}
                placeholder="student@university.edu"
                value={authForm.email}
                onChange={update('email')}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="reg-password" className="text-on-surface">Access Key / Password</label>
            <div className="relative flex items-center">
              <Icon name="lock" size={20} className="absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant" />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                className={authPasswordField}
                placeholder="At least 8 characters"
                value={authForm.password}
                onChange={update('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
              </button>
            </div>
            <p className="pl-1 text-[11px] text-on-surface-variant">Minimum 8 characters.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="reg-student-id" className="text-on-surface">Matric / Roll No.</label>
              <input
                id="reg-student-id"
                type="text"
                className={authField}
                placeholder="CS-2021-042"
                value={authForm.studentId}
                onChange={update('studentId')}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="reg-department" className="text-on-surface">Department</label>
              <input
                id="reg-department"
                type="text"
                className={authField}
                placeholder="e.g. Computer Science"
                value={authForm.department}
                onChange={update('department')}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-4 py-3 text-sm font-semibold text-on-primary shadow-md transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{busy ? 'Please wait…' : 'Create Account'}</span>
            {!busy && <Icon name="verified_user" size={18} />}
          </button>
        </form>
      )}

      <footer className="flex flex-col items-center gap-2 pt-1 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-1 text-xs font-medium text-on-surface-variant shadow-sm">
          <Icon name="verified" size={15} className="text-on-tertiary-container" />
          Academic Integrity Compliant
        </div>
        <p className="text-[11px] text-on-surface-variant opacity-75">Faculty of Computing &amp; Engineering Science • Rev 4.8.2</p>
      </footer>
    </section>
  );
}

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [authRole, setAuthRole] = useState('student');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', department: '', studentId: '' });
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('gradflow-token') || '');
  const [route, setRoute] = useState('overview');
  const [projects, setProjects] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [assignmentProjects, setAssignmentProjects] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [defenses, setDefenses] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [schedulableProjects, setSchedulableProjects] = useState([]);
  const [examiners, setExaminers] = useState([]);
  const [workspaceProjectId, setWorkspaceProjectId] = useState('');
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

  const requestMultipart = useCallback(async (path, formData) => {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || data.error || 'The request could not be completed');
    }
    return data;
  }, [token]);

  const loadProjectDeliverables = useCallback(async (projectId) => {
    if (!projectId) {
      setMilestones([]);
      setSubmissions([]);
      return;
    }
    const [milestoneData, submissionData] = await Promise.all([
      request(`/api/projects/${projectId}/milestones`, apiOptions()),
      request(`/api/projects/${projectId}/submissions`, apiOptions()),
    ]);
    setMilestones(milestoneData.data);
    setSubmissions(submissionData.data);
  }, [apiOptions]);

  const loadWorkspace = useCallback(async () => {
    if (!user || !token) return;
    setError('');
    try {
      if (user.role === 'coordinator') {
        const [
          reviewData,
          dashboardData,
          supervisorData,
          assignmentData,
          defenseData,
          schedulableData,
          examinerData,
        ] = await Promise.all([
          request('/api/projects/coordinator/review', apiOptions()),
          request('/api/projects/coordinator/dashboard', apiOptions()),
          request('/api/users/supervisors', apiOptions()),
          request('/api/projects/coordinator/assignments', apiOptions()),
          request('/api/defenses', apiOptions()).catch(() => ({ data: [] })),
          request('/api/defenses/schedulable-projects', apiOptions()).catch(() => ({ data: [] })),
          request('/api/defenses/examiners', apiOptions()).catch(() => ({ data: [] })),
        ]);
        setProjects(reviewData.data);
        setDashboard(dashboardData.data);
        setSupervisors(supervisorData.data);
        setAssignmentProjects(assignmentData.data);
        setDefenses(defenseData.data || []);
        setSchedulableProjects(schedulableData.data || []);
        setExaminers(examinerData.data || []);
        setSelectedProject((current) => {
          const retained = reviewData.data.find((project) => project._id === current?._id);
          return retained || reviewData.data[0] || null;
        });
      } else if (user.role === 'student') {
        const [result, defenseData] = await Promise.all([
          request('/api/projects/my', apiOptions()),
          request('/api/defenses', apiOptions()).catch(() => ({ data: [] })),
        ]);
        setProjects(result.data);
        setDefenses(defenseData.data || []);
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
        if (current) {
          const [milestoneData, submissionData, evalData] = await Promise.all([
            request(`/api/projects/${current._id}/milestones`, apiOptions()),
            request(`/api/projects/${current._id}/submissions`, apiOptions()),
            request(`/api/projects/${current._id}/evaluations`, apiOptions()).catch(() => ({ data: [] })),
          ]);
          setMilestones(milestoneData.data);
          setSubmissions(submissionData.data);
          setEvaluations(evalData.data || []);
        } else {
          setMilestones([]);
          setSubmissions([]);
          setEvaluations([]);
        }
      } else if (user.role === 'supervisor') {
        const [result, defenseData] = await Promise.all([
          request('/api/projects/supervisor/assigned', apiOptions()),
          request('/api/defenses', apiOptions()).catch(() => ({ data: [] })),
        ]);
        setProjects(result.data);
        setDefenses(defenseData.data || []);
      } else if (user.role === 'examiner') {
        const defenseData = await request('/api/defenses', apiOptions()).catch(() => ({ data: [] }));
        setDefenses(defenseData.data || []);
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
      return [
        ...shared,
        { key: 'proposal', label: 'My Proposal' },
        { key: 'milestones', label: 'Milestones' },
        { key: 'defense', label: 'Defense Schedule' },
      ];
    }
    if (user.role === 'coordinator') {
      return [
        ...shared,
        { key: 'review', label: 'Proposal Review' },
        { key: 'supervisors', label: 'Supervisors' },
        { key: 'defenses', label: 'Defense Scheduling' },
      ];
    }
    if (user.role === 'supervisor') {
      return [
        ...shared,
        { key: 'workspace', label: 'Projects & Milestones' },
        { key: 'defenses', label: 'Defense Schedules' },
      ];
    }
    if (user.role === 'examiner') {
      return [
        ...shared,
        { key: 'vivas', label: 'Assigned Defenses' },
      ];
    }
    return shared;
  }, [user]);

  const handleAuth = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const endpoint = authMode === 'login' ? 'login' : 'register';
      const payload = authMode === 'register'
        ? { ...authForm, role: authRole }
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

  const handleSelectProject = (project) => {
    setWorkspaceProjectId(project._id);
    setBusy(true);
    setError('');
    loadProjectDeliverables(project._id)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setBusy(false));
  };

  const handleSubmitDeliverable = async (milestoneId, { file, githubUrl, description }) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      if (githubUrl.trim()) formData.append('githubUrl', githubUrl.trim());
      if (description.trim()) formData.append('description', description.trim());
      await requestMultipart(`/api/milestones/${milestoneId}/submissions`, formData);
      setMessage('Deliverable submitted for supervisor review.');
      await loadWorkspace();
      return true;
    } catch (submitError) {
      setError(submitError.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleReviewSubmission = async (submissionId, action, feedback) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await request(
        `/api/submissions/${submissionId}/review`,
        apiOptions('PATCH', { action, feedback })
      );
      setMessage(
        result.data.status === 'approved'
          ? 'Submission approved.'
          : 'Revision requested with feedback.'
      );
      if (user.role === 'supervisor' && workspaceProjectId) {
        await loadProjectDeliverables(workspaceProjectId);
      } else {
        await loadWorkspace();
      }
    } catch (reviewError) {
      setError(reviewError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleScheduleDefense = async (payload) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request('/api/defenses', apiOptions('POST', payload));
      setMessage('Project defense scheduled successfully.');
      await loadWorkspace();
      return true;
    } catch (schedError) {
      setError(schedError.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateDefense = async (defenseId, payload) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request(`/api/defenses/${defenseId}`, apiOptions('PUT', payload));
      setMessage('Defense schedule updated successfully.');
      await loadWorkspace();
      return true;
    } catch (updateError) {
      setError(updateError.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleCancelDefense = async (defenseId) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request(`/api/defenses/${defenseId}/cancel`, apiOptions('PATCH'));
      setMessage('Defense schedule cancelled. Project returned to Final Submission status.');
      await loadWorkspace();
      return true;
    } catch (cancelError) {
      setError(cancelError.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEvaluation = async (defenseId, payload) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await request(`/api/defenses/${defenseId}/evaluations`, apiOptions('POST', payload));
      setMessage(result.message || 'Defense evaluation recorded successfully.');
      await loadWorkspace();
      return true;
    } catch (evalError) {
      setError(evalError.message);
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
      setMilestones([]);
      setSubmissions([]);
      setDefenses([]);
      setSchedulableProjects([]);
      setExaminers([]);
      setWorkspaceProjectId('');
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
      {user && (
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">G</span>
            <div><p className="eyebrow">GradFlow</p><h1>Graduation project workspace</h1></div>
          </div>
          <div className="account">
            <span>{user.name}<small>{user.role}</small></span>
            <button className="button button-quiet" type="button" onClick={handleLogout}>Sign out</button>
          </div>
        </header>
      )}

      {user && error && <div className="alert alert-error" role="alert">{error}</div>}
      {user && message && <div className="alert alert-success" role="status">{message}</div>}

      {!user ? (
        <AuthScreen
          authMode={authMode}
          setAuthMode={setAuthMode}
          authForm={authForm}
          setAuthForm={setAuthForm}
          authRole={authRole}
          setAuthRole={setAuthRole}
          busy={busy}
          error={error}
          onSubmit={handleAuth}
        />
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

          {route === 'milestones' && user.role === 'student' && (
            <StudentMilestones
              project={projects[0]}
              milestones={milestones}
              submissions={submissions}
              busy={busy}
              onSubmit={handleSubmitDeliverable}
            />
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

          {route === 'defenses' && user.role === 'coordinator' && (
            <CoordinatorDefenseScheduler
              defenses={defenses}
              schedulableProjects={schedulableProjects}
              examiners={examiners}
              busy={busy}
              onSchedule={handleScheduleDefense}
              onUpdate={handleUpdateDefense}
              onCancel={handleCancelDefense}
              onRefresh={loadWorkspace}
            />
          )}

          {route === 'defense' && user.role === 'student' && (
            <section className="subsection space-y-5">
              <div className="page-heading">
                <div>
                  <p className="eyebrow">Candidate Portal</p>
                  <h2>Oral Defense &amp; Viva Voce</h2>
                </div>
                <button
                  className="button button-quiet"
                  type="button"
                  onClick={loadWorkspace}
                  disabled={busy}
                >
                  Refresh
                </button>
              </div>
              <StudentDefenseCard
                defense={defenses.find((d) => d.status === 'scheduled') || defenses[0]}
                projectStatus={projectStatus}
                evaluations={evaluations}
              />
            </section>
          )}

          {route === 'defenses' && user.role === 'supervisor' && (
            <section className="subsection space-y-5">
              <div className="page-heading">
                <div>
                  <p className="eyebrow">Faculty Supervisor</p>
                  <h2>Supervised Project Defenses</h2>
                </div>
                <button
                  className="button button-quiet"
                  type="button"
                  onClick={loadWorkspace}
                  disabled={busy}
                >
                  Refresh
                </button>
              </div>
              {defenses.length === 0 ? (
                <div className="empty-detail">
                  <h3>No defense schedules yet</h3>
                  <p>Defenses scheduled by the coordinator for your assigned projects will appear here.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {defenses.map((defense) => (
                    <article
                      key={defense._id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`status-badge status-${defense.status}`}>
                          {defense.status}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          {new Date(defense.date).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-base font-semibold text-slate-900">
                        {defense.projectId?.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Candidate:{' '}
                        {defense.projectId?.students?.map((s) => s.name).join(', ') || 'N/A'}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div>
                          <strong>Time:</strong> {defense.startTime} – {defense.endTime}
                        </div>
                        <div>
                          <strong>Room:</strong> {defense.room}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        <strong>Panel:</strong>{' '}
                        {defense.examinerIds?.map((e) => e.name).join(', ') || 'N/A'}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {route === 'vivas' && user.role === 'examiner' && (
            <ExaminerWorkspace
              defenses={defenses}
              user={user}
              busy={busy}
              onRefresh={loadWorkspace}
              onSaveEvaluation={handleSaveEvaluation}
            />
          )}

          {route === 'overview' && user.role === 'examiner' && (
            <ExaminerWorkspace
              defenses={defenses}
              user={user}
              busy={busy}
              onRefresh={loadWorkspace}
              onSaveEvaluation={handleSaveEvaluation}
            />
          )}

          {route === 'overview' && user.role === 'coordinator' && dashboard && (
            <div className="stats-grid">
              <StatCard label="Total projects" value={dashboard.totalProjects} />
              <StatCard label="Pending proposals" value={dashboard.pendingProposals} accent />
              <StatCard label="Approved projects" value={dashboard.projectsByStatus?.Approved || 0} />
              <StatCard
                label="Defense Scheduled"
                value={
                  dashboard.projectsByStatus?.['Defense Scheduled'] ||
                  defenses.filter((d) => d.status === 'scheduled').length
                }
              />
            </div>
          )}

          {route === 'overview' && user.role === 'student' && (
            <div className="space-y-5">
              <div className="info-card">
                <h3>Proposal status</h3>
                <p>
                  {projectStatus === 'No proposal'
                    ? 'Start by creating your graduation project proposal.'
                    : `Your proposal is ${projectStatus.toLowerCase()}.`}
                </p>
              </div>
              <StudentDefenseCard
                defense={defenses.find((d) => d.status === 'scheduled') || defenses[0]}
                projectStatus={projectStatus}
              />
            </div>
          )}

          {route === 'workspace' && (
            user.role === 'supervisor'
              ? (
                <>
                  <SupervisorWorkspace
                    projects={projects}
                    selectedProjectId={workspaceProjectId}
                    onSelect={handleSelectProject}
                    onRefresh={loadWorkspace}
                  />
                  <SupervisorSubmissions
                    project={projects.find((project) => project._id === workspaceProjectId) || null}
                    milestones={milestones}
                    submissions={submissions}
                    busy={busy}
                    onReview={handleReviewSubmission}
                    onRefresh={() => handleSelectProject({ _id: workspaceProjectId })}
                  />
                </>
              )
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
