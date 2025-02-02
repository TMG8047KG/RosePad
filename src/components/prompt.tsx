import React, { useEffect, useRef, useState } from 'react';
import style from './prompt.module.css'; 
import '../styles/Main.css' // Add styles for the modal
interface ProjectNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

const ProjectNameModal: React.FC<ProjectNameModalProps> = ({ isOpen, onClose, onSubmit }) => {
  let [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = React.useState("");

  const handleSubmit = () => {
    console.log(name);
    if (!name.replace(/[a-zA-Z0-9_-]+/g, '') && name) {
      console.log(name);
      onSubmit(name);
    } else {
      setErrorMessage("A valid name is required! (Allowed symbols a-z,A-Z,0-9 and _-)")
    }
  };


  //TODO: Make the submit thing work
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setName("");
      onClose();
    }
    if(event.key === 'Enter'){
      handleSubmit()
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={style.modalOverlay}>
      <div className={style.modal}>
        <h2>Enter a project name</h2>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" className={style.input} autoFocus/>
        {errorMessage && <div className={style.error}> {errorMessage} </div>}
        <div className={style.modalActions}>
            <button onClick={handleSubmit}>Create</button>
            <button onClick={ () => {onClose(), setErrorMessage("")}}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ProjectNameModal;
