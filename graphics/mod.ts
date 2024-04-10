export class Shader {}
export class Material {}

/** Decorates and tags a class as GPU vertex attributes. */
export function attributes() {
  return function (target: Function) {
    Object.defineProperty(target.prototype, "isVertexAttributes", {
      enumerable: true,
      configurable: false,
      writable: false,
      value: true,
      set: undefined
    });
  }
}
export @attributes class VertexPosColor {}

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
