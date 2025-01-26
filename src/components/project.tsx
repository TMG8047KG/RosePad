import { useNavigate } from 'react-router-dom'
import style from './project.module.css'
import { deleteProject } from '../scripts/projectHandler';
import { rpc_project } from '../scripts/discord_rpc';


function Project({name, date, path, onDelete }: {name: string; date: string; path: string; onDelete: (name: string) => void;}) {
    const navigator = useNavigate();
    
    const openProject = () =>{
        sessionStorage.setItem("path", path);
        sessionStorage.setItem("projectName", name);
        rpc_project(name, path)
        navigator(`/editor/${name}`)
    }

    const handleDeletion = async (event: { stopPropagation: () => void; }) => {
        event.stopPropagation();
        deleteProject(name);
        onDelete(name);
    };

    return(
        <div className={style.project} onClick={ () => { openProject() }}>
            <h4 className={style.name}>{ name }</h4>
            <div className={style.data}>
                <p className={style.p}><strong>Last Updated:</strong><br></br>{ date }</p>    
                <button className={style.delete} onClick={handleDeletion}>
                    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"/>
                    </svg>
                </button>
            </div>
        </div>
    )
}
export default Project