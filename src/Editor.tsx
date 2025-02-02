import NavBar from "./components/nav"
import StyleMenu from "./components/stylesMenu"
import './styles/Main.css'
import style from './styles/Editor.module.css'

import { useNavigate } from "react-router-dom"
import { useEffect, useRef } from "react"
import { loadFile, saveProject, updateProjectPath } from "./scripts/projectHandler"
import { save } from "@tauri-apps/plugin-dialog"

async function loadProject(editorRef: React.RefObject<HTMLDivElement>) {
  const path = sessionStorage.getItem("path");
  console.log(path);
  if (!path || !editorRef.current) return;
  editorRef.current.innerHTML = await loadFile(path)
  const text = editorRef.current.innerText.replace(/\n/g, "");
  const field = document.getElementById("characters");
    if (field) {
      field.innerText = `Symbols\n${text.length}`;
    }
}

async function handleSaving() {
  let text = document.getElementById("editor")?.innerHTML as string;
  const path = sessionStorage.getItem("path") as string;
  await saveProject(text, path);
}

async function handleSavingAs() {
  let text = document.getElementById("editor")?.innerHTML as string;
  const oldPath = sessionStorage.getItem("path") as string;
  const path = await save({
    filters: [
      {
        name: 'RosePad Files',
        extensions: ['rpad', 'txt'],
      }
    ],
    defaultPath: oldPath 
  });
  console.log(path);
  
  if(path){
    await updateProjectPath(oldPath, path);
    await saveProject(text, path);  
  } 
}

function Editor() {  
  const navigator = useNavigate()
  const editorRef = useRef<HTMLDivElement>(null);

  const handleContentChange = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText.replace(/\n/g, "");
      const field = document.getElementById("characters");
      if (field) {
        field.innerText = `Symbols\n${text.length}`;
      }
    }
  };

  const handleStylesMenu = () => {
    const selection = document.getSelection();
    const range = selection?.getRangeAt(0);
    
    const menu = document.getElementById("styles");
    if(!menu) return;
    if(range && range.toString().length > 0){
      menu.style.display = "flex";

      const rect = range.getBoundingClientRect();
      const box = menu.getBoundingClientRect();      
      menu.style.top = `${rect.bottom}px`;
      const horizontal = window.innerWidth - rect.left < box.width ? rect.right-box.width : rect.left;
      menu.style.left = `${horizontal}px`;
    }else{
      menu.style.display = "none";
    }
  }

  useEffect(() => {
    loadProject(editorRef);
    
    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener("keyup", handleContentChange);
      editor.addEventListener("selectstart", () => {
        editor.addEventListener("mouseup", handleStylesMenu)
      });
      return () => {
        editor.removeEventListener("keyup", handleContentChange);
      };
    }
  }, [editorRef]);
  
  return (
    <main>
      <NavBar/>
      <StyleMenu editor={editorRef}/>
      <div className={style.main}>
        <div className={style.sidebar}>
          <button className={style.button} onClick={ () => navigator('/')}>Back</button>
          <button className={style.button} onClick={ () => handleSaving() }>Save</button>
          <button className={style.button} onClick={ () => handleSavingAs() }>Save as</button>
          <div id="characters" className={style.textData}>
            Symbols<br></br>0
          </div>
        </div>
        <div className={style.container}>
          <div id="editor" className={style.editor} contentEditable ref={editorRef} suppressContentEditableWarning spellCheck="false"></div>
        </div>
      </div>
    </main>
  )
}

export default Editor;
