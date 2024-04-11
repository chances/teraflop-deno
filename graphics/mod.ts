import { Component, constantProperty, privateProperty, StorableAsComponent } from "../mod.ts";

/** A graphics resource with data to initialize in GPU memory. */
export interface Resource {
  initialized: boolean;
  initialize(adapter: GPUAdapter, device: GPUDevice): void;
}

/**
 * Decorates a class as a GPU resource.
 * @see `Resource`
 **/
export function resource() {
  // deno-lint-ignore ban-types, no-explicit-any
  return function (constructor: Function, _: any) {
    Object.defineProperty(constructor.prototype, "isResource", constantProperty(true));
    Object.defineProperty(constructor.prototype, "_initialized", privateProperty());
  }
}

/**
 * @returns Whether the given component is a GPU resource.
 * @see `Resource`
 * @see `resource` class decorator.
 **/
export function isResource(component: StorableAsComponent): boolean {
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
export @resource() class Shader extends Component implements Resource {
  private _module: GPUShaderModule | null = null;

  constructor(readonly stage: ShaderStage, readonly source: string, readonly label?: string) {
    super();
  }

  get initialized(): boolean {
    return isInitialized(this);
  }

  get module() {
    return this._module;
  }

  initialize(_adapter: GPUAdapter, device: GPUDevice): void {
    this._module = device.createShaderModule({
      code: this.source,
      label: this.label
    });
    markInitialized(this);
  }
}

export @resource() class Material extends Component implements Resource {
  constructor(readonly shaders: Shader[], readonly depthTest: boolean) {
    super();
  }

  get initialized(): boolean {
    return isInitialized(this);
  }

  initialize(adapter: GPUAdapter, device: GPUDevice): void {
    this.shaders.forEach(shader => shader.initialize(adapter, device));
    markInitialized(this);
  }
}

export type Position = [number, number] | [number, number, number];

/** Vertex attributes. */
abstract class Vertex {}

/** Vertex attributes representing a colored point in 2D or 3D space. */
export class VertexPosColor extends Vertex {
  constructor(readonly position: Position, readonly color: Color) {
    super();
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
}

export class Mesh<T extends Vertex> extends Component {
  constructor(readonly vertices: T[], readonly indices: number[]) {
    super();
  }
}

export class Color {
  constructor(readonly r = 0, readonly g = 0, readonly b = 0, readonly a = 1) {}

  static rgb(r: number, g: number, b: number): Color {
    return new Color(r / 255, g / 255, b / 255);
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
  static get cornflowerBlue() {
    return Color.rgb(100, 149, 237);
  }
}
