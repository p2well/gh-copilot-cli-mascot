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
  /** Glide the mascot window out-and-back (animation runs in the main process). */
  travel(peakX: number, peakY: number, durationMs: number): void {
    ipcRenderer.send("mascot:travel", peakX, peakY, durationMs);
  },
  /** Cancel an in-flight glide and snap the window home. */
  travelCancel(): void {
    ipcRenderer.send("mascot:travelCancel");
  },
});
