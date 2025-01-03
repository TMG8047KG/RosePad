import { Window } from '@tauri-apps/api/window';
import './nav.css'
import { invoke } from '@tauri-apps/api/core';
import { Menu } from '@tauri-apps/api/menu';
import { getVersion } from '@tauri-apps/api/app';
import { useEffect, useState } from 'react';

import { useLocation } from 'react-router-dom';
import SettingsButton from "./buttonSettings"

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

function NavBar() {
    const [version, setVersion] = useState<string>();

    const handleClose = async () => {
        const currentWindow = await Window.getCurrent();
        currentWindow.close();
        await invoke("clear_activity")
      };
    
      const handleMaximize = async () => {
        const currentWindow = await Window.getCurrent();
        currentWindow.maximize();
      };
    
      const handleMinimize = async () => {
        const currentWindow = await Window.getCurrent();
        currentWindow.minimize();
      };

      useEffect(() => {
            const handleVersion = async () => {
            setVersion(`v${await getVersion()}`);
        };
        handleVersion();
      }, [])
      
      const settings = useLocation().pathname.match("/editor/");
    
    return(
        <div className="titleBar" data-tauri-drag-region onContextMenu={ clickHandler }>
            <div className='logotitle'>
                <img src="/images/rose.svg" className="logo" data-tauri-drag-region/>
                <div className='title' data-tauri-drag-region >RosePad</div>
                <div className='version'>{ version }</div>
                {settings ?  <SettingsButton/> : ""}
            </div>
            <div className='titleBarButtons' data-tauri-drag-region>
                <button onClick={handleMinimize}>
                    <img src="/images/minimize.svg" alt='minimize'/>
                </button>
                <button onClick={handleMaximize}>            
                    <img src="/images/maximize.svg" alt='maximize'/>
                </button>
                <button onClick={handleClose}>            
                    <img src="/images/close.svg" alt='close'/>
                </button>
            </div>
        </div>
    )
}
export default NavBar;
