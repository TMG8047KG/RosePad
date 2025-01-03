import { BaseDirectory, readTextFile } from '@tauri-apps/plugin-fs';
import './styles/Main.css'
import style from './styles/Settings.module.css'
// import { emit } from '@tauri-apps/api/event';
import { selectDir, settingsFile } from './scripts/projectHandler';
import { useEffect, useState } from 'react';

function Settings() {
    const [dir, setDir] = useState("");

    // const handleColorChange = (color: string) => {
    //     emit("backgroundColor", color)
    // };

    useEffect(() => {
        const loadDir = async () =>{
            const rawJson = await readTextFile(settingsFile, { baseDir: BaseDirectory.AppConfig });
            let settings = JSON.parse(rawJson);
            setDir(settings.projectPath)
        }
        loadDir();
    }, []);

    const handleDirChange = async () =>{
        const newDir = await selectDir()
        if(newDir) setDir(newDir as string);
    }

    return (
        <main>
            <div className={style.container}>
                <div>
                    <h3 className={style.heads}>Project Directory</h3>
                    <div className={style.pathInput}>
                        <p>{dir}</p>
                        <button className={style.button} onClick={ () => handleDirChange() }>Select</button>
                    </div>
                </div>
            </div>
        </main> 
    )
}

export default Settings;