import { invoke } from "@tauri-apps/api/core";
import { BaseDirectory, documentDir } from "@tauri-apps/api/path";
import { open } from '@tauri-apps/plugin-dialog';
import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

export const settingsFile = "settings.json"

export async function getOpenFilePath() {
    const path = await invoke('get_args')
    console.log(path);
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
    return projects
}