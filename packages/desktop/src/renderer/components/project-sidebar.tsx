import type { ProjectSummary } from '../../shared/manta-api';

interface ProjectSidebarProps {
  projects: ProjectSummary[];
  selectedProjectRoot: string | null;
  onSelectProject: (projectRoot: string) => void;
}

export function ProjectSidebar({
  projects,
  selectedProjectRoot,
  onSelectProject,
}: ProjectSidebarProps) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="px-4 py-3 text-sm font-semibold tracking-wide text-zinc-100">🐟 Manta</div>
      <div className="px-4 pb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
        Projects
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {projects.length === 0 && (
          <p className="px-2 py-1 text-xs text-zinc-500">
            No projects yet. Run `manta init` in a folder.
          </p>
        )}
        {projects.map((project) => {
          const isSelected = project.projectRoot === selectedProjectRoot;
          return (
            <button
              key={project.projectId}
              disabled={!project.available}
              onClick={() => onSelectProject(project.projectRoot)}
              title={project.projectRoot}
              className={`block w-full rounded px-2 py-1.5 text-left text-sm ${
                isSelected
                  ? 'bg-zinc-800 text-zinc-100'
                  : project.available
                    ? 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                    : 'cursor-not-allowed text-zinc-600 line-through'
              }`}
            >
              {project.name}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
