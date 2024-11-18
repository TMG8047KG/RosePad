import './styles/Main.css'
import style from './styles/Home.module.css'
import NavBar from './components/nav';
import Prompt from './components/prompt';
import Project from './components/project';

import { create, readTextFile, BaseDirectory} from '@tauri-apps/plugin-fs';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { addProject, getProjectsOrdered, selectDir, settings, settingsFile } from './scripts/projectSaving';


settings();

async function createProject(dir:string, name:string) { 
  const filePath = `${dir}\\${name}.rpad`;
  const file = await create(filePath);
  await file.close();
  addProject(name, dir);
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
            { projects.map((project) => 
              <Project key={project.id} name={project.name} date={project.last_updated}/>
            )}
          </div>
        </div>
        <Prompt isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreateProject}/>
      </div>
    </main>
  )
}

export default App;