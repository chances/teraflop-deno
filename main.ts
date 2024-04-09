#!/usr/bin/env deno run --unstable-ffi --unstable-webgpu --allow-ffi --allow-read --allow-write --allow-env

import Game, { World } from "./mod.ts";

class App extends Game {
  initialize(world: World) {}
}

// See https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) await new App("WebGPU").run();
