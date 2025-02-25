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
            </div>
            <div className={style.buttons}>
                <button className={style.delete} onClick={handleDeletion}>
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M8 12C9.10457 12 10 12.8954 10 14C10 15.1046 9.10457 16 8 16C6.89543 16 6 15.1046 6 14C6 12.8954 6.89543 12 8 12Z" fill="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                        <path d="M8 6C9.10457 6 10 6.89543 10 8C10 9.10457 9.10457 10 8 10C6.89543 10 6 9.10457 6 8C6 6.89543 6.89543 6 8 6Z" fill="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                        <path d="M10 2C10 0.89543 9.10457 -4.82823e-08 8 0C6.89543 4.82823e-08 6 0.895431 6 2C6 3.10457 6.89543 4 8 4C9.10457 4 10 3.10457 10 2Z" fill="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                </button>
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