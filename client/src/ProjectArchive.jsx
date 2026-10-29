import { useMemo, useState } from 'react';

const formatDate = (date) => {
  if (!date) return 'Date unavailable';
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

function ProjectArchive({ projects, loading }) {
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState('all');
  const [expandedProjectId, setExpandedProjectId] = useState(null);

  const departments = useMemo(
    () => [...new Set(projects.map((project) => project.department).filter(Boolean))].sort(),
    [projects]
  );
  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return projects.filter((project) => {
      const searchableText = [
        project.title,
        project.department,
        project.supervisor?.name,
        ...(project.students || []).map((student) => student.name),
        ...(project.technologies || []),
      ].join(' ').toLowerCase();
      return (
        (!normalizedQuery || searchableText.includes(normalizedQuery)) &&
        (department === 'all' || project.department === department) &&
        (status === 'all' || project.status === status)
      );
    });
  }, [department, projects, query, status]);
  const scoredProjects = projects.filter((project) => Number.isFinite(project.score));
  const averageScore = scoredProjects.length
    ? (scoredProjects.reduce((total, project) => total + project.score, 0) / scoredProjects.length).toFixed(1)
    : '—';

  return (
    <section className="subsection space-y-5">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Completed work</p>
          <h2>Project Archive</h2>
          <p className="mt-1 text-sm text-slate-600">
            Browse completed projects and their final outcomes.
          </p>
        </div>
        <span className="status-badge status-completed">{projects.length} projects</span>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Completed projects</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{projects.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Departments represented</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{departments.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Average final score</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{averageScore}</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <label>
          Search archive
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Project, student, supervisor or technology"
          />
        </label>
        <label>
          Department
          <select value={department} onChange={(event) => setDepartment(event.target.value)}>
            <option value="all">All departments</option>
            {departments.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="Completed">Completed</option>
            <option value="Archived">Archived</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="empty-detail" role="status"><h3>Loading project archive…</h3></div>
      ) : filteredProjects.length === 0 ? (
        <div className="empty-detail">
          <h3>{projects.length ? 'No projects match these filters' : 'No completed projects yet'}</h3>
          <p>
            {projects.length
              ? 'Try another search or choose a different department or status.'
              : 'Completed projects will appear here after the examiner panel submits its final evaluations.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((project) => {
            const expanded = expandedProjectId === project._id;
            return (
              <article key={project._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="status-badge status-completed">{project.status}</span>
                      {project.department && <span className="text-xs font-medium text-slate-500">{project.department}</span>}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">{project.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {(project.students || []).map((student) => student.name).filter(Boolean).join(', ') || 'Student details unavailable'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Supervisor: {project.supervisor?.name || 'Not listed'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(project.technologies || []).map((technology) => (
                        <span key={technology} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800">
                          {technology}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-5 md:justify-end">
                    <div className="text-right">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Final score</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{project.score ?? '—'}</p>
                      <p className="mt-1 text-xs text-slate-500">Completed {formatDate(project.completionDate)}</p>
                    </div>
                    <button
                      className="button button-quiet shrink-0"
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setExpandedProjectId(expanded ? null : project._id)}
                    >
                      {expanded ? 'Hide details' : 'View details'}
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="grid gap-5 border-t border-slate-200 bg-slate-50/70 p-5 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-semibold">Project abstract</h4>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {project.abstract || 'No abstract was provided.'}
                      </p>
                      {project.defense && (
                        <p className="mt-4 text-sm text-slate-600">
                          Defense: {formatDate(project.defense.date)}
                          {project.defense.room ? ` · ${project.defense.room}` : ''}
                        </p>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">Project links</h4>
                      {project.links?.length ? (
                        <ul className="mt-2 space-y-2">
                          {project.links.map((link, index) => (
                            <li key={`${link.url}-${index}`}>
                              <a
                                className="text-sm font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-900"
                                href={link.url.startsWith('/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${link.url}` : link.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {link.label} <span className="font-normal text-slate-500">({link.type})</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">No repository or deliverable links are available.</p>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ProjectArchive;
