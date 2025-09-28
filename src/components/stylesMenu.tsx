import React, { RefObject, useState, useEffect } from "react";
import style from '../styles/components/editor/stylesMenu.module.css'
import OptionsPicker from './optionsPicker'

interface styleMenuProps {
  editor: RefObject<HTMLDivElement | null>
}

const StyleMenu: React.FC<styleMenuProps> = ({ editor }) => {
   
    return(
        <div className={style.box} id="styles">
          <div className={style.top}>
            <div className={style.styles}>
              <button className={`${style.button} ${bold ? style.active : ''}`} onClick={() => handleFormat('bold')}>
                <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5h4.5a3.5 3.5 0 1 1 0 7H8m0-7v7m0-7H6m2 7h6.5a3.5 3.5 0 1 1 0 7H8m0-7v7m0 0H6"/>
                </svg>
              </button>
              <button className={`${style.button} ${italic ? style.active : ''}`} onClick={() => handleFormat('italic')}>
                <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m8.874 19 6.143-14M6 19h6.33m-.66-14H18"/>
                </svg>
              </button>
              <button 
                className={`${style.button} ${underline ? style.active : ''}`} onClick={() => handleFormat('underline')}>
                <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M6 19h12M8 5v9a4 4 0 0 0 8 0V5M6 5h4m4 0h4"/>
                </svg>
              </button>
              <button className={`${style.button} ${strikeThrough ? style.active : ''}`} onClick={() => handleFormat('strikeThrough')}>
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
            <OptionsPicker className={style.headers} value={headingValue} options={[{value:'p',label:'P'},{value:'h1',label:'H1'},{value:'h2',label:'H2'},{value:'h3',label:'H3'},{value:'h4',label:'H4'}]} onChange={(v)=>{setHeadingValue(v);applyHeading(v);}} width="2.8rem" />
            <OptionsPicker className={style.fontSizes} value={fontSizeValue} options={[{value:'1',label:'8pt'},{value:'2',label:'10pt'},{value:'3',label:'12pt'},{value:'4',label:'14pt'},{value:'5',label:'18pt'},{value:'6',label:'24pt'},{value:'7',label:'36pt'}]} onChange={(v)=>{setFontSizeValue(v);handleFontSize(v);}} width="3.6rem" />
            <input className={style.color} type="color" onChange={(e) => handleColorChange(e.target.value)} title="Change Text Color"/>
          </div>
        </div>
    )
}

export default StyleMenu;