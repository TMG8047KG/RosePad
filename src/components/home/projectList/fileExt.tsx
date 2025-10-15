import style from '../../../styles/components/home/projectList/fileExt.module.css'

export type extType = 'rpad' | 'txt' | 'doc' | 'pdf'

export const FileExt = ({ type }: {type:extType}) => {
    return(
        <div className={style[type]}>
            {type}
        </div>
    )
}