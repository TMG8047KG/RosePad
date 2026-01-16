import { useNavigate } from 'react-router-dom'
import style from '../../../styles/components/home/projectList/project.module.css'
import { rpc_project } from '../../../core/discord_rpc'
import { useMemo, useState } from 'react'
import { Menu } from '@tauri-apps/api/menu'
import MultiModal from '../../modal'
import { deleteProjectPath, renameProjectPath, moveProjectPath } from '../../../core/db'
import { useWorkspace } from '../../../core/workspaceContext'
import { readableTextColor, withAlpha } from '../../../utils/color'
import Select, { SelectOption } from '../../select'
import { useToast } from '../../../core/toast'

type DisplayNameInput = {
  name: string;
  kind: string;
  path: string;
  ext?: string | null;
};

export function formatProjectDisplayName({ name, kind, path, ext }: DisplayNameInput) {
  if (kind === 'rpad') return name
  const pathExt = /\.([^.\\/]+)$/.exec(path)?.[1] ?? ''
  const chosenExt = pathExt || (ext ?? '')
  const cleanExt = chosenExt.startsWith('.') ? chosenExt.slice(1) : chosenExt
  if (!cleanExt) return name
  return `${name}.${cleanExt}`
}

function Project({
  name,
  kind,
  date,
  path,
  ext,
  onDelete,
  onRename,
  color,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}: {
  name: string;
  date: string;
  kind: string;
  path: string;
  ext?: string | null;
  onDelete: () => void;
  onRename: () => void;
  color?: string;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (path: string) => void;
}) {
  const navigator = useNavigate()
  const { tree, rootPath } = useWorkspace()
  const [isRenameModalOpen, setIsRenameOpen] = useState(false)
  const [isMoveModalOpen, setIsMoveOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteOpen] = useState(false)
  const [targetDir, setTargetDir] = useState<string>('')
  const pushToast = useToast()

  // Ensure unique menu and item IDs so duplicated names don't cross-wire actions
  const projectOptions = useMemo(() => Menu.new({
    id: `projectOptions_${path}`,
    items: [
      { id: `project:${path}:rename`, text: "Rename", action: () => { setIsRenameOpen(true) }},
      { id: `project:${path}:move`, text: "Move", action: () => { setIsMoveOpen(true)}},
      { id: `project:${path}:delete`, text: "Delete", action: () => { setIsDeleteOpen(true) }},
    ],
  }), [path])

  const handleOptionsMenu = async (event: { stopPropagation: () => void }) => {
    event.stopPropagation()
    const menu = await projectOptions
    menu.popup()
  }

  const displayName = formatProjectDisplayName({ name, kind, path, ext })

  const openProject = () =>{
    sessionStorage.setItem("path", path)
    sessionStorage.setItem("projectName", displayName)
    rpc_project(displayName, path)
    navigator(`/editor/${name}`)
  }
  const toggleSelection = () => onToggleSelect?.(path)

  const currentDir = useMemo(() => {
    const idxB = path.lastIndexOf('\\')
    const idxF = path.lastIndexOf('/')
    const idx = Math.max(idxB, idxF)
    return idx >= 0 ? path.slice(0, idx) : ''
  }, [path])

  const handleRename = async (newName: string) => {
    if (!newName || newName === name) { setIsRenameOpen(false); return }
    try {
      await renameProjectPath(path, newName)
      pushToast({ message: `Renamed to ${newName}`, kind: "success" })
      onRename()
    } catch (err) {
      pushToast({ message: `Rename failed: ${err}`, kind: "error" })
    } finally {
      setIsRenameOpen(false)
    }
  }

  const handleDeletion = async () => {
    try {
      await deleteProjectPath(path)
      pushToast({ message: `Deleted ${displayName}`, kind: "info" })
      onDelete()
    } catch (err) {
      pushToast({ message: `Delete failed: ${err}`, kind: "error" })
    } finally {
      setIsDeleteOpen(false)
    }
  }

  const handleMove = async () => {
    const dest = targetDir || rootPath || ''
    if (!dest) { setIsMoveOpen(false); return }
    // Otherwise, move physically if changed
    if (dest === currentDir) { setIsMoveOpen(false); return }
    try {
      await moveProjectPath(path, dest)
      pushToast({ message: `Moved ${displayName}`, kind: "success" })
      onRename()
    } catch (err) {
      pushToast({ message: `Move failed: ${err}`, kind: "error" })
    } finally {
      setIsMoveOpen(false)
    }
  }

  const bg = color ? withAlpha(color, 0.3) : undefined
  const border = color ? withAlpha(color, 0.5) : undefined
  const iconColor = color ? readableTextColor(color) : undefined
  const destinationOptions = useMemo<SelectOption[]>(() => {
    const options: SelectOption[] = []
    if (rootPath) options.push({ kind: "option", value: rootPath, label: "Root" })
    tree?.physicalFolders.forEach((f) => {
      options.push({ kind: "option", value: f.path, label: f.name })
    })
    return options
  }, [rootPath, tree])

  return(
    <>
      <MultiModal type='renameProject' isOpen={isRenameModalOpen} onClose={() => setIsRenameOpen(false)} onSubmit={handleRename} title={'New project name'} buttonLabel='Rename' placeholder='New project name' initialName={name} />
      <MultiModal type='delete' isOpen={isDeleteModalOpen} onClose={() => setIsDeleteOpen(false)} onSubmit={handleDeletion} title={'Warning'} declineButtonLabel='Cancel' acceptButtonLabel='Delete' message={`Are you sure you want to delete this project!?`} name={(<>Project Name:<span>{displayName}</span></>)}/>
      <MultiModal type='custom' isOpen={isMoveModalOpen} onClose={() => setIsMoveOpen(false)} title={'Move project'} primaryAction={{ label: 'Move', onClick: handleMove }}>
        <label className={style.label} htmlFor="dest">Destination folder</label>
        <Select
          id="dest"
          value={targetDir || currentDir}
          options={destinationOptions}
          placeholder="Select a folder"
          onChange={(val) => setTargetDir(val)}
        />
      </MultiModal>
      <div
        className={`${style.project} ${selectionMode ? style.selectionMode : ''} ${selected ? style.selectedRow : ''}`}
        onClick={() => { selectionMode ? toggleSelection() : openProject() }}
        style={(bg || border || iconColor) ? ({ background: bg, borderColor: border, ['--project-title' as any]: iconColor } as any) : undefined}
      >
        <div
        className={`${style.selectionSlot} ${selectionMode ? style.selectionVisible : ''}`}
        onClick={(e) => { e.stopPropagation() }}
        >
          <input
            type="checkbox"
            className={style.selectCheckbox}
            checked={selected}
            onChange={() => toggleSelection()}
            aria-label={`Select ${displayName}`}
          />
        </div>
        <h4 className={style.name}>{displayName}</h4>
        <div className={style.data}>
          <p className={style.p}><strong>Last Updated:</strong><br/>{date}</p>
        </div>
        <div className={style.buttons}>
          <button className={style.options} onClick={handleOptionsMenu}>
            <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeWidth="4" d="M12 6h.01M12 12h.01M12 18h.01" />
            </svg>
          </button> 
        </div>
      </div>
    </>
  )
}
export default Project
