import { useNavigate } from 'react-router-dom'
import style from './project.module.css'
import { deleteProject, settingsFile } from '../scripts/projectHandler';
import { rpc_project } from '../scripts/discord_rpc';
import { useState } from 'react';
import { Menu } from '@tauri-apps/api/menu';
import { BaseDirectory, readTextFile, rename, writeTextFile } from '@tauri-apps/plugin-fs';
import Modal from './modal';

function Project({name, date, path, onDelete, onRename }: {name: string; date: string; path: string; onDelete: (name: string) => void; onRename: (name: string, newName: string, newPath: string) => void}) {
    const navigator = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    // const [displayName, setDisplayName] = useState(name);

    const projectOptions = Menu.new({
        id: "projectOptions",
        items: [
          { id: name+"_rename", text: "Rename", action: () => { setIsModalOpen(true) }},
          { id: name+"_delete", text: "Delete", action: () => { handleDeletion() }},
        ],
    });

    const handleOptionsMenu = async (event: {  stopPropagation: () => void; }) => {
        event.stopPropagation();
        const menu = await projectOptions;
        menu.popup();
    }

    const openProject = () =>{
        sessionStorage.setItem("path", path);
        sessionStorage.setItem("projectName", name);
        rpc_project(name, path)
        navigator(`/editor/${name}`)
    }

    const handleRename = async (newName: string) => {
        console.log(newName);
        const raw = await readTextFile(settingsFile, { baseDir: BaseDirectory.AppConfig })
        const data = JSON.parse(raw)
        
        let project = data.projects.find((projectPath: { path: string; }) => projectPath.path === path)
        if(project.name == newName) {
            return setIsModalOpen(false);
        }
        if(data.projects.some((projectName: { name: string; }) => projectName.name === newName)){
            return alert("A project with this name already exists!");  
        }
        const projectPath = project.path;
        const extension = projectPath.split('.');
        const newPath = projectPath.replace(`${project.name}.${extension[1]}`, `${newName}.${extension[1]}`);
        await rename(projectPath, newPath);
        project.path = newPath;
        project.name = newName;
        onRename(name, newName, newPath);
        let updatedData = JSON.stringify(data, null, 2);
        await writeTextFile(settingsFile, updatedData, { baseDir: BaseDirectory.AppConfig });
        setIsModalOpen(false);
    }

    const handleDeletion = () => {
        deleteProject(name);
        onDelete(name);
    };

    return(
        <>
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleRename} text={'New project name'} buttonName={'Rename'} placeholderText={'New project name'} value={name} />
        <div className={style.project} onClick={() => { openProject(); } }>
            <h4 className={style.name}>{name}</h4>
            <div className={style.data}>
                <p className={style.p}><strong>Last Updated:</strong><br></br>{date}</p>
            </div>
            <div className={style.buttons}>
                <button className={style.delete} onClick={handleOptionsMenu}>
                    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" strokeLinecap="round" strokeWidth="4" d="M12 6h.01M12 12h.01M12 18h.01" />
                    </svg>
                </button>
            </div>
        </div>
        </>
    )
}
export default Project