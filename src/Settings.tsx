import { BaseDirectory, readTextFile } from '@tauri-apps/plugin-fs';
import './styles/Main.css'
import style from './styles/Settings.module.css'
// import { emit } from '@tauri-apps/api/event';
import { selectDir, settingsFile } from './scripts/projectHandler';
import { useEffect, useState } from 'react';
import NavSettings from './components/navSettings';
import { getVersion } from '@tauri-apps/api/app';

function Settings() {
    const [dir, setDir] = useState("");
    const [version, setVersion] = useState<string>();

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
        const handleVersion = async () => {
            setVersion(`${await getVersion()}`);
        };
        handleVersion();
    }, []);

    const handleDirChange = async () =>{
        const newDir = await selectDir()
        if(newDir) setDir(newDir as string);
    }

    return (
        <main>
            <NavSettings/>
            <div className={style.container}>
                <div>
                    <h3 className={style.heads}>Project Directory</h3>
                    <div className={style.pathInput}>
                        <p>{dir}</p>
                        <button className={style.button} onClick={ () => handleDirChange() }>Select</button>
                    </div>
                </div>
                <div className={style.version}>
                    <h3 className={style.heads}>Version</h3>
                    <p>{ version }</p>
                </div>
            </div>
        </main> 
    )
}

export default Settings;