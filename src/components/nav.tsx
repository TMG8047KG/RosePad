import { Window } from '@tauri-apps/api/window';
import style from '../styles/components/home/nav.module.css';
import { invoke } from '@tauri-apps/api/core';
import { Menu } from '@tauri-apps/api/menu';
import { useLocation } from 'react-router-dom';
import SettingsButton from "./settings/buttonSettings"
import { useLayoutEffect, useState } from 'react';
import InfoButton from './editor/projectInfo';

interface NavBarProps{
    isSaved?: boolean;
    onBack?: () => void;
    onSave?: () => void;
    onSaveAs?: () => void;
    characters?: number;
    words?: number;
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
    try {
        const menu = await menuPromise;
        menu.popup();
    } catch (err) {
        console.error('menu popup failed', err);
    }
}

function NavBar({isSaved = false, onBack, onSave, onSaveAs, characters = 0, words = 0}: NavBarProps) {
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

    useLayoutEffect(() => {
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
        window.addEventListener("focus", handleProjectNameChange)
        return () => {
            window.removeEventListener("storage", handleProjectNameChange);
            window.removeEventListener("focus", handleProjectNameChange);
        }
    }, [])

    const inEditor = useLocation().pathname.match("/editor/");
    
    return(
        <div className={style.titleBar} data-tauri-drag-region onContextMenu={ clickHandler }>
            <div className={style.logotitle}>
                
                {onBack ? <button className={style.backButton} data-tauri-drag-region="false" onClick={onBack}>
                    <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12l4-4m-4 4 4 4"/>
                    </svg>
                </button> : ""}
                <img src="/images/rose.svg" className={style.logo} data-tauri-drag-region/>
                {inEditor ? <div className={style.projectName} data-tauri-drag-region>{projectName}</div> : ""}
                {inEditor ? isSaved ? "" : <div className={style.projectDot} data-tauri-drag-region>•</div> : ""}
            </div>
            <div className={style.titleBarButtons} data-tauri-drag-region>
                {inEditor && (onSave || onSaveAs) ? (
                        <div className={style.fileActions}>
                            {onSave ? <button className={style.button} data-tauri-drag-region="false" onClick={onSave}>
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 5.75C3 4.23122 4.23122 3 5.75 3H15.7145C16.5764 3 17.4031 3.34241 18.0126 3.9519L20.0481 5.98744C20.6576 6.59693 21 7.42358 21 8.28553V18.25C21 19.7688 19.7688 21 18.25 21H5.75C4.23122 21 3 19.7688 3 18.25V5.75ZM5.75 4.5C5.05964 4.5 4.5 5.05964 4.5 5.75V18.25C4.5 18.9404 5.05964 19.5 5.75 19.5H6V14.25C6 13.0074 7.00736 12 8.25 12H15.75C16.9926 12 18 13.0074 18 14.25V19.5H18.25C18.9404 19.5 19.5 18.9404 19.5 18.25V8.28553C19.5 7.8214 19.3156 7.37629 18.9874 7.0481L16.9519 5.01256C16.6918 4.75246 16.3582 4.58269 16 4.52344V7.25C16 8.49264 14.9926 9.5 13.75 9.5H9.25C8.00736 9.5 7 8.49264 7 7.25V4.5H5.75ZM16.5 19.5V14.25C16.5 13.8358 16.1642 13.5 15.75 13.5H8.25C7.83579 13.5 7.5 13.8358 7.5 14.25V19.5H16.5ZM8.5 4.5V7.25C8.5 7.66421 8.83579 8 9.25 8H13.75C14.1642 8 14.5 7.66421 14.5 7.25V4.5H8.5Z" fill="currentColor"></path>
                                </svg>
                            </button> : ""}
                            {onSaveAs ? <button className={style.button} data-tauri-drag-region="false" onClick={onSaveAs}>
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5.75 3C4.23122 3 3 4.23122 3 5.75V18.25C3 19.7688 4.23122 21 5.75 21H9.99852C9.99129 20.8075 10.011 20.6088 10.0613 20.4075L10.2882 19.5H7.5V14.25C7.5 13.8358 7.83579 13.5 8.25 13.5H14.8531L16.2883 12.0648C16.1158 12.0225 15.9355 12 15.75 12H8.25C7.00736 12 6 13.0074 6 14.25V19.5H5.75C5.05964 19.5 4.5 18.9404 4.5 18.25V5.75C4.5 5.05964 5.05964 4.5 5.75 4.5H7V7.25C7 8.49264 8.00736 9.5 9.25 9.5H13.75C14.9926 9.5 16 8.49264 16 7.25V4.52344C16.3582 4.58269 16.6918 4.75246 16.9519 5.01256L18.9874 7.0481C19.3156 7.37629 19.5 7.8214 19.5 8.28553V10.007C19.5709 10.0024 19.642 10 19.713 10H19.7151C20.1521 10.0002 20.59 10.0874 21 10.2615V8.28553C21 7.42358 20.6576 6.59693 20.0481 5.98744L18.0126 3.9519C17.4031 3.34241 16.5764 3 15.7145 3H5.75ZM8.5 7.25V4.5H14.5V7.25C14.5 7.66421 14.1642 8 13.75 8H9.25C8.83579 8 8.5 7.66421 8.5 7.25Z" fill="currentColor"></path>
                                    <path d="M19.7152 11H19.7131C19.1285 11.0003 18.5439 11.2234 18.0979 11.6695L12.1955 17.5719C11.8513 17.916 11.6072 18.3472 11.4892 18.8194L11.0315 20.6501C10.8325 21.4462 11.5536 22.1674 12.3497 21.9683L14.1804 21.5106C14.6526 21.3926 15.0838 21.1485 15.4279 20.8043L21.3303 14.9019C22.223 14.0093 22.223 12.5621 21.3303 11.6695C20.8843 11.2234 20.2998 11.0003 19.7152 11Z" fill="currentColor"></path>
                                </svg>
                            </button> : ""}
                        </div>
                ) : ""}
                {inEditor ? <div className={style.misc}>
                    <SettingsButton/> 
                    <InfoButton characters={characters} words={words}/>
                </div>: ""}
                {isHypr === false && (<>
                <button className={style.button} data-tauri-drag-region="false" onClick={handleMinimize}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 10L20 4M14 10H18.5M14 10V5.5M4 4L10 10M10 10V5.5M10 10H5.5M14 14L20 20M14 14V18.5M14 14H18.5M10 14L4 20M10 14H5.5M10 14V18.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <button className={style.button} data-tauri-drag-region="false" onClick={handleMaximize}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 10L20 4M20 4H15.5M20 4V8.5M4 4L10 10M4 4V8.5M4 4H8.5M14 14L20 20M20 20V15.5M20 20H15.5M10 14L4 20M4 20H8.5M4 20L4 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button></>)}
                <button className={style.button} data-tauri-drag-region="false" onClick={handleClose}>
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

