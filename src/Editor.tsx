import NavBar from "./components/nav"
import './styles/Main.css'
import styles from './styles/Editor.module.css'

import { useNavigate } from "react-router-dom"
import { useEffect, useRef } from "react"
import { loadFile, saveProject } from "./scripts/projectHandler"

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

function Editor() {  
  const navigator = useNavigate()
  const editorRef = useRef<HTMLDivElement>(null);


  //TODO: Fix this shit and make it work :3

  const handleStyle = (styleC: string, value: string) =>{
    const selection = window.getSelection();
    if(!selection || selection.rangeCount === 0){ return; }
    const range = selection.getRangeAt(0);

    console.log(selection.anchorNode);
    console.log(selection.anchorOffset);
    
    
    //gets all of the selected shitnodes
    const walk = document.createTreeWalker(
      selection.anchorNode?.parentNode as Node,
      NodeFilter.SHOW_ELEMENT
    )

    let currentNode;
    
    while((currentNode = walk.nextNode())){
      console.log(currentNode);
      // console.log(currentNode.childNodes);
      if(currentNode instanceof Element && currentNode.textContent){
        const style = window.getComputedStyle(currentNode)
        console.log(style.getPropertyValue(styleC));
        if(style.getPropertyValue(styleC) == value){
          //This makes me cry and sob aggressively (It also removes the node by moving everything outside of it and commiting suicide)

        

          return;
        }
      }
    }

    // let parentNode = selection.anchorNode?.parentElement;
    // console.log(parentNode);

    // if(parentNode instanceof HTMLSpanElement && parentNode.textContent){
    //   console.log("element");
    //   const style = window.getComputedStyle(parentNode)
    //     console.log(style.getPropertyValue(styleC));
    //     if(style.getPropertyValue(styleC) == value){
    //       const parent = parentNode.parentNode;
          
    //       //split node

    //       const contentBefore = document.createTextNode(
    //         parentNode.textContent.slice(0, range.startOffset)
    //       );
    //       const selectedContent = document.createTextNode(
    //         parentNode.textContent.slice(range.startOffset, range.endOffset)
    //       );
    //       const contentAfter = document.createTextNode(
    //         parentNode.textContent.slice(range.endOffset)
    //       );

    //       console.log(contentBefore);
    //       console.log(selectedContent);
    //       console.log(contentAfter);
    
    //       const beforeSplit = parentNode.cloneNode(false);
    //       const afterSplit = parentNode.cloneNode(false);
    //       beforeSplit.appendChild(contentBefore);
    //       afterSplit.appendChild(contentAfter);

    //       // Insert the nodes
    //       parent?.insertBefore(beforeSplit, parentNode);
    //       parent?.insertBefore(selectedContent, parentNode);
    //       parent?.insertBefore(afterSplit, parentNode);

    //       // Remove the original node
    //       parent?.removeChild(parentNode)

    //       return;
    //     }
    //   }
    //This shit aint doing what I want ;(

    //checks all of the nodes for a specific style (aka the thing from the button)
  }

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

  const handleContentChange = () => {
    if (editorRef.current) {
    const text = editorRef.current.innerText.replace(/\n/g, "");
    const field = document.getElementById("characters");
    if (field) {
      field.innerText = `Symbols\n${text.length}`;
    }
  }
  };

  useEffect(() => {
    loadProject(editorRef);

    if (editorRef.current) {
      const editor = editorRef.current;

      editor.addEventListener("keyup", handleContentChange);

      return () => {
        editor.removeEventListener("keyup", handleContentChange);
      };
    }
  }, [editorRef]);
  
  return (
    <main>
      <NavBar/>
      <div className={styles.main}>
        <div className={styles.sidebar}>
          <button className={styles.button} onClick={ () => navigator('/')}>Back</button>
          <button className={styles.button} onClick={ () => handleSaving() }>Save</button>
          <button className={styles.button} onClick={ () => handleStyle("color", "red") }>Test</button>
          <button className={styles.button} onClick={() => handleFormat('bold')}>
            <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5h4.5a3.5 3.5 0 1 1 0 7H8m0-7v7m0-7H6m2 7h6.5a3.5 3.5 0 1 1 0 7H8m0-7v7m0 0H6"/>
            </svg>
          </button>
          <button className={styles.button} onClick={() => handleFormat('italic')}>
            <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m8.874 19 6.143-14M6 19h6.33m-.66-14H18"/>
            </svg>
          </button>
          <button className={styles.button} onClick={() => handleFormat('underline')}>
            <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M6 19h12M8 5v9a4 4 0 0 0 8 0V5M6 5h4m4 0h4"/>
            </svg>
          </button>
          <button className={styles.button} onClick={() => handleFormat('strikeThrough')}>
            <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 6.2V5h12v1.2M7 19h6m.2-14-1.677 6.523M9.6 19l1.029-4M5 5l6.523 6.523M19 19l-7.477-7.477"/>
            </svg>
          </button>
          <input className={styles.color} type="color" onChange={(e) => handleColorChange(e.target.value)} title="Change Text Color"/>
          <div id="characters" className={styles.textData}>
            Symbols<br></br>0
          </div>
        </div>
        <div id="editor" className={styles.editor} contentEditable ref={editorRef} suppressContentEditableWarning spellCheck="false">
        </div>
      </div>
    </main>
  )
}

export default Editor;
