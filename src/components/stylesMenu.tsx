import React, { RefObject, useState, useEffect } from "react";
import style from './styles/stylesMenu.module.css'

interface styleMenuProps {
    editor: RefObject<HTMLDivElement>
}

const StyleMenu: React.FC<styleMenuProps> = ({ editor }) => {
    const [activeFormats, setActiveFormats] = useState({
        bold: false,
        italic: false,
        underline: false,
        strikeThrough: false
    });

    const handleFormat = (command: string) => {
        if (editor.current) {
            document.execCommand(command, false, '');
            
            setActiveFormats(prev => ({
                ...prev,
                [command]: !prev[command as keyof typeof prev]
            }));
            
            notifyChange();
        }
    };

    const handleColorChange = (color: string) => {
        if (editor.current) {
            document.execCommand('foreColor', false, color);
            notifyChange();
        }
    };

    const applyHeading = (level: string) => {
        if (editor.current) {
            document.execCommand('formatBlock', false, level);
            notifyChange();
        }
    };
    
    const handleAlignment = (alignment: string) => {
        if (editor.current) {
            document.execCommand(alignment, false, '');
            
            setActiveFormats(prev => ({
                ...prev,
                alignment
            }));
            
            notifyChange();
        }
    };

    const handleFontSize = (size: string) => {
        if (editor.current) {
            document.execCommand('fontSize', false, size);
            notifyChange();
        }
    };

    const notifyChange = () => {
        const event = new Event('stylechange');
        editor.current?.dispatchEvent(event);
    };

    useEffect(() => {
        const checkActiveFormats = () => {
            if (editor.current) {
                setActiveFormats({
                    bold: document.queryCommandState('bold'),
                    italic: document.queryCommandState('italic'),
                    underline: document.queryCommandState('underline'),
                    strikeThrough: document.queryCommandState('strikeThrough')
                });
            }
        };
        document.addEventListener('selectionchange', checkActiveFormats);

        checkActiveFormats();

        return () => {
            document.removeEventListener('selectionchange', checkActiveFormats);
        };
    }, [editor]);

    return(
        <div className={style.box} id="styles">
          <div className={style.top}>
            <div className={style.styles}>
              <button className={`${style.button} ${activeFormats.bold ? style.active : ''}`} onClick={() => handleFormat('bold')}>
                <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5h4.5a3.5 3.5 0 1 1 0 7H8m0-7v7m0-7H6m2 7h6.5a3.5 3.5 0 1 1 0 7H8m0-7v7m0 0H6"/>
                </svg>
              </button>
              <button className={`${style.button} ${activeFormats.italic ? style.active : ''}`} onClick={() => handleFormat('italic')}>
                <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m8.874 19 6.143-14M6 19h6.33m-.66-14H18"/>
                </svg>
              </button>
              <button 
                className={`${style.button} ${activeFormats.underline ? style.active : ''}`} onClick={() => handleFormat('underline')}>
                <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M6 19h12M8 5v9a4 4 0 0 0 8 0V5M6 5h4m4 0h4"/>
                </svg>
              </button>
              <button className={`${style.button} ${activeFormats.strikeThrough ? style.active : ''}`} onClick={() => handleFormat('strikeThrough')}>
                <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 6.2V5h12v1.2M7 19h6m.2-14-1.677 6.523M9.6 19l1.029-4M5 5l6.523 6.523M19 19l-7.477-7.477"/>
                </svg>
              </button>
            </div>
            <div className={style.alignments}>
              <button className={style.button} onClick={() => handleAlignment('justifyLeft')} title="Align Left">
                <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16M4 9h8M4 13h16M4 17h8"/>
                </svg>
              </button>
              <button className={style.button} onClick={() => handleAlignment('justifyCenter')} title="Align Center">
                <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16M8 9h8M4 13h16M8 17h8"/>
                </svg>
              </button>
              <button className={style.button} onClick={() => handleAlignment('justifyRight')} title="Align Right">
                <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16M12 9h8M4 13h16M12 17h8"/>
                </svg>
              </button>
              <button className={style.button} onClick={() => handleAlignment('justifyFull')} title="Justify">
                <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16M4 9h16M4 13h16M4 17h16"/>
                </svg>
              </button>
            </div>
          </div>
          <div className={style.divider}></div>
          <div className={style.bottom}>
            <select className={style.headers} onChange={(e) => applyHeading(e.target.value)} defaultValue="p">
              <option value="" disabled>Headers</option>
              <option value="h1">H1</option>
              <option value="h2">H2</option>
              <option value="h3">H3</option>
              <option value="h4">H4</option>
              <option value="p">P</option>
            </select>
            <select className={style.fontSizes} onChange={(e) => handleFontSize(e.target.value)} defaultValue="3">
              <option value="" disabled>Size</option>
              <option value="1">8pt</option>
              <option value="2">10pt</option>
              <option value="3">12pt</option>
              <option value="4">14pt</option>
              <option value="5">18pt</option>
              <option value="6">24pt</option>
              <option value="7">36pt</option>
            </select>
            <input className={style.color} type="color" onChange={(e) => handleColorChange(e.target.value)} title="Change Text Color"/>
          </div>
        </div>
    )
}

export default StyleMenu;