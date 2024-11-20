import { useNavigate } from 'react-router-dom'
import style from './project.module.css'

function Project(project:any) {
    const navigator = useNavigate();
    
    const openProject = () =>{
        sessionStorage.setItem("name", project.name);
        sessionStorage.setItem("path", project.path);
        navigator(`/editor/${project.name}`)
    }

    return(
        <button className={style.project} onClick={ () => { openProject() }}>
              <h3>{ project.name }</h3>
              <p>Last Updated: { project.date }</p>
        </button>
    )
}
export default Project