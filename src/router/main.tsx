import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import App from "../home";
import Editor from "../editor";
import Settings from "../settings";
import { WorkspaceProvider } from "../core/workspaceContext";
import { useHandleFileOpen } from "../hooks/useHandleFileOpen";
import { ToastProvider } from "../core/toast";
import { setTheme } from "@tauri-apps/api/app";
import { applyThemeToDocument } from "../core/cache";
import { listen } from "@tauri-apps/api/event";
import { themes } from "../core/themeManager";
import { SettingsProvider } from "../core/settingsContext";

function ThemeListener() {
  useEffect(() => {
    const unlisten = listen<themes>('theme-changed', (event) => {
      setTheme(event.payload);
      applyThemeToDocument(event.payload);
    });
    return () => { unlisten.then(f => f()); };
  }, []);
  return null;
}

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
    <ToastProvider>
    <SettingsProvider>
    <WorkspaceProvider>
      <Router>
        <ExternalOpenListener/>
        <ThemeListener/>
        <Routes>
          <Route path="/" element={<App/>}/>
          <Route path="/editor/:file" element={<Editor/>}/>
          <Route path="/settings" element={<Settings/>}/>
        </Routes>
      </Router>
    </WorkspaceProvider>
    </SettingsProvider>
    </ToastProvider>
  </React.StrictMode>
);
