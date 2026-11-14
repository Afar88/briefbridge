import http from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = await realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const port = Number(process.env.PORT || 8080);
const mime = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".md":"text/markdown; charset=utf-8",".txt":"text/plain; charset=utf-8"};
const publicFiles = new Set(["/agent-manifest.json","/briefbridge_network.network.json","/links.json","/agent-mcp.json","/.well-known/nsdeploy.json","/.well-known/nsdeploy-agent.json"]);
const workerCsp = "default-src 'none'; script-src blob:; connect-src 'none'; worker-src 'none'";

const server = http.createServer(async (req,res) => {
  try {
    if (!["GET","HEAD"].includes(req.method || "")) { res.writeHead(405,{Allow:"GET, HEAD"}); res.end("Method not allowed"); return; }
    const url = new URL(req.url || "/", "http://localhost");
    const decoded = decodeURIComponent(url.pathname);
    const target = path.resolve(root, "." + decoded);
    if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403); res.end("Forbidden"); return; }
    let file = target;
    try { if ((await stat(file)).isDirectory()) file = path.join(file,"index.html"); }
    catch { res.writeHead(404); res.end("Not found"); return; }
    const real = await realpath(file);
    if (real !== root && !real.startsWith(root + path.sep)) { res.writeHead(403); res.end("Forbidden"); return; }
    const body = await readFile(real);
    const headers = {"Content-Type":mime[path.extname(real)] || "application/octet-stream","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
    if (publicFiles.has(decoded)) headers["Access-Control-Allow-Origin"] = "*";
    if (decoded === "/runtime/sandbox-worker.js") headers["Content-Security-Policy"] = workerCsp;
    res.writeHead(200,headers);
    res.end(req.method === "HEAD" ? "" : body);
  } catch (error) { res.writeHead(500); res.end("Server error"); console.error(error); }
});
server.listen(port,"127.0.0.1",()=>console.log(`BriefBridge: http://127.0.0.1:${port}`));
