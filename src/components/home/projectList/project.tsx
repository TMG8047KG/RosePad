import { useNavigate } from 'react-router-dom'
import style from '../../../styles/components/home/projectList/project.module.css'
import { rpc_project } from '../../../core/discord_rpc'
import { useMemo, useState } from 'react'
import { Menu } from '@tauri-apps/api/menu'
import MultiModal from '../modal'
import { extType, FileExt } from './fileExt'
import { deleteProjectPath, renameProjectPath, moveProjectPath, assignProjectPathToVirtual } from '../../../core/db'
import { useWorkspace } from '../../../core/workspaceContext'

function toAlpha(hex: string, alpha: number) {
  if (!hex) return ''
  let h = hex.replace('#','')
  if (h.length === 3) h = h.split('').map(c=>c+c).join('')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0,2),16)
  const g = parseInt(h.slice(2,4),16)
  const b = parseInt(h.slice(4,6),16)
  return `rgba(${r},${g},${b},${alpha})`
}

function Project({name, date, path, ext, onDelete, onRename, color }: {name: string; date: string; path: string; ext: extType; onDelete: () => void; onRename: () => void; color?: string }) {
  const navigator = useNavigate()
  const { tree, rootPath } = useWorkspace()
  const [isRenameModalOpen, setIsRenameOpen] = useState(false)
  const [isMoveModalOpen, setIsMoveOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteOpen] = useState(false)
  const [targetDir, setTargetDir] = useState<string>('')

  // Ensure unique menu and item IDs so duplicated names don't cross-wire actions
  const projectOptions = Menu.new({
    id: `projectOptions_${path}`,
    items: [
      { id: `project:${path}:rename`, text: "Rename", action: () => { setIsRenameOpen(true) }},
      { id: `project:${path}:move`, text: "Move", action: () => { setIsMoveOpen(true)}},
      { id: `project:${path}:delete`, text: "Delete", action: () => { setIsDeleteOpen(true) }},
    ],
  })

  const handleOptionsMenu = async (event: { stopPropagation: () => void }) => {
    event.stopPropagation()
    const menu = await projectOptions
    menu.popup()
  }

  const openProject = () =>{
    sessionStorage.setItem("path", path)
    sessionStorage.setItem("projectName", name)
    rpc_project(name, path)
    navigator(`/editor/${name}`)
  }

  const currentDir = useMemo(() => {
    const idxB = path.lastIndexOf('\\')
    const idxF = path.lastIndexOf('/')
    const idx = Math.max(idxB, idxF)
    return idx >= 0 ? path.slice(0, idx) : ''
  }, [path])

  const handleRename = async (newName: string) => {
    if (!newName || newName === name) { setIsRenameOpen(false); return }
    await renameProjectPath(path, newName)
    setIsRenameOpen(false)
    onRename()
  }

  const handleDeletion = async () => {
    await deleteProjectPath(path)
    setIsDeleteOpen(false)
    onDelete()
  }

  const handleMove = async () => {
    const dest = targetDir || rootPath || ''
    if (!dest) { setIsMoveOpen(false); return }
    // Assign to virtual folder if selected
    if (dest.startsWith('vf:')) {
      const vfId = dest.slice(3)
      try {
        await assignProjectPathToVirtual(path, vfId)
      } finally {
        setIsMoveOpen(false)
        onRename()
      }
      return
    }
    // Otherwise, move physically if changed
    if (dest === currentDir) { setIsMoveOpen(false); return }
    await moveProjectPath(path, dest)
    setIsMoveOpen(false)
    onRename()
  }

  const bg = color ? toAlpha(color, 0.3) : undefined
  const border = color ? toAlpha(color, 0.5) : undefined

  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    if (!hex) return null
    let h = hex.replace('#','').trim()
    if (h.length === 3) h = h.split('').map(c=>c+c).join('')
    if (h.length !== 6) return null
    const r = parseInt(h.slice(0,2),16)
    const g = parseInt(h.slice(2,4),16)
    const b = parseInt(h.slice(4,6),16)
    return { r, g, b }
  }
  function relativeLuminance(r:number,g:number,b:number): number {
    const srgb = [r, g, b].map(v => v/255)
    const lin = srgb.map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4)) as [number,number,number]
    return 0.2126*lin[0] + 0.7152*lin[1] + 0.0722*lin[2]
  }
  const iconColor = useMemo(() => {
    if (!color) return undefined
    const rgb = hexToRgb(color)
    if (!rgb) return undefined
    const L = relativeLuminance(rgb.r, rgb.g, rgb.b)
    return L < 0.55 ? '#FFFFFF' : '#0F1115'
  }, [color])

  return(
    <>
      <MultiModal type='renameProject' isOpen={isRenameModalOpen} onClose={() => setIsRenameOpen(false)} onSubmit={handleRename} title={'New project name'} buttonLabel='Rename' placeholder='New project name' initialName={name} />
      <MultiModal type='deleteProject' isOpen={isDeleteModalOpen} onClose={() => setIsDeleteOpen(false)} onSubmit={handleDeletion} title={'Warning'} declineButtonLabel='Cancel' acceptButtonLabel='Delete' info={`Are you sure you want to delete ${name}!?`}/>
      <MultiModal type='custom' isOpen={isMoveModalOpen} onClose={() => setIsMoveOpen(false)} title={'Move project'} primaryAction={{ label: 'Move', onClick: handleMove }}>
        <label htmlFor="dest">Destination folder</label>
        <select id="dest" className={style.select} value={targetDir || currentDir} onChange={(e) => setTargetDir((e.target as HTMLSelectElement).value)}>
          {rootPath ? <option value={rootPath}>Root</option> : null}
          {tree?.physicalFolders.map(f => (
            <option key={f.id} value={f.path}>{f.name}</option>
          ))}
          {tree?.virtualFolders.length ? <option disabled>── Virtual Folders ──</option> : null}
          {tree?.virtualFolders.map(v => (
            <option key={v.id} value={`vf:${v.id}`}>{v.name} (virtual)</option>
          ))}
        </select>
      </MultiModal>
      <div className={style.project} onClick={() => { openProject() }} style={(bg || border || iconColor) ? ({ background: bg, borderColor: border, ['--project-title' as any]: iconColor } as any) : undefined}>
        <h4 className={style.name}>{name}</h4>
        <FileExt type={ext}/>
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
