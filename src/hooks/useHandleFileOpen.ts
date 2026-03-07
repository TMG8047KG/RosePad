import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import { rpc_project } from "../core/discord_rpc";
import { addProject, projectExists, selectDir } from "../core/projectHandler";
import { getWorkspaceRoot } from "../core/cache";
import { useWorkspace } from "../core/workspaceContext";

type OpenProjectEntry = { path: string; name: string };

function deriveName(p: string) {
  const parts = p.split(/[/\\]/g);
  const last = parts[parts.length - 1] || p;
  const dot = last.lastIndexOf(".");
  return dot > 0 ? last.slice(0, dot) : last;
}

function readOpenProjects(): OpenProjectEntry[] {
  try {
    const raw = sessionStorage.getItem("openProjects");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(p => typeof p?.name === "string" && typeof p?.path === "string")
      .map(p => ({ name: p.name, path: p.path }));
  } catch {
    return [];
  }
}

export function useHandleFileOpen() {
  const navigate = useNavigate();
  const { rootPath, setRoot, reindex, applyFsChanges } = useWorkspace();

  const ensureWorkspace = useCallback(async () => {
    if (rootPath) return rootPath
    
    const persisted = await getWorkspaceRoot()
    if (persisted) {
        await setRoot(persisted)
        return persisted
    }
    
    // Try the OS default before bothering the user
    try {
        const defaultPath = await invoke<string | null>('get_default_workspace')
        if (defaultPath) {
            await setRoot(defaultPath)
            return defaultPath
        }
    } catch {}
    
    // Last resort: ask
    const dir = await selectDir()
    if (!dir) throw new Error('No workspace selected')
    await setRoot(dir)
    return dir
}, [rootPath, setRoot])

  const importIntoWorkspace = useCallback(
    async (filePath: string) => {
      const root = await ensureWorkspace();
      const dest = await invoke<string>("import_project", { root, src: filePath });
      return dest;
    },
    [ensureWorkspace]
  );

  const setActiveProject = useCallback((path: string, name: string) => {
    const existing = readOpenProjects().filter(p => p.path !== path);
    const next = [...existing, { path, name }];

    sessionStorage.setItem("openProjects", JSON.stringify(next));
    sessionStorage.setItem("path", path);
    sessionStorage.setItem("projectName", name);
    sessionStorage.setItem("name", name);

    window.dispatchEvent(
      new CustomEvent("rosepad:open-projects-changed", {
        detail: { projects: next, activePath: path, activeName: name },
      })
    );

    return next;
  }, []);

  const handleFileOpen = useCallback(
    async (filePath: string) => {
      if (!filePath) return;

      const insidePath = await importIntoWorkspace(filePath);
      const name = deriveName(insidePath);

      if (!(await projectExists(insidePath))) {
        await addProject(name, insidePath);
      }

      try {
        await applyFsChanges([insidePath]);
      } catch (err) {
        console.error("applyFsChanges failed, falling back to reindex", err);
        await reindex();
      }
      setActiveProject(insidePath, name);
      await rpc_project(name, insidePath);
      navigate(`/editor/${name}`);
    },
    [importIntoWorkspace, reindex, setActiveProject, navigate]
  );

  const processPaths = useCallback(
    async (paths: string[]) => {
      const unique = Array.from(new Set(paths.filter(Boolean)));
      for (const p of unique) {
        try {
          await handleFileOpen(p);
        } catch (err) {
          console.error("failed to open project", p, err);
        }
      }
    },
    [handleFileOpen]
  );

  const listenForExternalOpens = useCallback(() => {
    const unlistenPromise = listen<string[]>("file-open", async (event) => {
      const args = event.payload || [];
      const payload = args.length > 1 ? args.slice(1) : args;
      await processPaths(payload);
      try {
        await invoke<string[]>("take_pending_open_paths");
      } catch {
        // ignore failures while clearing pending queue
      }
    });

    (async () => {
      try {
        const pending = await invoke<string[]>("take_pending_open_paths");
        await processPaths(pending);
      } catch (err) {
        console.error("failed to read pending open paths", err);
      }
    })();

    return () => {
      unlistenPromise.then((f) => f());
    };
  }, [processPaths]);

  return { handleFileOpen, listenForExternalOpens, ensureWorkspace };
}
