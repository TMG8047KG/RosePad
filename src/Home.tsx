import './styles/Main.css'
import style from './styles/Home.module.css'
import NavBar from './components/nav';
import Prompt from './components/prompt';
import Project from './components/project';

import { create, readTextFile, BaseDirectory} from '@tauri-apps/plugin-fs';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { addProject, getProjectsOrdered, pathFromOpenedFile, projectExists, selectDir, settings, settingsFile } from './scripts/projectHandler';
import { rpc_main_menu, rpc_project } from './scripts/discord_rpc';

settings();


async function createProject(dir:string, name:string) { 
  const filePath = `${dir}\\${name}.rpad`;
  const file = await create(filePath);
  await file.close();
  await rpc_project(name, filePath);
  sessionStorage.setItem("name", `${name}`); //file_name
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
  }, []);

  const handleProjectDeletion = async (projectName: string) => {
    setProjects((prevProjects) =>
      prevProjects.filter((project) => project.name !== projectName)
    );
  };

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

  const openedFromFile = async () => {
    const path = await pathFromOpenedFile(); //full path (aka with /file_name.extension)
    const exists = await projectExists(path);
    if(path && !exists){
      const splitPath = path.split("/");
      const name = splitPath[splitPath.length-1];
      sessionStorage.setItem("path", path);
      sessionStorage.setItem("name", name); //file_name.extension
      await addProject(name, path);
      await rpc_project(name, path);
      navigator(`/editor/${name}`);
    }
  }
  openedFromFile();
  rpc_main_menu();

  return (
    <main>
      <NavBar/>
      <div className={style.container}>
        <div className={style.infoBox}>
          <h1 className={style.title}>RosePad</h1>
          <p>A simple and beatiful way to write notes, letters, poems and such.</p>
          <button className={style.button} onClick={ ()=> setIsModalOpen(true) }>Create Project</button>
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
                  />
                ))
              ) : (
                <p className={style.noProjectsMessage}>There aren't any projects!</p>
              )}
            </div>
          </div>
        </div>
        <Prompt isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreateProject}/>
      </div>
    </main>
  )
}

export default App;