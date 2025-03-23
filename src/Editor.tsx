import NavBar from "./components/nav"
import StyleMenu from "./components/stylesMenu"
import './styles/Main.css'
import style from './styles/Editor.module.css'

import { useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import { loadFile, saveProject, updateProjectPath } from "./scripts/projectHandler"
import { save } from "@tauri-apps/plugin-dialog"

function debounce(func: Function, delay: number) {
  let timeoutId: number | undefined;
  return function(...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

function Editor() {  
  const navigator = useNavigate()
  const editorRef = useRef<HTMLDivElement>(null);
  const [characters, setCharacters] = useState(0);
  const [isSaved, setSaved] = useState(true);
  const initalContent = useRef<string>("");

  const debouncedAutoSave = useRef(
    debounce(async () => {
      handleSaving()
      
      sessionStorage.setItem("fileStatus", "Saved");
    }, 2000)
  ).current;

  const handleContentChange = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText.replace(/\n/g, "");
      const field = document.getElementById("characters");
      if (field) {
        field.innerText = `Symbols\n${text.length}`;
      }

      if(initalContent.current !== editorRef.current.innerHTML){
        sessionStorage.setItem("fileStatus", "Unsaved");
        setSaved(false);
        if(localStorage.getItem("autoSave") === "true") debouncedAutoSave();
      }
    }
  };

  async function handleSaving() {
    let text = document.getElementById("editor")?.innerHTML as string;
    const path = sessionStorage.getItem("path") as string;
    await saveProject(text, path);
    setSaved(true);
  }
  
  async function handleSavingAs() {
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
      const extension = path.split(".");
      let text = "";
      if(extension[1] == "rpad"){
        text = document.getElementById("editor")?.innerHTML as string;
      }else{
        text = document.getElementById("editor")?.innerText as string;
      }
      await updateProjectPath(oldPath, path);
      await saveProject(text, path); 
      setSaved(true);
    } 
  }

  const handleStylesMenu = () => {
    const selection = document.getSelection();
    const range = selection?.getRangeAt(0);
    
    const menu = document.getElementById("styles");
    if(!menu) return;
    if(range && range.toString().length > 0){
      menu.style.display = "flex";

      const rect = range.getBoundingClientRect();
      const box = menu.getBoundingClientRect();
      const vertical = window.innerHeight - rect.bottom < box.height ? rect.bottom-box.height : rect.bottom;
      menu.style.top = `${vertical}px`;
      const horizontal = window.innerWidth - rect.left < box.width ? rect.right-box.width : rect.left;
      menu.style.left = `${horizontal}px`;
    }else{
      menu.style.display = "none";
    }
  }

  const handleStyleMenuClose = () => {
    const menu = document.getElementById("styles");
    if(menu) {
      menu.style.display = "none";
    };
  }

  async function loadProject(editorRef: React.RefObject<HTMLDivElement>) {
    const path = sessionStorage.getItem("path");
    console.log(path);
    if (!path || !editorRef.current) return;
    editorRef.current.innerHTML = await loadFile(path)
    initalContent.current = editorRef.current.innerHTML;
    const text = editorRef.current.innerText.replace(/\n/g, "");
    setCharacters(text.length);
  }
  
  useEffect(() => {
    loadProject(editorRef);
    
    const editor = editorRef.current;

    //TODO: Paste as plain text is not being detected as a change. Needs fixin
    if (editor) {
      editor.addEventListener("keyup", () => {
        handleContentChange();
        handleStyleMenuClose();
      });
      editor.addEventListener("selectstart", () => {
        editor.addEventListener("mouseup", handleStylesMenu);
        handleStyleMenuClose();
      });

      editor.addEventListener("stylechange", handleContentChange);
      
      window.addEventListener("storage", handleSaving);

      return () => {
        editor.removeEventListener("keyup", () => {
          handleContentChange();
          handleStyleMenuClose();
        });
        editor.removeEventListener("selectstart", () => {
          editor.removeEventListener("mouseup", handleStylesMenu);
          handleStyleMenuClose();
        });
        editor.removeEventListener("stylechange", handleContentChange);
        window.removeEventListener("storage", handleSaving)
      };
    }
  }, [editorRef]);
  
  return (
    <main>
      <NavBar isSaved={isSaved}/>
      <StyleMenu editor={editorRef}/>
      <div className={style.main}>
        <div className={style.sidebar}>
          <button className={style.button} onClick={ () => navigator('/')}>Back</button>
          <button className={style.button} onClick={ () => handleSaving() }>Save</button>
          <button className={style.button} onClick={ () => handleSavingAs() }>Save as</button>
          <div id="characters" className={style.textData}>Symbols<br></br>{characters}</div>
        </div>
        <div className={style.container}>
          <div id="editor" className={style.editor} contentEditable ref={editorRef} suppressContentEditableWarning spellCheck="false"></div>
        </div>
      </div>
    </main>
  )
}

export default Editor;