import RenderLoop, { RealTimeApp, Tick } from "@chances/render-loop";
import {
  createWindow,
  DwmWindow,
  getPrimaryMonitor,
  pollEvents,
} from "https://deno.land/x/dwm@0.3.6/mod.ts";

import { Input } from "./input/mod.ts";
export * from "./input/mod.ts";
import { Entity, Filter, RunnableAsSystem, System, query, World } from "./ecs/mod.ts";
export * from "./ecs/mod.ts";
import * as graphics from "./graphics/mod.ts";
import { Color, isResource, Material, Pipeline, Resource } from "./graphics/mod.ts";
import { ComponentOf } from "./ecs/mod.ts";
import { Mesh } from "./graphics/mod.ts";
export type Position = graphics.Position;
export {
  Color,
  Material,
  Mesh,
  isResource,
  Pipeline,
  Shader,
  ShaderStage,
  VertexPosColor,
  VertexPosNormalColor
} from "./graphics/mod.ts";
export * from "./utils.ts";

const SURFACE_FORMAT: GPUTextureFormat = "bgra8unorm";

export default abstract class Game implements RealTimeApp {
  private _adapter: GPUAdapter | null = null;
  private _device: GPUDevice | null = null;
  private _surfaces = new Map<string, Deno.UnsafeWindowSurface>();
  private _contexts = new Map<string, GPUCanvasContext>();
  private _pipelines = new Map<string, Pipeline>();
  private renderLoop = new RenderLoop(60, this);
  private world = new World();
  limitFrameRate = false;
  private _windows: DwmWindow[] = [];
  private _mainWindow: DwmWindow | null = null;
  private _inputMaps = new Map<string, Input>();
  private _systems: System[] = [];

  constructor(
    readonly name: string,
    public clearColor: Color = Color.cornflowerBlue,
  ) {}

  get adapter() {
    return this._adapter;
  }

  get device() {
    return this._device;
  }

  get active() {
    return this.renderLoop.isRunning;
  }

  get time(): Tick {
    return this.world.resources.get(Tick) ?? Tick.zero(1 / 60);
  }

  get windows() {
    return this._windows;
  }

  get mainWindow() {
    return this._mainWindow!;
  }

  abstract initialize(world: World): Promise<void>;

  add(system: RunnableAsSystem) {
    this._systems.push(system);
  }

  async run() {
    globalThis.addEventListener("unhandledrejection", (e) => {
      console.log(`${Date.now()}: ${e.reason}`);
      e.preventDefault();
    });

    this._adapter = await navigator.gpu.requestAdapter({
      powerPreference: "low-power",
    });
    if (!this._adapter) throw Error("Could not acquire a WebGPU adapter.");
    this._adapter.requestAdapterInfo().then(console.log);
    this._device = await this._adapter!.requestDevice({
      label: "Teraflop GPU Device",
      requiredLimits: {
        ...this._adapter.limits,
        // Don't require GPU storage buffers
        maxDynamicStorageBuffersPerPipelineLayout: 0,
        maxStorageBuffersPerShaderStage: 0,
        maxStorageBufferBindingSize: 0,
        maxStorageTexturesPerShaderStage: 0,
        // Don't require GPGPU compute
        maxComputeInvocationsPerWorkgroup: 0,
        maxComputeWorkgroupStorageSize: 0,
        maxComputeWorkgroupsPerDimension: 0,
        maxComputeWorkgroupSizeX: 0,
        maxComputeWorkgroupSizeY: 0,
        maxComputeWorkgroupSizeZ: 0,
      },
    });

    const window = this._mainWindow = this.createWindow(this.name, 800, 450);
    const surface = window.windowSurface();
    this._surfaces.set(window.id, surface);
    const context = surface.getContext("webgpu");
    this._contexts.set(window.id, context);
    this._windows.push(window);
    this.resizeGpuSurface(window, this.device!);

    // Update swap WebGPU surfaces when their sizes change
    globalThis.addEventListener("framebuffersize", (ev) => {
      this.resizeGpuSurface(ev.window, this.device!);
      this.update();
      if (this.active) this.render();
    });

    await this.initialize(this.world);
    this.renderLoop.start();
  }

  createWindow(title: string, width: number, height: number) {
    const window = createWindow({ title: title, width, height, resizable: true, vsync: true });
    const monitor = getPrimaryMonitor();
    window.setSizeLimits(width, height, monitor.workArea.width, monitor.workArea.height);
    this._inputMaps.set(window.id, new Input());
    return window;
  }

  private initializeResources(entity: Entity) {
    const uninitializedResources = (entity[1].filter(isResource) as unknown as Resource[])
      .filter(resource => resource.initialized === false);
    uninitializedResources.forEach(resource => resource.initialize(this._adapter!, this._device!));
  }

  private tick(tick: Tick) {
    this.world.resources.set(tick);
    this.update();
  }

  private update() {
    // FIXME: There is a massive memory leak, i.e. ~1MB per second
    // See https://denosoar.deno.dev/docs to profile apps

    pollEvents();
    // TODO: Make this system opt-in?
    Filter.by(isResource).entities(this.world)
      .forEach(entity => this.initializeResources(entity));

    this._systems.forEach(system => system.run());
  }

  private render() {
    // Render the scene in each window
    this._windows.forEach(window => {
      const renderPassDescriptor = {
        colorAttachments: [{
          view: this._contexts.get(window.id)!.getCurrentTexture().createView(),
          clearValue: this.clearColor,
          loadOp: "clear" as GPULoadOp,
          storeOp: "store" as GPUStoreOp,
        }],
      };

      const commandEncoder = this.device!.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

      // TODO: Use marked sections to instrument game systems (https://deno.land/api@v1.42.3?s=Performance#method_measure_9)

      // Render each world object given its Mesh and Material
      // TODO: Group entities by Material instances to reduce pipeline switching
      // TODO: Group entities by Mesh instances to perform indexed draws
      query(new ComponentOf<Mesh>(Mesh), new ComponentOf<Material>(Material)).entities(this.world).forEach(async (entity) => {
        const mesh = entity[1].find(c => c instanceof Mesh)! as Mesh;
        const material = entity[1].find(c => c instanceof Material)! as Material;

        const pipelineKey = material.hash;
        // Create a render pipeline for each material
        if (!this._pipelines.has(pipelineKey)) {
          const pipeline = new Pipeline(material, mesh.vertexLayout, [{
            format: SURFACE_FORMAT,
            // TODO: Extract this to the Material class
            blend: {
              color: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
              }
            }
          }], undefined, pipelineKey);
          await pipeline.initialize(this._adapter!, this._device!);
          this._pipelines.set(pipelineKey, pipeline);
        }

        passEncoder.setPipeline(this._pipelines.get(pipelineKey)!.pipeline!);
        passEncoder.setVertexBuffer(0, mesh.vertexBuffer!);
        passEncoder.setIndexBuffer(mesh.indexBuffer!, "uint32");
        passEncoder.draw(mesh.vertices.length);
      });

      passEncoder.end();

      this.device!.queue.submit([commandEncoder.finish()]);
      this._surfaces.get(window.id)!.present();
    });
  }

  private resizeGpuSurface(window: DwmWindow, device: GPUDevice) {
    const { width, height } = window.framebufferSize;
    this._contexts.get(window.id)?.configure({
      device,
      format: SURFACE_FORMAT,
      width,
      height,
    });
  }
}

export class Time {
  constructor(readonly now = 0) {}

  static get zero() {
    return new Time();
  }
}
