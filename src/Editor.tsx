import NavBar from "./components/nav"
import './styles/Main.css'
import style from './styles/Editor.module.css'

import { useNavigate } from "react-router-dom"
import { useRef } from "react"

function Editor() {
  const navigator = useNavigate()
  const editorRef = useRef<HTMLDivElement | null>(null)

  const toggleStyle = (styleType: string, value: string | null = null) => {
    const selection = document.getSelection()

    // Ensure editorRef is not null and the selection is within the editor
    if (
      editorRef.current &&
      selection &&
      selection.rangeCount > 0 &&
      selection.anchorNode instanceof Node &&
      editorRef.current.contains(selection.anchorNode)
    ) {
      const range = selection.getRangeAt(0)
      const parentElement = range.commonAncestorContainer.parentElement

      if (parentElement && parentElement.style[styleType as any] === value) {
        // If style is already applied, remove it
        parentElement.style[styleType as any] = ""
      } else {
        // Apply the style
        const span = document.createElement("span")
        span.style[styleType as any] = value || (styleType === "fontWeight" ? "bold" : "italic")
        span.appendChild(range.extractContents())
        range.insertNode(span)

        // Adjust selection to span
        selection.removeAllRanges()
        const newRange = document.createRange()
        newRange.selectNodeContents(span)
        selection.addRange(newRange)
      }
    }
  }
  
  return (
    <main>
      <NavBar/>
      <div className={style.main}>
        <div className={style.sidebar}>
          <button className={style.button} onClick={ () => navigator('/')}>Back</button>
          <button className={style.button}>Save</button>
          <button className={style.button} onClick={() => toggleStyle('fontWeight', 'bold')}>Bold</button>
          <button className={style.button} onClick={() => toggleStyle('fontStyle', 'italic')}>Italic</button>
          <button className={style.button} onClick={() => toggleStyle('textDecoration', 'underline')}>Underline</button>
          <button className={style.button} onClick={() => toggleStyle('color', 'red')}>Red Text</button>
          <button className={style.button} onClick={() => toggleStyle('backgroundColor', 'yellow')}>Highlight</button>
          <button className={style.button} onClick={() => toggleStyle('textDecoration', 'line-through')}>Strike-through</button>
        </div>
        <div className={style.editor} contentEditable ref={editorRef} suppressContentEditableWarning>
        </div>
      </div>
    </main>
  )
}

export default Editor;