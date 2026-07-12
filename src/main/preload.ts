import { contextBridge, ipcRenderer } from "electron";

export interface MascotStatePayload {
  state: "idle" | "thinking" | "working" | "done" | "error";
  prompt?: string;
  tool?: string;
}

contextBridge.exposeInMainWorld("mascotApi", {
  onState(callback: (payload: MascotStatePayload) => void): void {
    ipcRenderer.on("mascot:state", (_event, payload: MascotStatePayload) => {
      callback(payload);
    });
  },
});
