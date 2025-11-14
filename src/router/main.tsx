import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import App from "../Home";
import Editor from "../Editor";
import Settings from "../Settings";
import { WorkspaceProvider } from "../core/workspaceContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WorkspaceProvider>
      <Router>
        <Routes>
          <Route path="/" element={<App/>}/>
          <Route path="/editor/:file" element={<Editor/>}/>
          <Route path="/settings" element={<Settings/>}/>
        </Routes>
      </Router>
    </WorkspaceProvider>
  </React.StrictMode>
);
