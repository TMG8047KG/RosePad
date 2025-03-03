import React, { useEffect, useRef, useState } from 'react';
import style from './modal.module.css'; 
import '../styles/Main.css' // Add styles for the modal

interface ProjectNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  text: string;
  value: string;
  buttonName: string; 
  placeholderText: string|"";
}

const ProjectNameModal: React.FC<ProjectNameModalProps> = ({ isOpen, onClose, onSubmit, text, value, buttonName, placeholderText }) => {
  let [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = React.useState("");
  const nameRef = useRef('');

  const handleSubmit = () => {
    const currentName = nameRef.current;
    if (!currentName.replace(/[a-zA-Z0-9_-]+/g, '') && currentName) {
      onSubmit(currentName);
      setName('');
    } else {
      setErrorMessage("A valid name is required! (Allowed symbols a-z,A-Z,0-9 and _-)")
    }
  };

  const close = () => {
    setName("");
    setErrorMessage("");
    onClose();
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      close();
    }
    if(event.key === 'Enter'){
      handleSubmit();
    }
  };

  const handleClick  = (event: React.MouseEvent<HTMLDivElement>) => {
    if(event.target === event.currentTarget){
      close();
    }
  }

  useEffect(() => {
    nameRef.current = name;
  })

  useEffect(() => {
    if (!isOpen) return;
    
    setName(value);

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  

  if (!isOpen) return null;

  return (
    <div className={style.modalOverlay} onClick={handleClick}>
      <div className={style.modal}>
        <h2>{text}</h2>
        <input type="text" value={name} onChange={(e) => {setName(e.target.value); nameRef.current = e.target.value;}} placeholder={placeholderText} className={style.input} autoFocus/>
        {errorMessage && <div className={style.error}> {errorMessage} </div>}
        <div className={style.modalActions}>
            <button className={style.button} onClick={handleSubmit}>{buttonName}</button>
            <button className={style.button} onClick={ () => {onClose(), setErrorMessage("")}}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ProjectNameModal;
