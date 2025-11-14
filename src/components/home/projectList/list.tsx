import { ReactNode, useMemo, useState } from "react"
import style from '../../../styles/components/home/projectList/list.module.css'
import { useWorkspace } from "../../../core/workspaceContext"
import { useFsAutoReload } from "../../../core/useFsReload"
import ProjectCard from "./project"
import { Folder } from "./folder"

type ListType = 'all' | 'folders' | 'projects'

type ListTabProps = {
  title?: string;
  icon?: ReactNode;
  type: ListType;
  onSelect: (type: ListType) => void;
  isActive: boolean;
};

export function toAlpha(hex: string, alpha: number) {
  if (!hex) return ''
  let h = hex.replace('#','')
  if (h.length === 3) h = h.split('').map(c=>c+c).join('')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0,2),16)
  const g = parseInt(h.slice(2,4),16)
  const b = parseInt(h.slice(4,6),16)
  return `rgba(${r},${g},${b},${alpha})`
}

const ListTab = ({ title, icon, type, onSelect, isActive }: ListTabProps) => {
  return (
    <button className={`${style.tab} ${isActive ? style.tabActive : ''}`} onClick={() => onSelect(type)} type="button" aria-selected={isActive} role="tab">
      {icon ?? (title && <h3>{title}</h3>)}
    </button>
  )
}

export const ProjectList = () => {
  const [listCurrentType, setListCurrentType] = useState<ListType>("all");
  const [rows, setRows] = useState<number>(5)
  const { tree, loading, reindex } = useWorkspace()
  useFsAutoReload()

  setRows(5)
  const projectsMap = useMemo(() => {
    const m: Record<string, any> = {}
    if (!tree) return m
    for (const p of tree.projects) m[p.id] = p
    return m
  }, [tree])

  const sortedProjects = useMemo(() => {
    if (!tree) return []
    return [...tree.projects].sort((a, b) => (b.lastModifiedMs ?? 0) - (a.lastModifiedMs ?? 0))
  }, [tree])

  const sortedRootProjectIds = useMemo(() => {
    if (!tree) return []
    return [...tree.rootProjects].sort((a, b) => {
      const pa = projectsMap[a]?.lastModifiedMs ?? 0
      const pb = projectsMap[b]?.lastModifiedMs ?? 0
      return pb - pa
    })
  }, [tree, projectsMap])

  return (
    <div className={style.container} style={{ ['--rows' as any]: rows }}>
      <div className={style.listHead}>
        <div className={style.tabs}>
          <ListTab title="All" type="all" icon={
            <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.143 4H4.857A.857.857 0 0 0 4 4.857v4.286c0 .473.384.857.857.857h4.286A.857.857 0 0 0 10 9.143V4.857A.857.857 0 0 0 9.143 4Zm10 0h-4.286a.857.857 0 0 0-.857.857v4.286c0 .473.384.857.857.857h4.286A.857.857 0 0 0 20 9.143V4.857A.857.857 0 0 0 19.143 4Zm-10 10H4.857a.857.857 0 0 0-.857.857v4.286c0 .473.384.857.857.857h4.286a.857.857 0 0 0 .857-.857v-4.286A.857.857 0 0 0 9.143 14Zm10 0h-4.286a.857.857 0 0 0-.857.857v4.286c0 .473.384.857.857.857h4.286a.857.857 0 0 0 .857-.857v-4.286a.857.857 0 0 0-.857-.857Z"/>
            </svg>
          } onSelect={setListCurrentType} isActive={listCurrentType === 'all'}/>
          <ListTab title="Folders" icon={
            <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 19V6a1 1 0 0 1 1-1h4.032a1 1 0 0 1 .768.36l1.9 2.28a1 1 0 0 0 .768.36H16a1 1 0 0 1 1 1v1M3 19l3-8h15l-3 8H3Z"/>
            </svg>
          } type="folders" onSelect={setListCurrentType} isActive={listCurrentType === 'folders'}/>
          <ListTab title="Projects" icon={
            <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinejoin="round" strokeWidth="2" d="M10 3v4a1 1 0 0 1-1 1H5m14-4v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z"/>
            </svg>
          } type="projects" onSelect={setListCurrentType} isActive={listCurrentType === 'projects'}/>
        </div>
        <div className={style.actions}>
          <div className={style.title}>
            {listCurrentType.toUpperCase()}
          </div>
          <button className={style.refresh} onClick={() => reindex()} disabled={loading}>
            <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4"/>
            </svg>
          </button>
        </div>
      </div>

      <div className={style.listBody}>
        {!loading && !tree && (
          <div className={style.empty}>No workspace selected</div>
        )}
        {loading && <div className={style.empty}>Loading...</div>}

        {!loading && tree && listCurrentType === "all" && (
          (tree.physicalFolders.length === 0 && tree.virtualFolders.length === 0 && sortedRootProjectIds.length === 0) ? (
            <div className={style.empty}>There are no projects or folders!</div>
          ) : (
            <>
              {tree.physicalFolders.map(f => {
                const sortedIds = [...f.projectIds].sort((a, b) => ((projectsMap[b]?.lastModifiedMs ?? 0) - (projectsMap[a]?.lastModifiedMs ?? 0)))
                return <Folder key={f.id} id={f.id} type="physical" name={f.name} projectIds={sortedIds} projectMap={projectsMap} onChanged={reindex} color={f.color ?? undefined} />
              })}
              {tree.virtualFolders.map(v => {
                const sortedIds = [...v.projectIds].sort((a, b) => ((projectsMap[b]?.lastModifiedMs ?? 0) - (projectsMap[a]?.lastModifiedMs ?? 0)))
                return <Folder key={v.id} id={v.id} type="virtual" name={v.name} projectIds={sortedIds} projectMap={projectsMap} onChanged={reindex} color={v.color ?? undefined} />
              })}
              {sortedRootProjectIds.map(pid => {
                const p = projectsMap[pid]
                if (!p) return null
                const ext = p.kind === 'rpad' ? '' : (p.ext === 'docx' ? 'doc' : (p.ext || p.kind)) as any
                const date = new Intl.DateTimeFormat(undefined,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(p.lastModifiedMs))
                return <ProjectCard key={p.id} name={p.title || p.name} date={date} path={p.path} ext={ext} onDelete={reindex} onRename={reindex} />
              })}
            </>
          )
        )}

        {!loading && tree && listCurrentType === "folders" && (
          (tree.physicalFolders.length <= 0 && tree.virtualFolders.length <= 0) ? (
            <div className={style.empty}>There are no folders!</div>
          ) : (
            <>
              {tree.physicalFolders.map(f => {
                const sortedIds = [...f.projectIds].sort((a, b) => ((projectsMap[b]?.lastModifiedMs ?? 0) - (projectsMap[a]?.lastModifiedMs ?? 0)))
                return <Folder key={f.id} id={f.id} type="physical" name={f.name} projectIds={sortedIds} projectMap={projectsMap} onChanged={reindex} color={f.color ?? undefined} />
              })}
              {tree.virtualFolders.map(v => {
                const sortedIds = [...v.projectIds].sort((a, b) => ((projectsMap[b]?.lastModifiedMs ?? 0) - (projectsMap[a]?.lastModifiedMs ?? 0)))
                return <Folder key={v.id} id={v.id} type="virtual" name={v.name} projectIds={sortedIds} projectMap={projectsMap} onChanged={reindex} color={v.color ?? undefined} />
              })}
            </>
          )
        )}

        {!loading && tree && listCurrentType === "projects" && (
          (sortedProjects.length <= 0) ? (
            <div className={style.empty}>There are no projects!</div>
          ) : (
            <>
              {sortedProjects.map(p => {
                const ext = p.kind === 'rpad' ? '' : (p.ext === 'docx' ? 'doc' : (p.ext || p.kind)) as any
                const date = new Intl.DateTimeFormat(undefined,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(p.lastModifiedMs))
                return <ProjectCard key={p.id} name={p.title || p.name} date={date} path={p.path} ext={ext} onDelete={reindex} onRename={reindex} />
              })}
            </>
          )
        )}
      </div>
    </div>
  )
}
