import { Window } from '@tauri-apps/api/window';
import './MainPage.css'


function App() {
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
  return (
    <main>
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
      <div className='container'>
        <div className='infoBox'>
        <h1>RosePad</h1>
        <p>A simple and beatiful way to write notes, letters, poems and such.</p>
      </div>
      <div className='projects'>
        <div>

        </div>
      </div>
      </div>
    </main>
  )
}

export default App;
