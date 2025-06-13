#!/usr/bin/env deno run --unstable-ffi --unstable-webgpu --allow-ffi --allow-import=deno.land:443,jsr.io:443,glfw-binaries.deno.dev:443 --allow-read --allow-write --allow-env
import { assert } from "jsr:@std/assert";
import * as path from "https://deno.land/std@0.207.0/path/mod.ts";

import Game, {
  Color,
  Input,
  KeyboardKey,
  Material,
  Mesh,
  No,
  Shader,
  ShaderStage,
  ValidationError,
  VertexPosColor,
  World,
} from "../mod.ts";

ValidationError.abortOnInstantiation = true;

class App extends Game {
  async initialize(world: World) {
    const input = world.resources.get(Input);
    input?.map.bind("exit").keyboardPressed(KeyboardKey.escape);

    const triangleShader = await Deno.readTextFile(path.join(import.meta.dirname ?? Deno.cwd(), "triangle.wgsl"));
    const shaders = [
      new Shader(ShaderStage.vertex, "vs", triangleShader),
      new Shader(ShaderStage.fragment, "fs", triangleShader),
    ];

    const triangle = new Mesh<VertexPosColor>([
      new VertexPosColor([0.0, -0.5, 0], Color.red),
      new VertexPosColor([0.5, 0.5, 0], Color.green),
      new VertexPosColor([-0.5, 0.5, 0], Color.blue),
    ]);
    assert(triangle.isIndexed === false, "Mesh is indexed!");
    world.spawn(new Material(shaders, No.depthTest), triangle);
  }
}

// See https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) new App("WebGPU Triangle").run();
