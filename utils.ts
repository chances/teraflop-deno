/** Decorates a class such that its constructor and prototype cannot be mutated. */
export function sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

export const No = Object.seal({
  depthTest: false
});
