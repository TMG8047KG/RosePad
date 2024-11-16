import './styles/Main.css'
import style from './styles/Home.module.css'
import NavBar from './components/nav';
import Prompt from './components/prompt';

import { open } from '@tauri-apps/plugin-dialog';
import { create, writeFile, readTextFile, BaseDirectory, exists, mkdir, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { join } from '@tauri-apps/api/path';

const settingsFile = "settings.json"

settings();

// TODO: Open project when opening app from file
async function getOpenFilePath() {
  const path = await invoke('get_args')
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
    defaultPath: 'Documents'
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
  if (!await exists(dir)) {
    console.error("Directory does not exist:", dir);
    throw new Error("Invalid directory.");
  }

  const filePath = `${dir}\\${name}.rpad`;
  console.log(`Creating project at: ${filePath}`);

  try {
    const file = await create(filePath);
    await file.write(new TextEncoder().encode("Hello world!"));
    await file.close();
    console.log("File created successfully:", filePath);
  } catch (error) {
    console.error("Error creating file:", error);
    throw error;
  }
}

function App() {
  const navigator = useNavigate();
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateProject = async (name: string) => {
    try {
      const raw = await readTextFile(settingsFile, { baseDir: BaseDirectory.AppConfig });
      const data = JSON.parse(raw);
      let dir = data.projectPath;
  
      if (dir === "null") {
        console.log("No project directory found. Prompting user...");
        dir = await selectDir();
      }
  
      if (!dir) {
        console.error("No directory selected or provided.");
        return; // Prevent execution if dir is invalid
      }
  
      const normalizedDir = await join(dir, "");
      console.log("Using directory:", normalizedDir);
  
      await createProject(normalizedDir, name);
      setIsModalOpen(false);
      navigator(`/editor/${name}`);
    } catch (error) {
      console.error("Error in handleCreateProject:", error);
    }
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
          <div>
            <Prompt isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreateProject}/>
          </div>
        </div>
      </div>
    </main>
  )
}

export default App;
