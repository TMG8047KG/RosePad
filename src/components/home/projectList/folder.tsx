import { useMemo, useState } from 'react'
import ProjectCard from './project'
import style from '../../../styles/components/home/projectList/folder.module.css'
import { Project, setPhysicalFolderColor, renamePhysicalFolder, deletePhysicalFolder } from '../../../core/db';
import { Menu } from '@tauri-apps/api/menu';
import MultiModal from '../../modal'
import ColorPalette from '../../colorPalette'
import { readableTextColor, withAlpha } from '../../../utils/color'
import { useToast } from '../../../core/toast'

export function Folder({
  id,
  name,
  projectIds,
  projectMap,
  onChanged,
  color,
  collapsed = false,
  onToggle,
  selectionMode = false,
  selectedPaths = [],
  onToggleSelect,
}: {
  id:string;
  name:string;
  projectIds:string[];
  projectMap:Record<string,Project>;
  onChanged:()=>void;
  color?:string|null;
  collapsed?: boolean;
  onToggle?: () => void;
  selectionMode?: boolean;
  selectedPaths?: string[];
  onToggleSelect?: (path: string) => void;
}) {
  const ids = projectIds;
  const [isRenameModalOpen, setIsRenameOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteOpen] = useState(false)
  const [isColorModalOpen, setIsColorOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string>(color ?? '#aabbcc')
  const pushToast = useToast()

  const projectOptions = useMemo(() => Menu.new({
    id: `folderOptions_${id}`,
    items: [
      { id: `physical:${id}:rename`, text: "Rename", action: () => { setIsRenameOpen(true) }},
      { id: `physical:${id}:color`, text: "Change color", action: () => { setSelectedColor(color ?? '#aabbcc'); setIsColorOpen(true) }},
      { id: `physical:${id}:delete`, text: "Delete", action: () => { setIsDeleteOpen(true) }},
    ],
  }), [color, id])

  const handleOptionsMenu = async (event: { stopPropagation: () => void }) => {
    event.stopPropagation()
    const menu = await projectOptions
    menu.popup()
  }

  const toggleList = () => onToggle?.()

  const handleRename = async (newName: string) => {
    if (!newName || newName === name) { setIsRenameOpen(false); return }
    try {
      await renamePhysicalFolder(id, newName)
      pushToast({ message: `Renamed folder to ${newName}`, kind: "success" })
      onChanged()
    } catch (err) {
      pushToast({ message: `Rename failed: ${err}`, kind: "error" })
    } finally {
      setIsRenameOpen(false)
    }
  }

  const handleDeletion = async () => {
    try {
      await deletePhysicalFolder(id)
      pushToast({ message: `Deleted folder ${name}`, kind: "info" })
      onChanged()
    } catch (err) {
      pushToast({ message: `Delete failed: ${err}`, kind: "error" })
    } finally {
      setIsDeleteOpen(false)
    }
  }

  const applyColor = async () => {
    if (!selectedColor) {
      // clear color
      await setPhysicalFolderColor(id, null)
    } else {
      await setPhysicalFolderColor(id, selectedColor) 
    }
    pushToast({ message: 'Folder color updated', kind: "success" })
    setIsColorOpen(false)
    onChanged()
  }

  const bg = color ? withAlpha(color, .9) : undefined
  const titleColor = color ? readableTextColor(color) : undefined

  return (
    <>
      <MultiModal type='renameProject' isOpen={isRenameModalOpen} onClose={() => setIsRenameOpen(false)} onSubmit={handleRename} title={'New folder name'} buttonLabel='Rename' placeholder='New folder name' initialName={name} />
      <MultiModal type='delete' isOpen={isDeleteModalOpen} onClose={() => setIsDeleteOpen(false)} onSubmit={handleDeletion} title={'Warning'} declineButtonLabel='Cancel' acceptButtonLabel='Delete' message={`Are you sure you want to delete this folder!?`} name={(<>Folder Name: <span>{name}</span></>)}/>
      <MultiModal type='custom' isOpen={isColorModalOpen} onClose={() => setIsColorOpen(false)} title={'Folder color'} primaryAction={{ label: 'Apply', onClick: applyColor }}>
        <div className={style.centerRow}>
          <ColorPalette value={selectedColor} onChange={setSelectedColor} renderAs="panel" />
        </div>
      </MultiModal>
      <div className={style.container} data-type="physical">
        <div className={style.head} style={(bg || titleColor) ? ({ background: bg, ['--project-title' as any]: titleColor } as any) : undefined}>
          <h3>{name}</h3>
          <div className={style.right}>
            <button className={style.options} onClick={handleOptionsMenu}>
              <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeWidth="4" d="M12 6h.01M12 12h.01M12 18h.01" />
              </svg>
            </button>
            <button className={style.index} style={ids.length <= 0 ? { display: 'none' } : undefined} onClick={toggleList} aria-expanded={!collapsed}>
              <svg style={collapsed ? undefined : { transform: 'rotate(-90deg)' }} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m15 19-7-7 7-7"/>
              </svg>
            </button>
          </div>
        </div>
        <div className={style.body} style={collapsed ? { display: 'none' } : undefined}>
          {ids.map(id => {
            const p = projectMap[id]
            if (!p) return null
            const date = new Intl.DateTimeFormat(undefined,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(p.lastModifiedMs))
            return (
              <ProjectCard
                key={p.id}
                name={p.title || p.name}
                date={date}
                path={p.path}
                ext={p.ext ?? null}
                kind={p.kind}
                onDelete={() => onChanged()}
                onRename={() => onChanged()}
                color={color || undefined}
                selectionMode={selectionMode}
                selected={selectedPaths.includes(p.path)}
                onToggleSelect={onToggleSelect}
              />
            )
          })}
        </div>
      </div>
    </>
  )
}
