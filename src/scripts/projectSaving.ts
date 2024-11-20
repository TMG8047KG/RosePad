import { invoke } from "@tauri-apps/api/core";
import { BaseDirectory, documentDir } from "@tauri-apps/api/path";
import { open } from '@tauri-apps/plugin-dialog';
import { exists, mkdir, readTextFile, writeFile, writeTextFile } from "@tauri-apps/plugin-fs";

export const settingsFile = "settings.json"

export async function pathFromOpenedFile() {
    const path = await invoke('get_args')
    return path as string;
}

export async function settings() {
    if(!await exists("", {baseDir: BaseDirectory.AppConfig})){
        await mkdir('', { baseDir: BaseDirectory.AppConfig})
    }

    const hasFile = await exists(settingsFile, { baseDir: BaseDirectory.AppConfig });
    if(!hasFile){
        let data = {
            projectPath: "null",
            projects: []
        }
        let json = JSON.stringify(data, null, 2);
        await writeTextFile(settingsFile, json, { baseDir: BaseDirectory.AppConfig})
    }
}
  
export async function selectDir(){
    const dir = await open({
        multiple: false,
        directory: true,
        canCreateDirectories: true,
        title: 'Select a project folder',
        defaultPath: await documentDir(),
    });
    if(dir){
        const rawJson = await readTextFile(settingsFile, { baseDir: BaseDirectory.AppConfig });
        let settings = JSON.parse(rawJson);
        settings.projectPath = dir;
        let json = JSON.stringify(settings, null, 2);
        await writeTextFile(settingsFile, json, { baseDir: BaseDirectory.AppConfig })
        return dir
    }
}

export async function addProject(name:string, path:string|URL) {
    const rawJson = await readTextFile(settingsFile, { baseDir: BaseDirectory.AppConfig });
    let settings = JSON.parse(rawJson);
    let now = new Date();
    settings.projects.push({ 
        name: `${name}`,
        last_updated: `${now.toLocaleString()}`,
        path: `${path}`
    })
    let json = JSON.stringify(settings, null, 2);
    await writeTextFile(settingsFile, json, { baseDir: BaseDirectory.AppConfig })
}

export async function getProjectsOrdered() {
    const rawJson = await readTextFile(settingsFile, { baseDir: BaseDirectory.AppConfig });
    let json = JSON.parse(rawJson);
    let projects = json.projects;
    projects.sort((a: { last_updated: string | number | Date; }, b: { last_updated: string | number | Date; }) => {
        const dateA = new Date(a.last_updated).getTime();
        const dateB = new Date(b.last_updated).getTime();
        return dateA - dateB;
    });
    projects.reverse()
    return projects
}

export async function saveProject(text: string, name: string) {
    const rawJson = await readTextFile(settingsFile, { baseDir: BaseDirectory.AppConfig });
    let json = JSON.parse(rawJson);
    let project = json.projects.find((projectName: { name: string; }) => projectName.name === name);
    project.last_updated = new Date().toLocaleString();
    const path = `${project.path}\\${name}.rpad`;
    let updatedJson = JSON.stringify(json, null, 2);
    await writeTextFile(settingsFile, updatedJson, { baseDir: BaseDirectory.AppConfig });
    await writeTextFile(path, text);
}

export async function loadFile(path: string | URL) {
    const text = await readTextFile(path);
    return text;
}