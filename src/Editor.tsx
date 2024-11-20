import NavBar from "./components/nav"
import './styles/Main.css'
import style from './styles/Editor.module.css'

import { useNavigate } from "react-router-dom"
import { useRef } from "react"
import { save } from "./scripts/projectSaving"


async function handleSaving() {
  let text = document.getElementById("editor")?.innerHTML as string;
  let path = window.location.href;
  let page = path.split("/");
  let name = page[page.length-1]
   await save(text, name);
}



function Editor() {
  const navigator = useNavigate()
  const editorRef = useRef<HTMLDivElement>(null);

  const handleFormat = (command: string) => {
    if (editorRef.current) {
      document.execCommand(command, false, '');
    }
  };

  const handleColorChange = (color: string) => {
    if (editorRef.current) {
      document.execCommand('foreColor', false, color);
    }
  };

  
  return (
    <main>
      <NavBar/>
      <div className={style.main}>
        <div className={style.sidebar}>
          <button className={style.button} onClick={ () => navigator('/')}>Back</button>
          <button className={style.button} onClick={ () => handleSaving() }>Save</button>
          <button className={style.button} onClick={() => handleFormat('bold')}>
            <svg aria-hidden="true" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5h4.5a3.5 3.5 0 1 1 0 7H8m0-7v7m0-7H6m2 7h6.5a3.5 3.5 0 1 1 0 7H8m0-7v7m0 0H6"/>
            </svg>
          </button>
          <button className={style.button} onClick={() => handleFormat('italic')}>
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m8.874 19 6.143-14M6 19h6.33m-.66-14H18"/>
            </svg>
          </button>
          <button className={style.button} onClick={() => handleFormat('underline')}>
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M6 19h12M8 5v9a4 4 0 0 0 8 0V5M6 5h4m4 0h4"/>
            </svg>
          </button>
          <button className={style.button} onClick={() => handleFormat('strikeThrough')}>
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 6.2V5h12v1.2M7 19h6m.2-14-1.677 6.523M9.6 19l1.029-4M5 5l6.523 6.523M19 19l-7.477-7.477"/>
            </svg>
          </button>
          <input className={style.color} type="color" onChange={(e) => handleColorChange(e.target.value)} title="Change Text Color"/>
        </div>
        <div id="editor" className={style.editor} contentEditable ref={editorRef} suppressContentEditableWarning>
        </div>
      </div>
    </main>
  )
}

export default Editor;

function useRouter(): { query: any } {
  throw new Error("Function not implemented.")
}
