import { assert } from "jsr:@std/assert";
import * as async from "jsr:@std/async";
import * as webgpu from "@std/webgpu";
import RenderLoop, { RealTimeApp, Tick } from "jsr:@chances/render-loop";
import { createWindow, DwmWindow, getPrimaryMonitor, pollEvents } from "@gfx/dwm";

import { Input } from "./input/mod.ts";
export * from "./input/mod.ts";
import { Entity, Filter, query, RunnableAsSystem, System, World } from "./ecs/mod.ts";
export * from "./ecs/mod.ts";
import * as graphics from "./graphics/mod.ts";
import { ComponentOf } from "./ecs/mod.ts";
import { Color, isResource, Material, Mesh, Pipeline, Resource } from "./graphics/mod.ts";
import { AnyConstructor } from "./utils.ts";
export {
  Color,
  isResource,
  Material,
  Mesh,
  Pipeline,
  type Position,
  Shader,
  ShaderStage,
  VertexPosColor,
  VertexPosNormalColor,
} from "./graphics/mod.ts";
export * from "./utils.ts";

export default abstract class Game implements RealTimeApp {
  private _adapter: GPUAdapter | null = null;
  private _gpuInfo: GPUAdapterInfo | null = null;
  private _device: GPUDevice | null = null;
  private _surfaces = new Map<string, Deno.UnsafeWindowSurface>();
  private _surfaceIsDirty = new Map<string, boolean>();
  private _contexts = new Map<string, GPUCanvasContext>();
  private _pipelines = new Map<string, Pipeline>();
  private renderLoop = new RenderLoop(60, this);
  private world = new World();
  limitFrameRate = false;
  private _windows: DwmWindow[] = [];
  private _mainWindow: DwmWindow | null = null;
  private readonly preferredSurfaceFormat = navigator.gpu.getPreferredCanvasFormat();
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

  get gpuInfo() {
    return this._gpuInfo;
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

  private unhandledRejection = (e: PromiseRejectionEvent) => {
    const cause = e.reason instanceof Error ? e.reason.stack ?? e.reason : e.reason;
    console.error(`${new Date().toUTCString()}: Unhandled Promise Rejection:\n${cause}`);
    e.preventDefault();
  };

  private requestAdapter() {
    return navigator.gpu.requestAdapter({ powerPreference: "low-power" });
  }

  /** @rejects When the GPU adapter is unavailable. */
  async run() {
    // TODO: Remove this event listener when the render loop finishes
    globalThis.addEventListener("unhandledrejection", this.unhandledRejection);

    console.debug("Retrieving adapter info...");
    // TODO: Unmask GPU device info
    // See https://github.com/denoland/deno/blob/5294885a5a411e6b2e9674ce9d8f951c9c011988/ext/webgpu/01_webgpu.js#L460
    this._gpuInfo = await (await this.requestAdapter())?.info ?? Promise.reject(
      new Error("GPU adapter is not available."),
    ) as unknown as GPUAdapterInfo ?? null;
    this._adapter = await this.requestAdapter();
    if (!this._adapter) throw Error("Could not acquire a suitable WebGPU adapter.");
    console.debug("Done.");
    console.log("GPU: ", this.gpuInfo?.description ?? "Unknown");
    console.debug("Retrieving GPU device...");
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
    if (!this._device) throw Error("Could not acquire a suitable WebGPU device.");
    console.debug("Done.");

    console.debug("Creating window...");
    const window = this._mainWindow = this.createWindow(this.name, 800, 450);
    const surface = window.windowSurface();
    this._surfaces.set(window.id, surface);
    this._surfaceIsDirty.set(window.id, false);
    const context = surface.getContext("webgpu");
    this._contexts.set(window.id, context);
    this._windows.push(window);
    this.resizeGpuSurface(window, this.device!);
    console.debug("Done.");

    // Update swap WebGPU surfaces when their sizes change
    globalThis.addEventListener("framebuffersize", (ev) => {
      this.resizeGpuSurface(ev.window, this.device!);
      this._surfaceIsDirty.set(window.id, true);
    });

    await this.initialize(this.world);
    await this.renderLoop.start().finished;
    // FIXME: console.debug("Event loop finished.");
  }

  tick(tick: Tick) {
    this.world.resources.set(tick);
    this.update();
  }

  createWindow(title: string, width: number, height: number) {
    const window = createWindow({ title: title, width, height, resizable: true, vsync: true });
    const monitor = getPrimaryMonitor();
    window.setSizeLimits(width, height, monitor.workArea.width, monitor.workArea.height);
    this._inputMaps.set(window.id, new Input());

    return window;
  }

  private async initializeResources(entity: Entity) {
    const uninitializedResources = (entity[1].filter(isResource) as unknown as Resource[])
      .filter((resource) => resource.initialized === false);
    await Promise.all(uninitializedResources.map((resource) => resource.initialize(this._adapter!, this._device!)));
  }

  private async update() {
    // FIXME: There is a massive memory leak, i.e. ~1MB per second
    // See https://denosoar.deno.dev/docs to profile apps
    // TODO: Use marked sections to instrument game systems (https://deno.land/api@v1.42.3?s=Performance#method_measure_9)

    pollEvents();
    // TODO: Make this system opt-in?
    await Promise.all(Filter.by(isResource).entities(this.world)
      .map((entity) => this.initializeResources(entity)));

    this._systems.forEach((system) => system.run());
  }

  async render() {
    // Render the scene in each window
    await Promise.all(this._windows.map(async (window) => {
      // Skip this frame if the surface is dirty
      if (this._surfaceIsDirty.get(window.id)! === true)
        return queueMicrotask(() => this._surfaceIsDirty.set(window.id, false));

      const getFrameBuffer = () => this._contexts.get(window.id)!.getCurrentTexture().createView();
      const clearFrameBuffer = () => {
        const commandEncoder = this.device!.createCommandEncoder();
        const passEncoder = commandEncoder.beginRenderPass({
          colorAttachments: [{
            view: getFrameBuffer(),
            clearValue: this.clearColor,
            loadOp: "clear" as GPULoadOp,
            storeOp: "store" as GPUStoreOp,
          }],
        });
        passEncoder.end();
        return commandEncoder.finish();
      };
      const commandBuffers: GPUCommandBuffer[] = [clearFrameBuffer()];
      this.device!.pushErrorScope("validation");

      const commandEncoder = this.device!.createCommandEncoder();
      const renderPass = commandEncoder.beginRenderPass({
        label: `World<${window.id}>`,
        colorAttachments: [{
          view: getFrameBuffer(),
          loadOp: "load" as GPULoadOp,
          storeOp: "store" as GPUStoreOp,
        }],
      });

      // Render each world object given its Mesh and Material
      // TODO: Group entities by Material instances to reduce pipeline switching
      // TODO: Group entities by Mesh instances to perform indexed draws
      await Promise.all(
        query(new ComponentOf<Mesh>(Mesh), new ComponentOf<Material>(Material)).entities(this.world).map(
          async (entity) => {
            const mesh = entity[1].find((c) => c instanceof Mesh)! as Mesh;
            const material = entity[1].find((c) => c instanceof Material)! as Material;

            const pipelineKey = material.hash;
            // Create a render pipeline for each material
            if (!this._pipelines.has(pipelineKey)) {
              const pipeline = new Pipeline(
                material,
                mesh.vertexLayout,
                [{
                  format: this.preferredSurfaceFormat,
                  // TODO: Extract this to the Material class
                  blend: {
                    color: {
                      srcFactor: "one",
                      dstFactor: "one-minus-src-alpha",
                    },
                    alpha: {
                      srcFactor: "one",
                      dstFactor: "one-minus-src-alpha",
                    },
                  },
                }],
                undefined,
                pipelineKey,
              );
              await pipeline.initialize(this._adapter!, this._device!);
              this._pipelines.set(pipelineKey, pipeline);
            }
            const pipeline = this._pipelines.get(pipelineKey)!.pipeline!;

            // Encode this mesh into the render pass
            // console.debug(`Rendering ${pipeline.label}:Entity<${entity}>`);
            renderPass.setPipeline(pipeline);
            // TODO: Make the vertex buffer optional, e.g. for static triangle or quad shaders
            renderPass.setVertexBuffer(0, mesh.vertexBuffer!);
            if (mesh.isIndexed) renderPass.setIndexBuffer(mesh.indexBuffer!, "uint32");
            renderPass.draw(mesh.vertices.length);
            renderPass.insertDebugMarker(`Drawn: Entity<${this.world.entityId(entity)}>`);
          },
        ),
      ).catch((err: Error | unknown) => {
        if (err instanceof Error && err.name === "OperationError") {
          throw new ValidationError(
            `Could not render entities: ${err.message}`,
            { cause: err },
          );
        }
      });

      renderPass.end();
      commandBuffers.push(commandEncoder.finish());

      // Submit the aggregated command buffers
      this.device!.queue.submit(commandBuffers);
      await this.device!.queue.onSubmittedWorkDone();
      // Swap frame buffers
      this._surfaces.get(window.id)!.present();
      // Handle validation errors
      this.device!.popErrorScope()?.then((err) => {
        if (err) throw new ValidationError(err.message);
      });
    }));
  }

  /** Capture the main window's viewport to a `GPUBuffer`. */
  async captureFrame() {
    assert(this.device !== null, "GPU device is lost.");
    assert(this.mainWindow !== null, "App is not running.");
    const size = this.mainWindow.size;
    // See https://deno.land/std@0.224.0/webgpu/create_capture.ts?s=createCapture
    const { texture, outputBuffer } = webgpu.createCapture(this.device!, size.width, size.height);
    const renderAttachment: GPURenderPassColorAttachment = {
      view: texture.createView(),
      loadOp: "clear" as GPULoadOp,
      storeOp: "store" as GPUStoreOp,
      clearValue: this.clearColor,
    };

    // TODO: this.defaultRenderPass.queueTask(() => {});
    await this.renderQueue.queueTask(() => {
      const encoder = this.device!.createCommandEncoder();
      encoder.beginRenderPass({ colorAttachments: [renderAttachment] }).end();
      const { padded } = webgpu.getRowPadding(size.width);
      encoder.copyTextureToBuffer(
        { texture },
        { buffer: outputBuffer, bytesPerRow: padded },
        size,
      );
      return encoder.finish();
    });

    // `outputBuffer` contains the raw image data, can then be used to save as png or other formats.
    return outputBuffer;
  }

  private readonly _renderQueue = {
    /** Queue a GPU command buffer immediately. */
    queueTask: (task: () => GPUCommandBuffer) => {
      assert(this.device !== null, "GPU device is lost.");
      this.device!.queue.submit([task()]);
      return this.device!.queue.onSubmittedWorkDone();
    },
  };

  get renderQueue() {
    return this._renderQueue;
  }

  private resizeGpuSurface(window: DwmWindow, device: GPUDevice) {
    const { width, height } = window.framebufferSize;
    const format = this.preferredSurfaceFormat;
    this._contexts.get(window.id)?.configure({ device, format });
    this._surfaces.get(window.id)!.resize(width, height);
  }
}

export interface ValidationErrorOptions {
  /** Source class of this validation error. */
  source?: AnyConstructor;
  // deno-lint-ignore no-explicit-any
  details?: any;
}

/** An error validating GPU state. */
export class ValidationError extends Error {
  constructor(message?: string, options?: ErrorOptions & ValidationErrorOptions) {
    const source = options?.source ? `${options.source.name}: ` : "";
    super(`Validation Error: ${source}${message}`, options);
    // Delay until the next event loop iteration to let Deno's WebGPU implementation log its related errors.
    if (ValidationError.abortOnInstantiation) {
      async.delay(0).then(() => {
        console.error(this.message);
        if (options?.details) console.debug(options.details);
        Deno.exit(1);
      });
    }
  }

  /** Whether Deno will abort when any validation error is instantiated. */
  static get abortOnInstantiation() {
    // deno-lint-ignore no-explicit-any
    return (ValidationError as any)[Symbol.for("abortOnValidationError")] ?? false;
  }

  static set abortOnInstantiation(value: boolean) {
    // deno-lint-ignore no-explicit-any
    (ValidationError as any)[Symbol.for("abortOnValidationError")] = value;
  }
}
