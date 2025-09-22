import NavBar from "./components/nav"
import StyleMenu from "./components/stylesMenu"
import './styles/Main.css'
import style from './styles/Editor.module.css'

import { useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import { loadFile, saveProject, updateProjectName, updateProjectPath } from "./scripts/projectHandler"
import { save } from "@tauri-apps/plugin-dialog"
import { type } from "@tauri-apps/plugin-os"

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
  const [hasSpellcheck, setSpellcheck] = useState(true);
  const initalContent = useRef<string>("");

  const getTime = () => {
    let time = localStorage.getItem("autoSaveInterval")
    if(time) return parseInt(time)
    return 2;
  }

  const debouncedAutoSave = useRef(
    debounce(async () => {
      handleSaving()
      
      sessionStorage.setItem("fileStatus", "Saved");
    }, getTime() * 1000)
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
        },
        {
          name: 'RosePad Project',
          extensions: ['rpad']
        },
        {
          name: 'Supported Files',
          extensions: ['txt']
        }
      ],
      defaultPath: oldPath 
    });
    console.log(path);
    
    if(path){
      const extension = path.split(".");
      const pathNoExtension = extension[0].split(/[\\\/]/g);
      let text = "";
      let name = "";
      if(extension[1] == "rpad"){
        text = document.getElementById("editor")?.innerHTML as string;
        name = pathNoExtension[pathNoExtension.length-1];
      }else{
        text = document.getElementById("editor")?.innerText as string;
        name = `${pathNoExtension[pathNoExtension.length-1]}.${extension[1]}`;
      }
      sessionStorage.setItem("path", path);
      sessionStorage.setItem("projectName", name);
      window.dispatchEvent(new Event('storage'));
      await updateProjectPath(oldPath, path);
      await updateProjectName(path, name);
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

  async function loadProject(editorRef: React.RefObject<HTMLDivElement | null>) {
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

    if (editor) {
      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          e.preventDefault();
        }
      };

      const handleStorageChange = () => {
        handleSaving(); 
        localStorage.getItem("Spellcheck") === "true" ? setSpellcheck(true) : setSpellcheck(false);
      }

      editor.addEventListener("keyup", () => {
        handleContentChange();
        handleStyleMenuClose();
      });
      editor.addEventListener("selectstart", () => {
        editor.addEventListener("mouseup", handleStylesMenu);
        handleStyleMenuClose();
      });
      editor.addEventListener("keydown", handleTabKey);
      editor.addEventListener("stylechange", handleContentChange);
      window.addEventListener("paste", debounce(handleContentChange, 1));
      
      window.addEventListener("storage", handleStorageChange);

      return () => {
        editor.removeEventListener("keyup", () => {
          handleContentChange();
          handleStyleMenuClose();
        });
        editor.removeEventListener("selectstart", () => {
          editor.removeEventListener("mouseup", handleStylesMenu);
          handleStyleMenuClose();
        });
        editor.removeEventListener("keydown", handleTabKey);
        editor.removeEventListener("stylechange", handleContentChange);
        window.removeEventListener("paste", debounce(handleContentChange, 1));
        window.removeEventListener("storage", handleStorageChange)
      };
    }
  }, [editorRef]);
  
  return (
    <main>
      {!["android","ios"].includes(type()) ? <NavBar isSaved={isSaved}/> : ""}
      <StyleMenu editor={editorRef}/>
      <div className={style.main}>
        <div className={style.sidebar}>
          <button className={style.button} onClick={ () => navigator('/')}>Back</button>
          <button className={style.button} onClick={ () => handleSaving() }>Save</button>
          <button className={style.button} onClick={ () => handleSavingAs() }>Save as</button>
          <div id="characters" className={style.textData}>Symbols<br></br>{characters}</div>
        </div>
        <div className={style.container}>
          <div id="editor" className={style.editor} contentEditable ref={editorRef} suppressContentEditableWarning spellCheck={hasSpellcheck} tabIndex={-1}></div>
        </div>
      </div>
    </main>
  )
}

export default Editor;