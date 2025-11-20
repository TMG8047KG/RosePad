import './styles/Main.css'
import style from './styles/Home.module.css'
import NavBar from './components/nav'
import SettingsButton from "./components/settings/buttonSettings"
import MultiModal from './components/home/modal'
import { ProjectList } from './components/home/projectList/list'

import { open } from '@tauri-apps/plugin-dialog'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import { type } from '@tauri-apps/plugin-os'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { rpc_main_menu, rpc_project } from './core/discord_rpc'
import { applyTheme, setup } from './core/cache'
import { addProject, pathFromOpenedFile, projectExists, selectDir, settings } from './core/projectHandler'
import { addVirtualFolder, setVirtualFolderColor, setPhysicalFolderColor, createPhysicalFolder } from './core/db'

import { useWorkspace } from './core/workspaceContext'
import { invoke } from '@tauri-apps/api/core'

let openedPathCache: string | null = null

setup()
applyTheme()
settings()

async function createRpadFile(dir: string, name: string) {
  const filePath = await invoke<string>('create_rpad_project', { destDir: dir, name })
  return filePath
}

function HomeShell() {
  const navigator = useNavigate()
  const [isChooseOpen, setIsChooseOpen] = useState(false)
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)

  const { rootPath, setRoot, reindex } = useWorkspace();

  const ensureWorkspace = async () => {
    if (rootPath) return rootPath
    const dir = await selectDir()
    if (!dir) throw new Error('No workspace selected')
    await setRoot(dir)
    return dir
  }

  const importIntoWorkspace = async (filePath: string) => {
    const root = await ensureWorkspace()
    const dest = await invoke<string>('import_project', { root, src: filePath })
    return dest
  }

  const handleFileOpen = async (filePath: string) => {
    if (!filePath) return
    // copy into workspace if needed
    const insidePath = await importIntoWorkspace(filePath)

    // name derivation
    let name = insidePath.split(/[/\\]/g).pop() || insidePath
    const dot = name.lastIndexOf('.')
    if (dot > 0) name = name.slice(0, dot)

    sessionStorage.setItem('path', insidePath)
    sessionStorage.setItem('name', name)
    sessionStorage.setItem('projectName', name)

    if (!(await projectExists(insidePath))) {
      await addProject(name, insidePath) // recents list
    }

    await reindex()             // <— now it appears in the project list
    await rpc_project(name, insidePath)
    navigator(`/editor/${name}`)
  }

  const importProject = async () => {
    const p = await open({
      multiple: false,
      directory: false,
      title: 'Select a project to import',
      filters: [
        { name: 'RosePad Files', extensions: ['rpad','txt','pdf','doc','docx'] },
        { name: 'RosePad Project', extensions: ['rpad'] },
        { name: 'Supported Files', extensions: ['txt','pdf','doc','docx'] }
      ]
    })
    if (p) await handleFileOpen(p as string)
  }

  useEffect(() => {
    const showWindow = async () => {
      const rWin = getCurrentWindow()
      rWin.show().then(() => rWin.setFocus?.())
    }
    showWindow()

    const unlisten = listen<string[]>('file-open', async (event) => {
      const args = event.payload || []
      if (args.length > 1) {
        const openedPath = args[1]
        await handleFileOpen(openedPath)
      }
    })

    openedFromFile()
    rpc_main_menu()

    return () => { unlisten.then(f => f()) }
  }, [])

  useEffect(() => {
    const refreshRpc = () => {
      localStorage.setItem("activePage", "home")
      rpc_main_menu()
    }
    refreshRpc()
    window.addEventListener("focus", refreshRpc)
    return () => window.removeEventListener("focus", refreshRpc)
  }, [])

  const handleCreateProject = async (name: string, dest?: string) => {
    // Ensure we have a workspace root to work with
    const root = await ensureWorkspace()
    // If user picked a physical folder, use it; otherwise use workspace root
    const dir = (dest && !dest.startsWith('vf:')) ? dest : root

    const filePath = await createRpadFile(dir, name)
    await rpc_project(name, filePath)
    sessionStorage.setItem("name", name)
    sessionStorage.setItem("projectName", name)
    sessionStorage.setItem("path", filePath)
    await addProject(name, filePath)

    // First reindex so the new project is in the DB
    await reindex()
    // If a virtual folder was selected, assign the newly created project to it
    if (dest && dest.startsWith('vf:')) {
      const vfId = dest.slice(3)
      // Assign by path; relies on reindex to have populated the DB entry
      const { assignProjectPathToVirtual } = await import('./core/db')
      await assignProjectPathToVirtual(filePath, vfId)
      // Reindex again so the assignment appears immediately in the UI
      await reindex()
    }
    setIsCreateProjectOpen(false)
    navigator(`/editor/${name}`)
  }

  const openedFromFile = async () => {
    if (!openedPathCache) {
      openedPathCache = await pathFromOpenedFile()
      if (openedPathCache) await handleFileOpen(openedPathCache)
    }
  }

  return (
    <div className={style.container}>
      <div className={style.infoBox}>
        <h1 className={style.title}>RosePad</h1>
        <p>A simple and beautiful way to write notes, letters, poems and such.</p>
        <div className={style.buttons}>
          <div className={style.buttons}>
            <button className={style.button} onClick={() => setIsChooseOpen(true)}>Create</button>
            <button className={style.import} onClick={() => importProject()}>
              <svg aria-hidden="true" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 12h14m-7 7V5"/>
              </svg>
              </button>
            </div>
        </div>
      </div>
      <div className={style.projects}>
        <ProjectList/>
      </div>
      <MultiModal
        type='chooseCreate'
        isOpen={isChooseOpen}
        onClose={() => setIsChooseOpen(false)}
        title='Create'
        onChoose={(choice) => {
          setIsChooseOpen(false)
          if (choice === 'project') setIsCreateProjectOpen(true)
          else setIsCreateFolderOpen(true)
        }}
      />
      <MultiModal type='createProject' isOpen={isCreateProjectOpen} onClose={() => setIsCreateProjectOpen(false)} onSubmit={(n, d) => handleCreateProject(n, d)}/>
      <MultiModal type='createFolder' isOpen={isCreateFolderOpen} onClose={() => setIsCreateFolderOpen(false)} onSubmit={async (name, folderType, color) => {
        const root = await ensureWorkspace()
        if (folderType === 'physical') {
          const p = await createPhysicalFolder(root, name)
          if (color) await setPhysicalFolderColor(p, color)
        } else {
          const id = await addVirtualFolder(name, root)
          if (color) await setVirtualFolderColor(id, color)
        }
        await reindex()
        setIsCreateFolderOpen(false)
      }}/>
      <div className={style.settings}>
        <SettingsButton/>
      </div>
    </div>
  )
}

function App() {
  return (
    <main>
      <div className={style.shadow}/>
        {!["android","ios"].includes(type()) ? <NavBar/> : ""}
        <HomeShell/>
    </main>
  )
}

export default App
