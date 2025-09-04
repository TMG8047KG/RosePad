import './styles/Main.css'
import style from './styles/Home.module.css'
import NavBar from './components/nav';
import Prompt from './components/prompt';
import Project from './components/project';
import SettingsButton from "./components/buttonSettings"

import { create, readTextFile, BaseDirectory} from '@tauri-apps/plugin-fs';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { addProject, getProjectsOrdered, pathFromOpenedFile, projectExists, selectDir, settings, settingsFile } from './scripts/projectHandler';
import { rpc_main_menu, rpc_project } from './scripts/discord_rpc';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { documentDir } from '@tauri-apps/api/path';
import { type } from '@tauri-apps/plugin-os';

let path = "";

settings();

listen("backgroundColor", (event) => {
  const payload = event.payload;
  const background = document.getElementById("con");
  if(background) background.style.background = payload as string;
})

async function createProject(dir:string, name:string) { 
  const filePath = `${dir}\\${name}.rpad`;
  const file = await create(filePath);
  await file.close();
  await rpc_project(name, filePath);
  sessionStorage.setItem("name", `${name}`); //file_name
  sessionStorage.setItem("projectName", name);
  sessionStorage.setItem("path", filePath) //with extension
  addProject(name, filePath);
}

function App() {
  const navigator = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    const fetchProjects = async () => {
      const fetchedProjects = await getProjectsOrdered();
      setProjects(fetchedProjects);
    };
    fetchProjects();

    const unlisten = listen('file-open', async (event) => {
      const args = event.payload as string[];
      if (args.length > 1) {
        const openedPath = args[1];
        await handleFileOpen(openedPath);
      }
    });

    openedFromFile();

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  const handleProjectRename = async (oldName: string, newName: string, newPath: string) => {
    setProjects(prevProjects => 
      prevProjects.map(project => project.name === oldName ? {...project, name: newName, path: newPath} : project)
    );
  };

  const handleProjectDeletion = async (projectName: string) => {
    setProjects((prevProjects) =>
      prevProjects.filter((project) => project.name !== projectName)
    );
  };

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateProject = async (name: string) => {
    const raw = await readTextFile(settingsFile, type() !== "android" ? { baseDir: BaseDirectory.AppLocalData} : { baseDir: BaseDirectory.AppConfig })
    const data = JSON.parse(raw)
    let dir = data.projectPath;
    console.log(dir);
    if((type() !== "android" || "ios") && dir == "null" || !dir){
      dir = await selectDir()
      localStorage.setItem("autoSave", "true");
      localStorage.setItem("spellcheck", "false");
    }
    if(data.projects.some((projectName: { name: string; }) => projectName.name === name)){
      return alert("A project with this name already exists!");  
    }
    await createProject(dir, name);
    setIsModalOpen(false);
    navigator(`/editor/${name}`);
  };

  const handleFileOpen = async (filePath: string) => {
    const exists = await projectExists(filePath);
    if(filePath){
      const splitPath = filePath.split(/[/\\]/g);
      let name = splitPath[splitPath.length-1];
      const project = name.split(".");
      sessionStorage.setItem("path", filePath);
      if(project[1] == "rpad"){
        name = project[0] //file_name
      }
      sessionStorage.setItem("name", name); //file_name.extension
      sessionStorage.setItem("projectName", name); 
      if(!exists) await addProject(name, filePath);
      await rpc_project(name, filePath);
      navigator(`/editor/${name}`);
    }
  }

  const importProject = async () => {
    const path = await open({
      multiple: false,
      directory: false,
      title: 'Select a project',
      filters: [{
        name: 'RosePad Files',
        extensions: ['rpad', 'txt']
      },
      {
        name: 'RosePad Project',
        extensions: ['rpad']
      },
      {
        name: 'Supported Files',
        extensions: ['txt']
      }],
      defaultPath: await documentDir(),
    });
    if(path) handleFileOpen(path);
  }

  const openedFromFile = async () => {
    if(!path){
      path = await pathFromOpenedFile(); //full path (aka with /file_name.extension)
      if(path) {
        await handleFileOpen(path);
      }
    }
  }

  rpc_main_menu();

  return (
    <main>
      <div className={style.shadow}/>
      {type.name === "linux" || "windows" || "macos" ? <NavBar/> : ""}
      <div id='con' className={style.container}>
        <div className={style.infoBox}>
          <h1 className={style.title}>RosePad</h1>
          <p>A simple and beautiful way to write notes, letters, poems and such.</p>
          <div className={style.buttons}>
            <button className={style.button} onClick={ ()=> setIsModalOpen(true) }>Create Project</button>
            <button className={style.import} onClick={ ()=> importProject() }>
              <svg aria-hidden="true" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 12h14m-7 7V5"/>
              </svg>
            </button>
          </div>
        </div>
        <div className={style.projects}>
          <div className={style.listField}>
            <h2>Projects</h2>
            <div className={style.list}>
              {projects.length > 0 ? (
                projects.map((project) => (
                  <Project
                    key={project.name}
                    name={project.name}
                    date={project.last_updated}
                    path={project.path}
                    onDelete={handleProjectDeletion}
                    onRename={handleProjectRename}/>
                ))
              ) : (
                <p className={style.noProjectsMessage}>There aren't any projects!</p>
              )}
            </div>
          </div>
        </div>
        <Prompt isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreateProject}/>
        <div className={style.settings}>
          <SettingsButton/>
        </div>
      </div>
    </main>
  )
}

export default App;