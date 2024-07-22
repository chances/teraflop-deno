import { Color, VertexPosColor } from "./mod.ts";

// See: https://github.com/deno-windowing/dwm/blob/main/examples/webgpu-cube.ts#L14
export const cube = [
  new VertexPosColor([1, -1, 1], Color.fuschia),
  new VertexPosColor([-1, -1, 1], Color.blue),
  new VertexPosColor([-1, -1, -1], Color.black),
  new VertexPosColor([1, -1, -1], Color.red),
  new VertexPosColor([1, -1, 1], Color.fuschia),
  new VertexPosColor([-1, -1, -1], Color.black),

  new VertexPosColor([1, 1, 1], Color.white),
  new VertexPosColor([1, -1, 1], Color.fuschia),
  new VertexPosColor([1, -1, -1], Color.red),
  new VertexPosColor([1, 1, -1], Color.yellow),
  new VertexPosColor([1, 1, 1], Color.white),
  new VertexPosColor([1, -1, -1], Color.red),

  new VertexPosColor([-1, 1, 1], Color.cyan),
  new VertexPosColor([1, 1, 1], Color.white),
  new VertexPosColor([1, 1, -1], Color.yellow),
  new VertexPosColor([-1, 1, -1], Color.green),
  new VertexPosColor([-1, 1, 1], Color.cyan),
  new VertexPosColor([1, 1, -1], Color.yellow),

  new VertexPosColor([-1, -1, 1], Color.blue),
  new VertexPosColor([-1, 1, 1], Color.cyan),
  new VertexPosColor([-1, 1, -1], Color.green),
  new VertexPosColor([-1, -1, -1], Color.black),
  new VertexPosColor([-1, -1, 1], Color.blue),
  new VertexPosColor([-1, 1, -1], Color.green),

  new VertexPosColor([1, 1, 1], Color.white),
  new VertexPosColor([-1, 1, 1], Color.cyan),
  new VertexPosColor([-1, -1, 1], Color.blue),
  new VertexPosColor([-1, -1, 1], Color.blue),
  new VertexPosColor([1, -1, 1], Color.fuschia),
  new VertexPosColor([1, 1, 1], Color.white),

  new VertexPosColor([1, -1, -1], Color.red),
  new VertexPosColor([-1, -1, -1], Color.black),
  new VertexPosColor([-1, 1, -1], Color.green),
  new VertexPosColor([1, 1, -1], Color.yellow),
  new VertexPosColor([1, -1, -1], Color.red),
  new VertexPosColor([-1, 1, -1], Color.green),
];

// TODO: https://github.com/toji/webgpu-bundle-culling/blob/main/js/shapes.js
