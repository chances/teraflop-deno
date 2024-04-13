import hashObject from "npm:hash-object@5.0.1";

export function hash(...objects: object[]): string {
  return hashObject(
    // deno-lint-ignore no-explicit-any
    objects.reduce((obj, x, i) => ({ ...obj, [i]: x }), {} as Record<number, any>),
    { algorithm: 'sha1' }
  );
}

/** Any class constructor. */
// deno-lint-ignore no-explicit-any
export type AnyConstructor = new (...args: any[]) => any;

export type SymbolKey<T extends AnyConstructor> = T | Extract<keyof T, string> | Extract<keyof T, symbol>;
export function nameof<T extends AnyConstructor>(symbol: SymbolKey<T>) {
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
export function sealed<T extends AnyConstructor>(constructor: T) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

// TODO: Use a `Proxy` to map *any* property to `false`.
export const No = Object.seal({
  depthTest: false
});
