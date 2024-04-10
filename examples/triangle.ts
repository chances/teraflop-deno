#!/usr/bin/env deno run --unstable-ffi --unstable-webgpu --allow-ffi --allow-read --allow-write --allow-env

import { vec3 } from "npm:wgpu-matrix@2.8.0"

import Game, { Color, Input, Material, No, Shader, VertexPosColor, World } from "../mod.ts";

class App extends Game {
  initialize(world: World) {
    const input = world.resources.get<Input>();
    input.map.bind("exit").keyboardPressed(KeyboardKey.escape);

    const shaders = [
      new Shader(ShaderStage.vertex, import("assets/shaders/triangle.wgsl")),
      new Shader(ShaderStage.fragment, import("assets/shaders/triangle.wgsl"))
    ];

    world.spawn(new Material(shaders, No.depthTest), new Mesh<VertexPosColor>([
      new VertexPosColor([0.0, -0.5, 0], Color.red),
      new VertexPosColor([0.5, 0.5, 0], Color.green),
      new VertexPosColor([-0.5, 0.5, 0], Color.blue),
    ], [0, 1, 2]));
  }
}

// See https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) await new App("WebGPU").run();
