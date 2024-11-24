import { Window } from '@tauri-apps/api/window';
import './nav.css'
import { invoke } from '@tauri-apps/api/core';
import { Menu } from '@tauri-apps/api/menu';


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
    return(
        <div className="titleBar" data-tauri-drag-region onContextMenu={ clickHandler }>
            <div className='logotitle'>
                <img src="/rose.svg" className="logo" data-tauri-drag-region/>
                <div className='title' data-tauri-drag-region >RosePad</div>
            </div>
            <div className='titleBarButtons' data-tauri-drag-region>
                <button onClick={handleMinimize}>
                    <img src="/minimize.svg" alt='minimize'/>
                </button>
                <button onClick={handleMaximize}>            
                    <img src="/maximize.svg" alt='maximize'/>
                </button>
                <button onClick={handleClose}>            
                    <img src="/close.svg" alt='close'/>
                </button>
            </div>
        </div>
    )
}
export default NavBar;
