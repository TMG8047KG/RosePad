import { invoke } from "@tauri-apps/api/core";

export async function rpc_main_menu() {
    await invoke("update_activity", {
      state: "Thinking about project names!",
      details:"In the menu",
      largeImage: "logo",
      largeImageText: "RosePad",
      start: Date.now()
    })
}

export async function rpc_project(name: string, path: string) {
    const spliPath = path.split(".");
    const file_extension = spliPath[spliPath.length-1];
    await invoke("update_activity", {
        state: `Extension: ${file_extension}`,
        details: `Editing ${name}`,
        largeImage: "logo",
        largeImageText: "RosePad",
        start: Date.now()
    })
}