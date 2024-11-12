import { open } from '@tauri-apps/plugin-dialog';
import { create, writeFile, readTextFile, BaseDirectory, exists, mkdir } from '@tauri-apps/plugin-fs';

import './nav'
import './MainPage.css'
import NavBar from './nav';

let projectDirectory:any = settings();

async function settings() {
  const file = "settings.json";
  const hasFile = await exists(file, { baseDir: BaseDirectory.AppConfig });
  if(!await exists("", {baseDir: BaseDirectory.AppConfig})){
    await mkdir('', { baseDir: BaseDirectory.AppConfig})
  }
  if(hasFile){
    const conf = JSON.parse(await readTextFile("settings.json", { baseDir: BaseDirectory.AppConfig }));
    console.log(conf.projectPath);
    return conf.projectPath;
  }else{
    let data = new TextEncoder().encode(JSON.stringify("{ \"projectPath\": \"$DOCUMENT/RosePad\" }"));
    await writeFile("settings.json", data, { baseDir: BaseDirectory.AppConfig})
    return "$DOCUMENT/RosePad"
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
    console.log("Path: " + projectDirectory);
    let data = new TextEncoder().encode(JSON.stringify(`{ \"projectPath\": \"${dir}\" }`));
    await writeFile("settings.json", data, { baseDir: BaseDirectory.AppConfig })
    projectDirectory = dir;
  }
  console.log("New Path: " + projectDirectory)
}

async function createProject(dir: any, name: string) {
  const filePath = `${dir}/${name}.rpad`;
  const file = await create(filePath);
  await file.write(new TextEncoder().encode("Hello world!"));
  await file.close();
}

function App() {
  return (
    <main>
      <NavBar/>
      <div className='container'>
        <div className='infoBox'>
        <h1>RosePad</h1>
        <p>A simple and beatiful way to write notes, letters, poems and such.</p>
        <button onClick={ ()=> {createProject(projectDirectory, "Rose")} }>Create Project</button>
        <button onClick={ selectDir }>SelectDir</button>
      </div>
      <div className='projects'>
        <div>

        </div>
      </div>
      </div>
    </main>
  )
}

export default App;
