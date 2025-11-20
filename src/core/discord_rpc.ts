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

export async function rpc_project(name: string, path: string) {
  const spliPath = path.split(".");
  const file_extension = spliPath[spliPath.length - 1];
  await pushActivity({
    state: `Extension: ${file_extension}`,
    details: `Editing ${name}`,
    largeImage: "logo",
    largeImageText: "RosePad",
    start: Date.now(),
  });
}
