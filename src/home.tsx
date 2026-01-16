import './styles/Main.css'
import style from './styles/Home.module.css'
import NavBar from './components/nav'
import SettingsButton from "./components/settings/buttonSettings"
import MultiModal from './components/modal'
import { ProjectList } from './components/home/projectList/list'

import { open } from '@tauri-apps/plugin-dialog'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

import { rpc_main_menu, rpc_project } from './core/discord_rpc'
import { applyTheme, setup } from './core/cache'
import { addProject, settings } from './core/projectHandler'
import { setPhysicalFolderColor, createPhysicalFolder } from './core/db'

import { useWorkspace } from './core/workspaceContext'
import { invoke } from '@tauri-apps/api/core'
import { useHandleFileOpen } from './hooks/useHandleFileOpen'
import formattedChangeLog from './core/changelog'
import { useToast } from './core/toast'

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
  const [isChangeLogOpen, setIsChangeLogOpen] = useState(false)
  const [changeLogContent, setChangeLogContent] = useState<ReactNode>('Loading changelog...')
  const { reindex } = useWorkspace();
  const pushToast = useToast()

  const { handleFileOpen, ensureWorkspace } = useHandleFileOpen()
  const importProject = async () => {
    const p = await open({
      multiple: false,
      directory: false,
      title: 'Select a project to import',
      filters: [
        { name: 'RosePad Files', extensions: ['rpad','txt','pdf','doc','docx'] },
        { name: 'Common Text & Code', extensions: ['txt','md','json','log','js','jsx','ts','tsx','html','css','xml','yaml','yml','ini','cfg','conf','sql','csv','tsv','sh','bat','ps1','py','rs','go','java','kt','c','cpp','h'] },
        { name: 'RosePad Project', extensions: ['rpad'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (!p) return
    try {
      await handleFileOpen(p as string)
      pushToast({ message: 'Imported project', kind: 'success' })
    } catch (err) {
      pushToast({ message: `Import failed: ${err}`, kind: 'error' })
    }
  }

  useEffect(() => {
    const showWindow = async () => {
      const rWin = getCurrentWindow()
      rWin.show().then(() => rWin.setFocus?.())
    }
    showWindow()

    rpc_main_menu()
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

  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      if (!el || !(el as HTMLElement).tagName) return false
      const target = el as HTMLElement
      const tag = target.tagName.toLowerCase()
      const editable = target.getAttribute?.('contenteditable')
      return tag === 'input' || tag === 'textarea' || tag === 'select' || editable === 'true'
    }
    const handleShortcut = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (isTypingTarget(e.target)) return
      if (isCreateProjectOpen || isCreateFolderOpen || isChooseOpen) return

      const key = e.key.toLowerCase()
      if (key === 'p') {
        e.preventDefault()
        setIsCreateProjectOpen(true)
        setIsChooseOpen(false)
        return
      }
      if (key === 'f') {
        e.preventDefault()
        setIsCreateFolderOpen(true)
        setIsChooseOpen(false)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [isChooseOpen, isCreateFolderOpen, isCreateProjectOpen])

  useEffect(() => {
    if (!isChangeLogOpen) return

    let cancelled = false

    const loadChangeLog = async () => {
      setChangeLogContent('Loading changelog...')
      try {
        const content = await formattedChangeLog()
        if (!cancelled) setChangeLogContent(content)
      } catch (error) {
        if (!cancelled) setChangeLogContent(`Loading of the changelog failed! Try again later!`)
      }
    }

    loadChangeLog()
    return () => { cancelled = true }
  }, [isChangeLogOpen])

  useEffect(() => {
    if (sessionStorage.getItem('openChangelogRequested') === 'true') {
      sessionStorage.removeItem('openChangelogRequested')
      setIsChangeLogOpen(true)
      setIsChooseOpen(false)
      setIsCreateFolderOpen(false)
      setIsCreateProjectOpen(false)
    }
  }, [])

  useEffect(() => {
    let unlisten: UnlistenFn | undefined

    listen('open-changelog', () => {
      setIsChangeLogOpen(true)
      setIsChooseOpen(false)
      setIsCreateFolderOpen(false)
      setIsCreateProjectOpen(false)
    }).then((fn) => {
      unlisten = fn
    }).catch((err) => {
      console.error('Failed to bind changelog listener', err)
    })

    return () => {
      unlisten?.()
    }
  }, [])

  const handleCreateProject = async (name: string, dest?: string) => {
    // Ensure we have a workspace root to work with
    try {
      const root = await ensureWorkspace()
      // If user picked a folder, use it; otherwise use workspace root
      const dir = dest || root

      const filePath = await createRpadFile(dir, name)
      await rpc_project(name, filePath)
      sessionStorage.setItem("name", name)
      sessionStorage.setItem("projectName", name)
      sessionStorage.setItem("path", filePath)
      await addProject(name, filePath)

      // First reindex so the new project is in the DB
      await reindex()
      setIsCreateProjectOpen(false)
      navigator(`/editor/${name}`)
    } catch (err) {
      pushToast({ message: `Create failed: ${err}`, kind: 'error' })
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
        title='Creation Wizard'
        onChoose={(choice) => {
          setIsChooseOpen(false)
          if (choice === 'project') setIsCreateProjectOpen(true)
          else {
            setIsCreateFolderOpen(true)
          }
        }}
      />
      <MultiModal type='createProject' isOpen={isCreateProjectOpen} onClose={() => setIsCreateProjectOpen(false)} onSubmit={(n, d) => handleCreateProject(n, d)}/>
      <MultiModal type='createFolder' isOpen={isCreateFolderOpen} onClose={() => { setIsCreateFolderOpen(false)}} onSubmit={async (name, color) => {
        try {
          const root = await ensureWorkspace()
          const p = await createPhysicalFolder(root, name)
          if (color) await setPhysicalFolderColor(p, color)
          await reindex()
          pushToast({ message: 'Folder created', kind: 'success' })
        } catch (err) {
          pushToast({ message: `Folder creation failed: ${err}`, kind: 'error' })
        } finally {
          setIsCreateFolderOpen(false)
        }
      }}/>
      <MultiModal type='changelog' isOpen={isChangeLogOpen} onClose={() => setIsChangeLogOpen(false)} content={changeLogContent}/>
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
        <NavBar/>
        <HomeShell/>
    </main>
  )
}

export default App
