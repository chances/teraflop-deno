import { html } from "https://deno.land/x/html@v1.2.0/mod.ts";
import * as async from "@std/async";
import { assert } from "@std/assert";
import * as webview from "@webview/webview";
import { SizeHint, Webview } from "@webview/webview";
import * as Wm from "https://win32.deno.dev/0.4.1/UI.WindowsAndMessaging";

if (Deno.build.os === "windows") webview.preload();

const view = new Webview(true);
view.title = "Teraflop Debugger";
const size = { width: 400, height: 225 };
view.size = { ...size, hint: SizeHint.NONE };

if (Deno.build.os === "windows") {
  const window = view.unsafeWindowHandle as Deno.PointerValue;
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

const document = html`
  <style>body { font-family: sans-serif; }</style>
  <body>
    <h1>Hello from deno v${Deno.version.deno}</h1>
    <p><a href="https://deno.land">Deno</a></p>
    <p><a href="https://basecamp.com">Basecamp</a></p>
  </body>
`;
view.navigate(`data:text/html,${encodeURIComponent(document)}`);
view.run();
