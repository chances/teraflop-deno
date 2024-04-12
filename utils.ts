import hashObject from "npm:hash-object@5.0.1";

export function hash(...objects: object[]): string {
  return hashObject(
    // deno-lint-ignore no-explicit-any
    objects.reduce((obj, x, i) => ({ ...obj, [i]: x }), {} as Record<number, any>),
    { algorithm: 'sha1' }
  );
}

// deno-lint-ignore ban-types
export type SymbolKey<T> = Function | Extract<keyof T, string> | Extract<keyof T, symbol>;
export function nameof<T>(symbol: SymbolKey<T>) {
  if (typeof symbol === "function") return symbol.prototype.name;
  return symbol;
}

/** @returns An `Object` property descriptor for a constant property, i.e. it is not `writable`. */
// deno-lint-ignore no-explicit-any
export function constantProperty(value?: any): PropertyDescriptor {
  return {
    enumerable: true,
    configurable: false,
    writable: false,
    value
  };
}

/** @returns An `Object` property descriptor for a private property, i.e. it is not `enumarable`. */
// deno-lint-ignore no-explicit-any
export function privateProperty(value?: any): PropertyDescriptor {
  return {
    enumerable: false,
    configurable: false,
    writable: true,
    value
  };
}

/** Decorates a class such that its constructor and prototype cannot be mutated. */
// deno-lint-ignore ban-types
export function sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

export const No = Object.seal({
  depthTest: false
});
