import { invoke } from "@tauri-apps/api/core";
import { BaseDirectory, documentDir } from "@tauri-apps/api/path";
import { open } from '@tauri-apps/plugin-dialog';
import { exists, mkdir, readTextFile, remove, writeTextFile } from "@tauri-apps/plugin-fs";

export const settingsFile = "settings.json"

export async function pathFromOpenedFile() {
    const path = await invoke('get_args')
    if(Array.isArray(path)  && path.length >= 1){
        return path[1] as string;
    }
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

export async function saveProject(text: string, path: string) {
    const rawJson = await readTextFile(settingsFile, { baseDir: BaseDirectory.AppConfig });
    let json = JSON.parse(rawJson);
    let project = json.projects.find((projectPath: { path: string; }) => projectPath.path === path);
    project.last_updated = new Date().toLocaleString();
    let updatedJson = JSON.stringify(json, null, 2);
    await writeTextFile(settingsFile, updatedJson, { baseDir: BaseDirectory.AppConfig });
    await writeTextFile(project.path, text);
}

export async function loadFile(path: string | URL) {
    const text = await readTextFile(path);
    return text;
}

export async function deleteProject(name: string | URL) {
    const rawJson = await readTextFile(settingsFile, { baseDir: BaseDirectory.AppConfig });
    let json = JSON.parse(rawJson);
    let project = json.projects.find((projectName: { name: string; }) => projectName.name === name);
    await remove(project.path)
    const index = json.projects.findIndex((projectPath: { path: string; }) => project.path === projectPath.path);
    json.projects.splice(index, 1);
    const updatedJson = JSON.stringify(json, null, 2);
    await writeTextFile(settingsFile, updatedJson, { baseDir: BaseDirectory.AppConfig })
}