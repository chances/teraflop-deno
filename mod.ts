import {
  createWindow,
  DwmWindow,
  getPrimaryMonitor,
  mainloop,
} from "https://deno.land/x/dwm@0.3.6/mod.ts";

export default abstract class Game {
  private _adapter: GPUAdapter | null = null;
  private _device: GPUDevice | null = null;
  private _surfaces = new Map<string, Deno.UnsafeWindowSurface>();
  private _contexts = new Map<string, GPUCanvasContext>();
  private _active = false;
  private _time = Time.zero;
  limitFrameRate = false;
  private _windows: DwmWindow[] = [];
  private _windowFbSizes = new Map<string, Size>();
  private _mainWindow: DwmWindow | null = null;

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
    return this._active;
  }

  get time() {
    return this._time;
  }

  get windows() {
    return this._windows;
  }

  get mainWindow() {
    return this._mainWindow!;
  }

  abstract initialize(world: World): void;

  async run() {
    this._adapter = await navigator.gpu.requestAdapter();
    this._device = await this._adapter!.requestDevice();

    const window = this._mainWindow = createWindow({
      title: this.name,
      width: 800,
      height: 450,
      resizable: true,
      vsync: true,
    });
    const monitor = getPrimaryMonitor();
    this.mainWindow.setSizeLimits(
      800,
      450,
      monitor.workArea.width,
      monitor.workArea.height,
    );
    const surface = window.windowSurface();
    this._surfaces.set(window.id, surface);
    const context = surface.getContext("webgpu");
    this._contexts.set(window.id, context);
    this._windows.push(window);
    this.resizeGpuSurface(window, this.device!);
    this._windowFbSizes.set(window.id, window.framebufferSize);

    const world = new World();
    this.initialize(world);
    this._active = true;

    await mainloop(() => {
      this.update();
      if (!this.active) this.mainWindow.close();
      this.render();
    });
  }

  private update() {
  	// Update swap WebGPU surfaces, if necessary
    this._windows.forEach((window) => {
      const oldSize = this._windowFbSizes.get(window.id)!;
      const widthChanged = window.framebufferSize.width !== oldSize.width;
      const heightChanged = window.framebufferSize.height !== oldSize.height;
      if (widthChanged || heightChanged) {
        this.resizeGpuSurface(window, this.device!);
        this._windowFbSizes.set(window.id, window.framebufferSize);
      }
    });
  }

  private render() {
    // Render the scene in each window
    this._windows.forEach((window) => {
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
      passEncoder.end();

      this.device!.queue.submit([commandEncoder.finish()]);
      this._surfaces.get(window.id)!.present();
    });
  }

  private resizeGpuSurface(window: DwmWindow, device: GPUDevice) {
    const { width, height } = window.framebufferSize;
    this._contexts.get(window.id)?.configure({
      device,
      format: "bgra8unorm",
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

export class World {
  readonly entities = new Map<number, Component[]>();
}
export abstract class Component {}
