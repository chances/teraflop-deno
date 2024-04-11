// deno-lint-ignore ban-types
export type SymbolKey<T> = Function | Extract<keyof T, string> | Extract<keyof T, symbol>;
export function nameof<T>(symbol: SymbolKey<T>) {
  if (typeof symbol === "function") return symbol.prototype.name;
  return symbol;
}

/** @returns A constant `Object` property descriptor, i.e. the property is not `writable`. */
// deno-lint-ignore no-explicit-any
export function constantProperty(value: any): PropertyDescriptor {
  return {
    enumerable: true,
    configurable: false,
    writable: false,
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
