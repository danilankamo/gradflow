import { useState } from 'react';

const emptySupervisor = {
  name: '',
  email: '',
  password: '',
  department: '',
  bio: '',
  skills: '',
};

function SupervisorManagement({
  supervisors,
  projects,
  busy,
  onSave,
  onDelete,
  onAssign,
  onRefresh,
}) {
  const [form, setForm] = useState(emptySupervisor);
  const [editingId, setEditingId] = useState('');
  const [assignments, setAssignments] = useState({});

  const editSupervisor = (supervisor) => {
    setEditingId(supervisor._id);
    setForm({
      name: supervisor.name || '',
      email: supervisor.email || '',
      password: '',
      department: supervisor.department || '',
      bio: supervisor.bio || '',
      skills: Array.isArray(supervisor.skills) ? supervisor.skills.join(', ') : '',
    });
  };

  const submitSupervisor = async (event) => {
    event.preventDefault();
    const saved = await onSave({
      ...form,
      skills: form.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
    }, editingId);
    if (saved) {
      setForm(emptySupervisor);
      setEditingId('');
    }
  };

  return (
    <section className="subsection">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Coordinator workspace</p>
          <h2>Supervisor management</h2>
        </div>
        <button className="button button-quiet" type="button" onClick={onRefresh} disabled={busy}>
          Refresh
        </button>
      </div>

      <div className="supervisor-layout">
        <section className="management-card">
          <h3>{editingId ? 'Edit supervisor' : 'Add supervisor'}</h3>
          <form className="form-grid supervisor-form" onSubmit={submitSupervisor}>
            <label>
              Full name
              <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label>
              Email
              <input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label>
              {editingId ? 'New password (optional)' : 'Initial password'}
              <input
                type="password"
                minLength="8"
                required={!editingId}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                autoComplete="new-password"
              />
            </label>
            <label>
              Department
              <input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
            </label>
            <label>
              Skills (comma-separated)
              <input value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} />
            </label>
            <label>
              Bio
              <textarea rows="3" value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} />
            </label>
            <div className="action-row">
              <button className="button button-primary" type="submit" disabled={busy}>
                {editingId ? 'Save changes' : 'Create supervisor'}
              </button>
              {editingId && (
                <button
                  className="button button-quiet"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditingId('');
                    setForm(emptySupervisor);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="management-card">
          <div className="section-heading supervisor-section-heading">
            <h3>Supervisors</h3>
            <span>{supervisors.length}</span>
          </div>
          {!supervisors.length ? (
            <p className="empty-state">No supervisors have been added yet.</p>
          ) : (
            <ul className="supervisor-list">
              {supervisors.map((supervisor) => (
                <li className="supervisor-card" key={supervisor._id}>
                  <div>
                    <strong>{supervisor.name}</strong>
                    <span>{supervisor.email}</span>
                    <span>{supervisor.department || 'Department not set'}</span>
                    {supervisor.skills?.length > 0 && (
                      <small>{supervisor.skills.join(', ')}</small>
                    )}
                  </div>
                  <div className="action-row">
                    <button className="button button-quiet" type="button" onClick={() => editSupervisor(supervisor)} disabled={busy}>
                      Edit
                    </button>
                    <button
                      className="button button-danger"
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete ${supervisor.name}'s account?`)) {
                          onDelete(supervisor._id);
                        }
                      }}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="management-card assignment-card">
        <div className="section-heading supervisor-section-heading">
          <div>
            <p className="eyebrow">Approved proposals</p>
            <h3>Assign supervisors</h3>
          </div>
          <span>{projects.length}</span>
        </div>
        {!projects.length ? (
          <p className="empty-state">No approved projects need assignment or reassignment.</p>
        ) : (
          <div className="assignment-list">
            {projects.map((project) => (
              <article className="assignment-item" key={project._id}>
                <div>
                  <strong>{project.title}</strong>
                  <span>{project.students?.map((student) => student.name).join(', ') || 'Student'}</span>
                  <span>
                    {project.supervisorId
                      ? `Currently assigned to ${project.supervisorId.name}`
                      : 'Approved · Unassigned'}
                  </span>
                </div>
                <div className="assignment-controls">
                  <label>
                    <span className="visually-hidden">Supervisor for {project.title}</span>
                    <select
                      value={assignments[project._id] || ''}
                      onChange={(event) => setAssignments({
                        ...assignments,
                        [project._id]: event.target.value,
                      })}
                      disabled={!supervisors.length || busy}
                    >
                      <option value="">
                        {project.supervisorId ? 'Select a different supervisor' : 'Select supervisor'}
                      </option>
                      {supervisors
                        .filter((supervisor) => supervisor._id !== project.supervisorId?._id)
                        .map((supervisor) => (
                          <option key={supervisor._id} value={supervisor._id}>
                            {supervisor.name} {supervisor.department ? `· ${supervisor.department}` : ''}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button
                    className="button button-primary"
                    type="button"
                    disabled={!assignments[project._id] || busy}
                    onClick={async () => {
                      const assigned = await onAssign(
                        project,
                        assignments[project._id],
                        project.supervisorId?._id
                      );
                      if (assigned) {
                        setAssignments((current) => ({
                          ...current,
                          [project._id]: '',
                        }));
                      }
                    }}
                  >
                    {project.supervisorId ? 'Reassign' : 'Assign'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export function SupervisorWorkspace({ projects, selectedProjectId, onSelect, onRefresh }) {
  return (
    <section className="subsection">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Supervisor workspace</p>
          <h2>Assigned projects</h2>
        </div>
        <button className="button button-quiet" type="button" onClick={onRefresh}>
          Refresh
        </button>
      </div>
      {!projects.length ? (
        <div className="empty-detail"><h3>No projects assigned</h3><p>Projects assigned by a coordinator will appear here.</p></div>
      ) : (
        <div className="assigned-project-list">
          {projects.map((project) => (
            <button
              type="button"
              className={`assigned-project-card ${selectedProjectId === project._id ? 'active' : ''}`}
              key={project._id}
              onClick={() => onSelect && onSelect(project)}
            >
              <div className="detail-heading">
                <div>
                  <p className="eyebrow">{project.category || 'Graduation project'}</p>
                  <h3>{project.title}</h3>
                </div>
                <span className="status-badge status-in-progress">{project.status}</span>
              </div>
              <p>{project.abstract || 'No abstract provided.'}</p>
              <div className="student-byline">
                <strong>{project.students?.map((student) => student.name).join(', ') || 'Student'}</strong>
                {project.students?.map((student) => (
                  <span key={student._id}>{student.email}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default SupervisorManagement;
