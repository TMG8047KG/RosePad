import style from './buttonSettings.module.css'
import { invoke } from '@tauri-apps/api/core';

function settingsButton(){
    const handleSettingsWindow = async () => {
        await invoke("settings")
    }
    
    return(
        <button className={style.settings} onClick={ handleSettingsWindow }>
            <img src="/images/settings.svg" alt='Settings'/>
        </button>
    )
}
export default settingsButton;