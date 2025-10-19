import { useMemo, useState } from 'react'
import ProjectCard from './project'
import style from '../../../styles/components/home/projectList/folder.module.css'
import { Project, setPhysicalFolderColor, setVirtualFolderColor, renameVirtualFolder, deleteVirtualFolder, renamePhysicalFolder, deletePhysicalFolder } from '../../../core/db';
import { Menu } from '@tauri-apps/api/menu';
import MultiModal from '../modal'
import ColorPalette from '../../colorPalette'

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

export type FolderType = 'virtual' | 'physical'

export function Folder({ id, type, name, projectIds, projectMap, onChanged, color }: { id:string; type:FolderType; name:string; projectIds:string[]; projectMap:Record<string,Project>; onChanged:()=>void; color?:string|null }) {
  const ids = projectIds;
  const [isRenameModalOpen, setIsRenameOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteOpen] = useState(false)
  const [isColorModalOpen, setIsColorOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string>(color ?? '#aabbcc')
  const [collapsed, setCollapsed] = useState(false)

  const projectOptions = Menu.new({
    id: `folderOptions_${type}_${id}`,
    items: [
      { id: `${type}:${id}:rename`, text: "Rename", action: () => { setIsRenameOpen(true) }},
      { id: `${type}:${id}:color`, text: "Change color", action: () => { setSelectedColor(color ?? '#aabbcc'); setIsColorOpen(true) }},
      { id: `${type}:${id}:delete`, text: "Delete", action: () => { setIsDeleteOpen(true) }},
    ],
  })

  const handleOptionsMenu = async (event: { stopPropagation: () => void }) => {
    event.stopPropagation()
    const menu = await projectOptions
    menu.popup()
  }

  const toggleList = () => setCollapsed(c => !c)

  const handleRename = async (newName: string) => {
    if (!newName || newName === name) { setIsRenameOpen(false); return }
    if (type === 'virtual') await renameVirtualFolder(id, newName)
    else await renamePhysicalFolder(id, newName)
    setIsRenameOpen(false)
    onChanged()
  }

  const handleDeletion = async () => {
    if (type === 'virtual') await deleteVirtualFolder(id)
    else await deletePhysicalFolder(id)
    setIsDeleteOpen(false)
    onChanged()
  }

  const applyColor = async () => {
    if (!selectedColor) {
      // clear color
      if (type === 'virtual') await setVirtualFolderColor(id, null)
      else await setPhysicalFolderColor(id, null)
    } else {
      if (type === 'virtual') await setVirtualFolderColor(id, selectedColor)
      else await setPhysicalFolderColor(id, selectedColor) 
    }
    setIsColorOpen(false)
    onChanged()
  }

  const bg = color ? toAlpha(color, .9) : undefined

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
  const titleColor = useMemo(() => {
    if (!color) return undefined
    const rgb = hexToRgb(color)
    if (!rgb) return undefined
    const L = relativeLuminance(rgb.r, rgb.g, rgb.b)
    return L < 0.55 ? '#FFFFFF' : '#0F1115'
  }, [color])

  return (
    <>
      <MultiModal type='renameProject' isOpen={isRenameModalOpen} onClose={() => setIsRenameOpen(false)} onSubmit={handleRename} title={'New folder name'} buttonLabel='Rename' placeholder='New folder name' initialName={name} />
      <MultiModal type='deleteProject' isOpen={isDeleteModalOpen} onClose={() => setIsDeleteOpen(false)} onSubmit={handleDeletion} title={'Warning'} declineButtonLabel='Cancel' acceptButtonLabel='Delete' info={`Are you sure you want to delete folder ${name}?`}/>
      <MultiModal type='custom' isOpen={isColorModalOpen} onClose={() => setIsColorOpen(false)} title={'Folder color'} primaryAction={{ label: 'Apply', onClick: applyColor }}>
        <div className={style.centerRow}>
          <ColorPalette value={selectedColor} onChange={setSelectedColor} renderAs="panel" />
        </div>
      </MultiModal>
      <div className={style.container} data-type={type}>
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
            const ext = p.kind === 'rpad' ? '' : (p.ext === 'docx' ? 'doc' : (p.ext || p.kind)) as any
            const date = new Intl.DateTimeFormat(undefined,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(p.lastModifiedMs))
            return (
              <ProjectCard
                key={p.id}
                name={p.title || p.name}
                date={date}
                path={p.path}
                ext={ext}
                onDelete={() => onChanged()}
                onRename={() => onChanged()}
                color={color || undefined}
              />
            )
          })}
        </div>
      </div>
    </>
  )
}
