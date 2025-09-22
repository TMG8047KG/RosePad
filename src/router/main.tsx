import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import App from "../home";
import Editor from "../editor";
import Settings from "../settings";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App/>}/>
        <Route path="/editor/:file" element={<Editor/>}/>
        <Route path="/settings" element={<Settings/>}/>
      </Routes>
    </Router>
  </React.StrictMode>
);
