export type SymbolKey<T> = Function | Extract<keyof T, string> | Extract<keyof T, symbol>;
export function nameof<T>(symbol: SymbolKey<T>) {
  if (typeof symbol === "function") return symbol.prototype.name;
  return symbol;
}

/** Decorates a class such that its constructor and prototype cannot be mutated. */
export function sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

export const No = Object.seal({
  depthTest: false
});
