/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />
import * as mobx from "mobx";
import * as fs from "@std/fs";
import * as path from "@std/path";

import { html } from "https://deno.land/x/html@v1.2.0/mod.ts";
import { rateLimit, req, res, redirect, serveStatic, setCORS, Context, NextFunc, Server } from "https://deno.land/x/faster/mod.ts";

const location = new URL(import.meta.url);
const decoder = new TextDecoder("utf-8");
const state = mobx.makeAutoObservable({
  title: "Teraflop Debugger",
  location
});

// TODO: Pick a unique port for Teraflop
export const port = 8080;

self.onmessage = (e: MessageEvent) => {
  // Fired after SIGINT but before `server.close()`.
  if (e.data?.event === 'kill') {
    // FIXME: server.close();
    self.close();
  } else console.debug("WebView:", e.data);
  // TODO: SSE for app events?
};

const publicPath = new URL(import.meta.resolve("./public")).pathname;
const appJsPath = path.join(publicPath, "app.js");

// Server-side SSR with state management
function render() {
  return html`
<!-- FIXME: Send title changes back to the webview, i.e. postMessage title-changed -->
<title>${state.title}</title>
<style>body { font-family: sans-serif; }</style>
<body>
  <h1>Hello from deno v${Deno.version.deno}</h1>
  <p><a href="https://deno.land">Deno</a></p>
  <p><a href="https://basecamp.com">Basecamp</a></p>
</body>
<script type="text/javascript" src="http://localhost:${port}/app.js"></script>
  `;
}

// FIXME: mobx.autorun(() => document = render());
function serveIndex() {
  return async (ctx: Context, next: NextFunc) => {
    ctx.res.body = render();
    await next();
  };
}

const server = new Server();
// Error handler
server.use(async (ctx: Context, next: NextFunc) => {
  try {
    await next();
  } catch (err) {
    ctx.res.status = 500;
    console.debug(`${new Date().toISOString()} ${ctx.req.method} ${ctx.res.status} ${ctx.url.toString()}`);
    console.error(err);
  }
});
server.use(rateLimit({
  attempts: 25,
  interval: 10,
  maxTableSize: 100000,
  id: (ctx: Context) => JSON.stringify(ctx.info.remoteAddr),
}));
server.use(async (ctx: Context, next: NextFunc) => {
  await next();
  console.debug(`${new Date().toISOString()} ${ctx.req.method} ${ctx.res.status} ${ctx.url.toString()}`);
});
// TODO: 404, and error handler middleware
// return new Response(`File not found: ${new URL(request.url).pathname}`, {
//   status: 404
// });
server.options('*', setCORS('*'));
server.get('/', res('html'), serveIndex());
server.get('/index.html', res('html'), serveIndex());
// FIXME: server.get("*", serveStatic(publicPath));
server.get('/app.js', res('javascript'), async (ctx, next) => {
  ctx.res.body = decoder.decode(await Deno.readFile(appJsPath));
  await next();
});
// TODO: 404 handler?
// server.use(async (ctx: Context, next: NextFunc) => {
//   await next();
//   console.debug(`${new Date().toISOString()} ${ctx.req.method} ${ctx.res.status} ${ctx.url.toString()}`);
// });

queueMicrotask(() => postMessage({ event: "server-started" }));
await server.listen({ port });
// TODO: Kill child processes
postMessage({ event: "server-stopped" });
