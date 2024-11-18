import { useNavigate } from 'react-router-dom'
import style from './project.module.css'

function Project(project:any) {
    const navigator = useNavigate();
    return(
        <button className={style.project} onClick={ () => { navigator(`/editor/${project.name}`) }}>
              <h3>{ project.name }</h3>
              <p>Last Updated: { project.date }</p>
        </button>
    )
}

export default Project