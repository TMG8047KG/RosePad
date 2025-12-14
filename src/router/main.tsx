import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import App from "../home";
import Editor from "../editor";
import Settings from "../settings";
import { WorkspaceProvider } from "../core/workspaceContext";
import { useHandleFileOpen } from "../hooks/useHandleFileOpen";

function ExternalOpenListener() {
  const { listenForExternalOpens } = useHandleFileOpen();

  useEffect(() => {
    const cleanup = listenForExternalOpens();
    return () => { cleanup?.(); };
  }, [listenForExternalOpens]);

  return null;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WorkspaceProvider>
      <Router>
        <ExternalOpenListener/>
        <Routes>
          <Route path="/" element={<App/>}/>
          <Route path="/editor/:file" element={<Editor/>}/>
          <Route path="/settings" element={<Settings/>}/>
        </Routes>
      </Router>
    </WorkspaceProvider>
  </React.StrictMode>
);
