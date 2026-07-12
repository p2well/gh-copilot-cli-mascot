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
  /** Move the mascot window by an integer pixel delta (used by idle activities). */
  moveBy(dx: number, dy: number): void {
    ipcRenderer.send("mascot:moveBy", dx, dy);
  },
});
