import * as async from "@std/async";
import { assert } from "@std/assert";
import * as fs from "@std/fs";
import * as path from "@std/path";
import * as webview from "@webview/webview";
import { SizeHint, Webview } from "@webview/webview";
import * as Wm from "https://win32.deno.dev/0.4.1/UI.WindowsAndMessaging";

const self = new URL(import.meta.url);
const decoder = new TextDecoder("utf-8");

if (Deno.build.os === "windows") webview.preload();

const view = new Webview(true);
const window = view.unsafeWindowHandle as Deno.PointerValue;
view.title = "Teraflop Debugger";
const size = { width: 400, height: 225 };
view.size = { ...size, hint: SizeHint.NONE };

// Move window to the top-left corner
if (Deno.build.os === "osx") {
  // TODO: Move window to the top-left corner. Try https://github.com/fazil47/deno-winit
  // Try https://deno.land/x/deno_bindgen@0.8.1 with the Teraflop platform extensions
} else if (Deno.build.os === "windows") {
  assert(window !== null);
  const windowBounds = new Wm.RECTView(Wm.allocRECT());
  assert(Wm.GetWindowRect(window, windowBounds.buffer));
  Wm.MoveWindow(window, 12, 12, size.width, size.height, true);
}

// FIXME: The tween is broken...
await async.delay(0);
// import RenderLoop, { Tick } from "@chances/render-loop";
// import TWEEN, { Easing, Tween } from "npm:@tweenjs/tween.js";
// await new Promise((resolve) => {
//   const pos = { x: windowBounds.left, y: windowBounds.top };
//   console.debug(pos);
//   const duration = 350;
//   const tween = new Tween(pos).to({ x: 12, y: 12 }, duration)
//     .easing(Easing.Quadratic.Out)
//     .start();
//   const loop = new RenderLoop(60, {
//     tick: (tick: Tick) => tween.update(tick.frameTime.ms),
//     render: () => {
//       Wm.MoveWindow(window, pos.x, pos.y, size.width, size.height, true);
//     },
//   }).start();
//   Promise.all([async.delay(duration).then(() => loop.stop()), loop.finished]).then(resolve);
// });

// import * as util from "https://github.com/DjDeveloperr/deno_win32/raw/0.4.1/util.ts";
// const libSHLWAPI_dll = Deno.dlopen("SHLWAPI.dll", {
//   ShellMessageBoxA: {
//     parameters: ["pointer", "pointer", "buffer", "buffer", "u32"],
//     result: "i32",
//   },
// });
// const result = libSHLWAPI_dll.symbols.ShellMessageBoxA(
//   util.toPointer(null),
//   window,
//   util.pstrToFfi("Hello, world!"),
//   util.pstrToFfi("Hello"),
//   Wm.MB_OK | Wm.MB_ICONINFORMATION | Wm.MB_SYSTEMMODAL,
// );
// assert(result);
// libSHLWAPI_dll.close();
// TODO: Desktop integration with GetThemeSysColor function (uxtheme.h). Seehttps://learn.microsoft.com/en-us/windows/win32/api/uxtheme/nf-uxtheme-getthemesyscolor

// Spawn the web server in a BG worker
// TODO: Pick a unique port for Teraflop
export const port = 8080;
console.debug("Starting debug server...");
const server = new Worker(import.meta.resolve("./server.ts"), { type: "module" });
const killServer = () => {
  server.postMessage({ event: "kill" });
};
Deno.addSignalListener("SIGTERM", killServer);
Deno.addSignalListener("SIGINT", killServer);
server.onmessage = (e: MessageEvent) => {
  if (e.data?.event === 'server-started') {
    // Open web view
    // TODO: Load a data URI with a loading screen
    view.navigate(`http://localhost:${port}`);
    view.run();
    // Debugger has exited
    server.terminate();
  } else if (e.data?.event === 'title-changed') {
    view.title = e.data?.title ?? view.title;
  } else if (e.data?.event === 'server-stopped') {
    view.destroy();
  } else console.debug("Server:", e.data);
};
