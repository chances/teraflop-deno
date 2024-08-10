export function getStacktrace() {
  if (!Error.captureStackTrace) return "";
  const stacktrace: { stack?: string } = {};
  Error.captureStackTrace(stacktrace, getStacktrace);
  if (!stacktrace.stack) return "";
  let stack = stacktrace.stack
    .split("\n")
    .map((line) => line.split("at ")[1])
    .slice(2) // Skip the Error line and the GPU.* line.
    .filter((line) => line);

  return stack.join("\n");
}

// Cache stack traces since many objects will have the same stack trace.
// Used as a singleton.
export class StacktraceCache {
  static _global = new StacktraceCache();

  private _cache: string[] = [];

  _getStacktrace(id: number) {
    return id < 0 ? "" : this._cache[id] ?? "";
  }

  _setStacktrace(stacktrace: string) {
    if (!stacktrace) return -1;
    const id = this._cache.indexOf(stacktrace);
    if (id !== -1) return id;
    this._cache.push(stacktrace);
    return this._cache.length - 1;
  }

  static getStacktrace(id: number) {
    return StacktraceCache._global._getStacktrace(id);
  }

  static setStacktrace(stacktrace: string) {
    return StacktraceCache._global._setStacktrace(stacktrace);
  }
}

StacktraceCache._global = new StacktraceCache();
