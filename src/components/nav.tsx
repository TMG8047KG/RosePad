import { Window } from '@tauri-apps/api/window';
import './nav.css'
import { invoke } from '@tauri-apps/api/core';

function NavBar() {
    const handleClose = async () => {
        const currentWindow = await Window.getCurrent();
        await invoke("clear_activity")
        currentWindow.close();
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
        <div className="titleBar" data-tauri-drag-region>
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
