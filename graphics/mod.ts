import type { WgslReflect } from "npm:wgsl_reflect";

import { Component, ValidationError, constantProperty, privateProperty } from "../mod.ts";
import { AnyConstructor } from "../utils.ts";

/** A graphics resource with data to initialize in GPU memory. */
export interface Resource {
  initialized: boolean;
  initialize(adapter: GPUAdapter, device: GPUDevice): Promise<void>;
}

/**
 * Decorates a class as a GPU resource.
 * @see `Resource`
 **/
// deno-lint-ignore no-explicit-any
export function resource<T extends AnyConstructor>(constructor: T, _: any) {
  // TODO: Use Symbols for these properties (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol)
  Object.defineProperty(constructor.prototype, "isResource", constantProperty(true));
  Object.defineProperty(constructor.prototype, "_initialized", privateProperty());
}

/**
 * @returns Whether the given component is a GPU resource.
 * @see `Resource`
 * @see `resource` class decorator.
 **/
export function isResource(component: Component): boolean {
  // deno-lint-ignore no-explicit-any
  return (component as any)["isResource"] === true;
}

function isInitialized(component: Resource): boolean {
  // deno-lint-ignore no-explicit-any
  return Object.hasOwn(component, "_initialized") ? (component as any)["_initialized"] === true : false;
}

function markInitialized(component: Resource) {
  // deno-lint-ignore no-explicit-any
  (component as any)["_initialized"] = true;
}

export const enum ShaderStage {
  vertex = "vertex",
  fragment = "fragment",
}

/**
 * A WGSL shader.
 * @see [WebGPU WGSL](https://webgpufundamentals.org/webgpu/lessons/webgpu-wgsl.html) (WebGPU Fundamentals)
 */
export @resource class Shader extends Component implements Resource {
  private _module: GPUShaderModule | null = null;

  constructor(
    readonly stage: ShaderStage,
    readonly entryPoint: string,
    readonly source: string,
    readonly label?: string,
  ) {
    super();
  }

  get module() {
    return this._module;
  }

  get initialized(): boolean {
    return isInitialized(this);
  }

  async initialize(_adapter: GPUAdapter, device: GPUDevice): Promise<void> {
    device.pushErrorScope("validation");
    this._module = device.createShaderModule({
      code: this.source,
      label: this.label
    });
    const err = await device.popErrorScope();
    if (err) throw new ValidationError(err.message, { details: await this.reflect() });
    markInitialized(this);
  }

  /** @returns The result of introspecting this shader source. */
  async reflect(): Promise<WgslReflect> {
    const wgsl = await import("npm:wgsl_reflect");
    return new wgsl.WgslReflect(this.source);
  }
}

export @resource class Texture extends Component implements Resource {
  readonly descriptor: GPUTextureDescriptor;
  private _texture: GPUTexture | null = null;

  // TODO: Add an overload to supply data (See https://jsr.io/@std/webgpu/doc/~/createTextureWithData)
  /** @param usage Bitmask of `GPUTextureUsage`. */
  constructor(format: GPUTextureFormat, size: GPUExtent3D, usage: number) {
    super();
    this.descriptor = {
      format,
      size,
      usage
    };
  }

  get texture() {
    return this._texture;
  }

  get initialized(): boolean {
    return isInitialized(this);
  }

  // deno-lint-ignore require-await
  async initialize(_adapter: GPUAdapter, device: GPUDevice) {
    this._texture = device.createTexture(this.descriptor);
    markInitialized(this);
  }
}

export @resource class Material extends Component implements Resource {
  constructor(readonly shaders: Shader[], readonly depthTest: boolean) {
    super();
  }

  get vertexShader() {
    return this.shaders.find(shader => shader.stage === ShaderStage.vertex);
  }

  get fragmentShader() {
    return this.shaders.find(shader => shader.stage === ShaderStage.fragment);
  }

  get initialized(): boolean {
    return isInitialized(this);
  }

  // deno-lint-ignore require-await
  async initialize(adapter: GPUAdapter, device: GPUDevice) {
    this.shaders.forEach(shader => shader.initialize(adapter, device));
    markInitialized(this);
  }
}

export type Position = [number, number] | [number, number, number];

/** Vertex attributes. */
export abstract class Vertex {
  abstract get vertexLayout(): GPUVertexBufferLayout[];
  /** @returns The size of this vertex, in bytes. */
  abstract get size(): number;
  abstract toArray(): number[];
}

/** Vertex attributes representing a colored point in 2D or 3D space. */
export class VertexPosColor extends Vertex {
  constructor(readonly position: Position, readonly color: Color) {
    super();
  }

  get vertexLayout(): GPUVertexBufferLayout[] {
    return [{
      arrayStride: this.size,
      attributes: [
        { shaderLocation: 0, offset: 0, format: `float32x${this.position.length}` as GPUVertexFormat },
        { shaderLocation: 1, offset: this.position.length * 4, format: "float32x4" },
      ],
      // FIXME: stepMode: "vertex"
    }];
  }

  get size(): number {
    // Four bytes per position and normal vector component
    const posSize = this.position.length * 4;
    return posSize + 16 /* Color: 4 32-bit bytes */;
  }

  toArray(): number[] {
    const color = [this.color.r, this.color.g, this.color.b, this.color.a];
    return this.position.concat(color);
  }
}

/** Vertex attributes representing a colored point in 2D or 3D space, including a normal direction. */
export class VertexPosNormalColor extends Vertex {
  constructor(readonly position: Position, readonly normal: Position, readonly color: Color) {
    super();
    if (position.length !== normal.length) throw new Error(
      "A vertex position and normal must be in the same coordinate space."
    );
  }

  get vertexLayout(): GPUVertexBufferLayout[] {
    return [{
      arrayStride: this.size,
      attributes: [
        { shaderLocation: 0, offset: 0, format: `float32x${this.position.length}` as GPUVertexFormat },
        { shaderLocation: 1, offset: this.position.length * 4, format: `float32x${this.normal.length}` as GPUVertexFormat },
        { shaderLocation: 2, offset: (this.position.length * 4) + (this.normal.length * 4), format: "float32x4" },
      ],
      // FIXME: stepMode: "vertex"
    }];
  }

  get size(): number {
    // Four bytes per position and normal vector component
    const posSize = this.position.length * 4;
    const normalSize = this.normal.length * 4;
    return posSize + normalSize + 16 /* Color: 4 32-bit bytes */;
  }

  toArray(): number[] {
    const color = [this.color.r, this.color.g, this.color.b, this.color.a];
    return this.position.concat(this.normal, color);
  }
}

export @resource class Mesh<T extends Vertex = Vertex> extends Component implements Resource {
  private _vertexBuffer: GPUBuffer | null = null;
  private _indexBuffer: GPUBuffer | null = null;

  constructor(readonly vertices: T[], readonly indices: number[]) {
    if (vertices.length === 0) throw new Error("A mesh must contain vertices.");
    if (indices.length === 0) throw new Error("A mesh must conain vertex indices.");
    super();
  }

  get vertexLayout() {
    return this.vertices[0].vertexLayout;
  }

  get vertexBuffer() {
    return this._vertexBuffer;
  }

  get indexBuffer() {
    return this._indexBuffer;
  }

  get initialized(): boolean {
    return isInitialized(this);
  }

  // deno-lint-ignore require-await
  async initialize(_adapter: GPUAdapter, device: GPUDevice) {
    // Upload vertices to the GPU
    const vertexArrayStride = this.vertices[0].size;
    this._vertexBuffer = device.createBuffer({
      usage: GPUBufferUsage.VERTEX| GPUBufferUsage.COPY_DST,
      size: vertexArrayStride * this.vertices.length,
    });
    const vertexData = new Float32Array(this._vertexBuffer.size);
    this.vertices.forEach((vertex, i) => vertexData.set(vertex.toArray(), i * vertexArrayStride))
    device.queue.writeBuffer(this._vertexBuffer, 0, vertexData);

    // Upload vertex indices to the GPU
    this._indexBuffer = device.createBuffer({
      usage: GPUBufferUsage.INDEX| GPUBufferUsage.COPY_DST,
      size: 4 * this.indices.length,
    })
    // FIXME: Use Float16Array for when it's added to Deno/V8
    const indexData = new Float32Array(this.indices);
    device.queue.writeBuffer(this._indexBuffer, 0, indexData);

    markInitialized(this);
  }
}

export @resource class Pipeline extends Component implements Resource {
  private _pipeline: GPURenderPipeline | null = null;

  constructor(
    readonly material: Material,
    readonly vertexBufferLayout: GPUVertexBufferLayout[],
    readonly targets: GPUColorTargetState[],
    readonly depthFormat?: GPUTextureFormat,
    readonly label?: string,
  ) {
    super();
  }

  get pipeline() {
    return this._pipeline;
  }

  get initialized(): boolean {
    return isInitialized(this);
  }

  async initialize(_adapter: GPUAdapter, device: GPUDevice): Promise<void> {
    const vs = this.material.shaders.find(shader => shader.stage === ShaderStage.vertex)!;
    const fs = this.material.shaders.find(shader => shader.stage === ShaderStage.fragment)!;

    device.pushErrorScope("validation");
    this._pipeline = await device.createRenderPipelineAsync({
      layout: "auto",
      label: this.label,
      primitive: {
        topology: "triangle-list",
        frontFace: "cw",
        cullMode: "back"
      },
      vertex: {
        module: vs.module!,
        entryPoint: vs.entryPoint,
        buffers: this.vertexBufferLayout
      },
      fragment: {
        module: fs.module!,
        entryPoint: fs.entryPoint,
        targets: this.targets
      },
      depthStencil: this.material.depthTest ? {
        depthCompare: "less-equal",
        format: this.depthFormat!,
        depthWriteEnabled: true
      } : undefined
    });
    const err = await device.popErrorScope();
    if (!err) return markInitialized(this);

    const vertexShader: WgslReflect | null = await (
      this.material.vertexShader?.reflect() ?? Promise.resolve(null)
    );
    // TODO: Reflect on the fragment shader with complex pipelines
    console.debug("Expected vertex layout:", vertexShader?.entry.vertex[0].inputs ?? []);
    console.debug("Observed vertex layout:", this.vertexBufferLayout);
    if (ValidationError.abortOnInstantiation) Deno.exit(1);
    throw new ValidationError(`Pipeline: ${err.message}`)
  }

  getBindGroupLayout(index: number) {
    return this._pipeline?.getBindGroupLayout(index) ?? null;
  }
}

export class Color {
  constructor(readonly r = 0, readonly g = 0, readonly b = 0, readonly a = 1) {}

  static rgb(r: number, g: number, b: number): Color {
    return new Color(r / 255, g / 255, b / 255);
  }

  static get black() {
    return new Color();
  }
  static get white() {
    return new Color(1, 1, 1);
  }
  static get red() {
    return new Color(1);
  }
  static get green() {
    return new Color(0, 1);
  }
  static get blue() {
    return new Color(0, 0, 1);
  }
  static get cyan() {
    return new Color(0, 1, 1);
  }
  static get magenta() {
    return new Color(1, 0, 1);
  }
  static get fuschia() {
    return new Color(1, 0, 1);
  }
  static get yellow() {
    return new Color(1, 1);
  }
  static get cornflowerBlue() {
    return Color.rgb(100, 149, 237);
  }
}
