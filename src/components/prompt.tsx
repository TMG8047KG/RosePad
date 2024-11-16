import React, { useState } from 'react';
import style from './prompt.module.css'; 
import '../styles/Main.css' // Add styles for the modal

interface ProjectNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

const ProjectNameModal: React.FC<ProjectNameModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (name) {
      onSubmit(name);  // Pass the name back to the parent
    } else {
      alert('Project name is required');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={style.modalOverlay}>
      <div className={style.modal}>
        <h2>Enter a project name</h2>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" className={style.input}/>
        <div className={style.modalActions}>
            <button onClick={handleSubmit}>Create</button>
            <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ProjectNameModal;
