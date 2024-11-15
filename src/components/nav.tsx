import { Window } from '@tauri-apps/api/window';
import './nav.css'

function NavBar() {
    const handleClose = async () => {
        const currentWindow = await Window.getCurrent();
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
            <img src="/rose.svg" className="logo" data-tauri-drag-region/>
            <div className='title' data-tauri-drag-region >RosePad</div>
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
