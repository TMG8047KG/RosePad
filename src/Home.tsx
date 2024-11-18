import './styles/Main.css'
import style from './styles/Home.module.css'
import NavBar from './components/nav';
import Prompt from './components/prompt';

import { open } from '@tauri-apps/plugin-dialog';
import { create, writeFile, readTextFile, BaseDirectory, exists, mkdir, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { documentDir } from '@tauri-apps/api/path';

const settingsFile = "settings.json"

settings();

getOpenFilePath();

// TODO: Open project when opening app from file
async function getOpenFilePath() {
  const path = await invoke('get_args')
  console.log(path);
}

async function settings() {
  if(!await exists("", {baseDir: BaseDirectory.AppConfig})){
    await mkdir('', { baseDir: BaseDirectory.AppConfig})
  }

  const hasFile = await exists(settingsFile, { baseDir: BaseDirectory.AppConfig });
  if(!hasFile){
    let data = {
      projectPath: "null"
    }
    let json = JSON.stringify(data, null, 2);
    await writeTextFile(settingsFile, json, { baseDir: BaseDirectory.AppConfig})
  }
}

async function selectDir(){
  const dir = await open({
    multiple: false,
    directory: true,
    canCreateDirectories: true,
    title: 'Select a project folder',
    defaultPath: await documentDir(),
  });
  if(dir){
    let data = {
      projectPath: `${dir}`
    }
    let json = new TextEncoder().encode(JSON.stringify(data, null, 2));
    await writeFile(settingsFile, json, { baseDir: BaseDirectory.AppConfig })
    console.log("Set Path: " + dir)
    return dir
  }
}

async function createProject(dir:string, name:string) { 
  const filePath = `${dir}\\${name}.rpad`;
  const file = await create(filePath);
  await file.write(new TextEncoder().encode("Hello world!"));
  await file.close();
}

function App() {
  const navigator = useNavigate();
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateProject = async (name: string) => {
    const raw = await readTextFile(settingsFile, { baseDir: BaseDirectory.AppConfig })
    const data = JSON.parse(raw)
    let dir = data.projectPath;
    console.log(dir);
    if(dir == "null" || !dir){
      dir = await selectDir()
    }
    await createProject(dir, name);
    setIsModalOpen(false);
    navigator(`/editor/${name}`);
  };

  return (
    <main>
      <NavBar/>
      <div className={style.container}>
        <div className={style.infoBox}>
          <h1>RosePad</h1>
          <p>A simple and beatiful way to write notes, letters, poems and such.</p>
          <button className={style.button} onClick={ ()=> setIsModalOpen(true) }>Create Project</button>
        </div>
        <div className={style.projects}>
          <div className={style.list}>
            <h2>Projects</h2>
            <button className={style.project}>
              <h3>Example</h3>
              <p>Date: 00-00-00</p>
            </button>
            <button className={style.project}>
              <h3>Example</h3>
              <p>Date: 00-00-00</p>
            </button>
            <button className={style.project}>
              <h3>Example</h3>
              <p>Date: 00-00-00</p>
            </button>
          </div>
        </div>
        <Prompt isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreateProject}/>
      </div>
    </main>
  )
}

export default App;
