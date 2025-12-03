import style from "../../styles/components/editor/editorTabs.module.css"
import { FlowerNumber } from "../../core/FlowerSVG"

export type OpenProject = { name: string; path: string }

type EditorTabsProps = {
  openProjects: OpenProject[]
  currentPath: string
  onSwitch: (project: OpenProject) => void
  onAdd: () => void
}

export default function EditorTabs({ openProjects, currentPath, onSwitch, onAdd }: EditorTabsProps) {
  return (
    <div className={style.tabs} role="tablist" aria-label="Open projects">
      {openProjects.length === 0 ? (
        <div className={style.tabPlaceholder}>No open projects yet</div>
      ) : (
        openProjects.map((project, index) => {
          const isActive = project.path === currentPath
          return (
            <button
              key={project.path}
              className={`${style.tab} ${isActive ? style.tabActive : ""}`}
              onClick={() => onSwitch(project)}
              role="tab"
              aria-selected={isActive}
              title={project.name}
              type="button"
            >
              <FlowerNumber number={index + 1} seed={8}/>
            </button>
          )
        })
      )}
      <button className={`${style.tab} ${style.tabAdd}`} onClick={onAdd} type="button" aria-label="Add or remove open projects" title="Manage open projects">
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14m-7 7V5"/>
        </svg>
      </button>
    </div>
  )
}
