/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />
import * as fs from "@std/fs";
import * as path from "@std/path";

import { html } from "https://deno.land/x/html@v1.2.0/mod.ts";
import { try_files } from "https://deno.land/x/try_files/mod.ts";

const location = new URL(import.meta.url);
const decoder = new TextDecoder("utf-8");

// TODO: Pick a unique port for Teraflop
export const port = 8080;

self.onmessage = (e: MessageEvent) => {
  console.log(e.data);
};

const publicPath = import.meta.resolve("./public");
const appJsPath = path.join(publicPath, "app.js");
// decoder.decode(await Deno.readFile(appJsPath))

// TODO: Server-side SSR with state management, i.e. mobx
const document = html`
<style>body { font-family: sans-serif; }</style>
<body>
  <h1>Hello from deno v${Deno.version.deno}</h1>
  <p><a href="https://deno.land">Deno</a></p>
  <p><a href="https://basecamp.com">Basecamp</a></p>
</body>
<script type="text/javascript" src="http://localhost:${port}/app.js"></script>
`;

try_files(async function(request) {
  let { pathname } = new URL(request.url);

  if (pathname === '/') return new Response(document, {
    headers: {
      "Content-Type": "text/html"
    }
  });
  return new Response(`File not found: ${new URL(request.url).pathname}` ,{status:404});
}, {
  port,
  filesDir: path.join(import.meta.dirname ?? Deno.cwd(), "public"),
  // index: 'index.html',
  corsMatch: '*', //undefined|'*'|RegExp
  memoryCache: true,
  // byteRangeChunk: 1024 * 256,
  // Fires after SIGINT but before `server.close()`.
  async beforeClose() {
    // TODO: Kill child processes
    postMessage({ event: "server-stopped" });
    self.close();
  },
});
