import http from "node:http";
import { isMascotState, StatePayload } from "../shared/state";

const MAX_BODY_BYTES = 16 * 1024;

/**
 * Create a loopback-only HTTP server that accepts mascot state updates.
 *
 * Routes:
 *   POST /state   -> body: { state, prompt?, tool? }  (204 on success)
 *   GET  /health  -> 200 "ok"
 *
 * The server binds to 127.0.0.1 so it is never reachable off the machine.
 */
export function createStateServer(
  port: number,
  onState: (payload: StatePayload) => void,
): http.Server {
  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
      return;
    }

    if (req.method !== "POST" || req.url !== "/state") {
      res.writeHead(404);
      res.end();
      return;
    }

    let received = 0;
    const chunks: Buffer[] = [];
    let aborted = false;

    req.on("data", (chunk: Buffer) => {
      received += chunk.length;
      if (received > MAX_BODY_BYTES) {
        aborted = true;
        res.writeHead(413);
        res.end();
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (aborted) return;
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        if (!isMascotState(body.state)) {
          res.writeHead(400, { "content-type": "text/plain" });
          res.end("invalid state");
          return;
        }
        const payload: StatePayload = {
          state: body.state,
          prompt: typeof body.prompt === "string" ? body.prompt : undefined,
          tool: typeof body.tool === "string" ? body.tool : undefined,
        };
        onState(payload);
        res.writeHead(204);
        res.end();
      } catch {
        res.writeHead(400, { "content-type": "text/plain" });
        res.end("invalid json");
      }
    });
  });

  server.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error(`[mascot] state server error:`, err);
  });

  server.listen(port, "127.0.0.1", () => {
    // eslint-disable-next-line no-console
    console.log(`[mascot] listening for state on http://127.0.0.1:${port}/state`);
  });

  return server;
}
