import style from "../../styles/components/editor/editorTabs.module.css"
import { FlowerNumber } from "../../core/FlowerSVG"

export type OpenProject = { name: string; path: string }

type EditorTabsProps = {
  openProjects: OpenProject[]
  currentPath: string
  onSwitch: (project: OpenProject) => void
}

export default function EditorTabs({ openProjects, currentPath, onSwitch }: EditorTabsProps) {
  return (
    <div className={style.tabs} role="tablist" aria-label="Open projects">
      {openProjects.length === 0 ? (
        <div className={style.tabPlaceholder}>No open projects yet</div>
      ) : (
        openProjects.map(project => {
          const isActive = project.path === currentPath
          return (
            <button
              key={project.path}
              className={`${style.tab} ${isActive ? style.tabActive : ""}`}
              onClick={() => onSwitch(project)}
              role="tab"
              aria-selected={isActive}
              type="button"
            >
              <FlowerNumber number={openProjects.indexOf(project)+1} seed={8}/>
            </button>
          )
        })
      )}
    </div>
  )
}
