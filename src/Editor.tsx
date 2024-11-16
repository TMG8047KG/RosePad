import NavBar from "./components/nav"
import './styles/Main.css'
import style from './styles/Editor.module.css'

import { useNavigate } from "react-router-dom"

function Editor() {
  const navigator = useNavigate()
  return (
    <main>
      <NavBar/>
      <div className={style.main}>
        <div className={style.sidebar}>
          <button className={style.button} onClick={ () => navigator('/')}>Back</button>
          <button className={style.button}>Save</button>
          <button className={style.button}>Bold</button>
          <button className={style.button}>Italic</button>
        </div>
        <div className={style.editor} contentEditable suppressContentEditableWarning>
        </div>
      </div>
    </main>
  )
}

export default Editor;