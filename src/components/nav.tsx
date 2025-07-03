import { Window } from '@tauri-apps/api/window';
import './nav.css'
import { invoke } from '@tauri-apps/api/core';
import { Menu } from '@tauri-apps/api/menu';

import { useLocation } from 'react-router-dom';
import SettingsButton from "./buttonSettings"
import { useEffect, useState } from 'react';

interface NavBar{
    isSaved?: boolean;
}

// Menu experiment
const menuPromise = Menu.new({
    id: "test",
    items: [
      { id: "rctx_close", text: "Close", item: 'CloseWindow'},
      { id: "rctx_maximize", text: "Maximize", item: "Maximize" },
      { id: "rctx_minimize", text: "Minimize", item: 'Minimize'},
    ],
});
  
async function clickHandler(event: React.MouseEvent) {
    event.preventDefault();
    const menu = await menuPromise;
    menu.popup();
}

function NavBar({isSaved = false}) {
    const [isHypr, setHyprStatus] = useState<boolean | null>(null);
    const [projectName, setProjectName] = useState(sessionStorage.getItem("projectName"));

    const handleClose = async () => {
        const currentWindow = await Window.getCurrent();
        currentWindow.close();
        await invoke("clear_activity")
    };
    
    const handleMaximize = async () => {
        const currentWindow = await Window.getCurrent();
        console.log(await currentWindow.isMaximized());
        
        if(await currentWindow.isMaximized()){
            currentWindow.unmaximize()
        }else{
            currentWindow.maximize();
        }
    };
    
    const handleMinimize = async () => {
        const currentWindow = await Window.getCurrent();
        currentWindow.minimize();
    };

    useEffect(() => {
        const checkHypr = async () => {
            try {
                const result = await invoke<boolean>('is_hyprland');
                setHyprStatus(result);
            } catch (err) {
                console.error('invoke failed', err);
                setHyprStatus(false);
            }
        }
        checkHypr();
        const handleProjectNameChange = () => {
            setProjectName(sessionStorage.getItem("projectName"));
        }
        window.addEventListener("storage", handleProjectNameChange)
        return () => {
            window.removeEventListener("storage", handleProjectNameChange);
        }
    }, [])

    const inEditor = useLocation().pathname.match("/editor/");
    
    return(
        <div className="titleBar" data-tauri-drag-region onContextMenu={ clickHandler }>
            <div className='logotitle'>
                <img src="/images/rose.svg" className="logo" data-tauri-drag-region/>
                <div className='title' data-tauri-drag-region >RosePad</div>
                
                {inEditor ? <div className='projectName' data-tauri-drag-region>{projectName}</div> : ""}
                {inEditor ? isSaved ? "" : <div className='projectDot' data-tauri-drag-region>•</div> : ""}
            </div>
            <div className='titleBarButtons' data-tauri-drag-region>
                <div className='settings'>
                    {inEditor ?  <SettingsButton/> : ""}
                </div>
                {!isHypr ?
                <>
                <button onClick={handleMinimize}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 10L20 4M14 10H18.5M14 10V5.5M4 4L10 10M10 10V5.5M10 10H5.5M14 14L20 20M14 14V18.5M14 14H18.5M10 14L4 20M10 14H5.5M10 14V18.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button><button onClick={handleMaximize}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 10L20 4M20 4H15.5M20 4V8.5M4 4L10 10M4 4V8.5M4 4H8.5M14 14L20 20M20 20V15.5M20 20H15.5M10 14L4 20M4 20H8.5M4 20L4 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                </> : "" }
                <button onClick={handleClose}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.00386 9.41816C7.61333 9.02763 7.61334 8.39447 8.00386 8.00395C8.39438 7.61342 9.02755 7.61342 9.41807 8.00395L12.0057 10.5916L14.5907 8.00657C14.9813 7.61605 15.6144 7.61605 16.0049 8.00657C16.3955 8.3971 16.3955 9.03026 16.0049 9.42079L13.4199 12.0058L16.0039 14.5897C16.3944 14.9803 16.3944 15.6134 16.0039 16.0039C15.6133 16.3945 14.9802 16.3945 14.5896 16.0039L12.0057 13.42L9.42097 16.0048C9.03045 16.3953 8.39728 16.3953 8.00676 16.0048C7.61624 15.6142 7.61624 14.9811 8.00676 14.5905L10.5915 12.0058L8.00386 9.41816Z" fill="currentColor" />
                        <path d="M23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12ZM3.00683 12C3.00683 16.9668 7.03321 20.9932 12 20.9932C16.9668 20.9932 20.9932 16.9668 20.9932 12C20.9932 7.03321 16.9668 3.00683 12 3.00683C7.03321 3.00683 3.00683 7.03321 3.00683 12Z" fill="currentColor" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
export default NavBar;
