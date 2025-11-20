import { invoke } from "@tauri-apps/api/core";

const STORAGE_KEY = "discordRichPresence";

export function isRpcEnabled(): boolean {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === null ? true : value === "true";
}

export async function setRpcEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, String(enabled));
  if (!enabled) {
    try {
      await invoke("clear_activity");
    } catch (err) {
      console.error("Failed to clear Discord activity", err);
    }
  }
}

async function pushActivity(payload: Record<string, unknown>) {
  if (!isRpcEnabled()) return;
  try {
    await invoke("update_activity", payload);
  } catch (err) {
    console.error("Failed to update Discord activity", err);
  }
}

export async function rpc_main_menu() {
  await pushActivity({
    state: "Thinking about project names!",
    details: "In the menu",
    largeImage: "logo",
    largeImageText: "RosePad",
    start: Date.now(),
  });
}

export async function rpc_settings() {
  await pushActivity({
    state: "Thinkering with the brain",
    details: "In settings",
    largeImage: "logo",
    largeImageText: "RosePad",
    start: Date.now(),
  });
}

function getCachedProject() {
  const path = sessionStorage.getItem("path");
  if (!path) return null;
  const name =
    sessionStorage.getItem("projectName") ||
    sessionStorage.getItem("name") ||
    "Untitled";
  const charCountRaw = sessionStorage.getItem("characterCount");
  const characterCount =
    charCountRaw && !Number.isNaN(Number(charCountRaw))
      ? Number(charCountRaw)
      : undefined;
  return { name, path, characterCount };
}

export async function rpc_from_last_page() {
  const lastPage = localStorage.getItem("activePage");
  if (lastPage === "editor") {
    const cached = getCachedProject();
    if (cached) {
      await rpc_project(cached.name, cached.path, cached.characterCount);
      return;
    }
  }
  await rpc_main_menu();
}

export async function rpc_project(name: string, path: string, characterCount?: number) {
  const spliPath = path.split(".");
  const file_extension = spliPath[spliPath.length - 1];
  const characterLabel =
    typeof characterCount === "number" ? ` | ${characterCount} chars` : "";
  if (typeof characterCount === "number") {
    sessionStorage.setItem("characterCount", String(characterCount));
  }
  await pushActivity({
    state: `Extension: ${file_extension}`,
    details: `Editing: ${name}${characterLabel}`,
    largeImage: "logo",
    largeImageText: "RosePad",
    start: Date.now(),
  });
}
