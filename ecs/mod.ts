import { nameof, SymbolKey } from "../utils.ts";

export type StorableAsComponent = Component | object;

let lastId = -1;

export class World {
  readonly resources = Object.seal(new Resources());
  readonly entities = new Map<number, StorableAsComponent[]>();

  spawn(...components: StorableAsComponent[]) {
    const id = lastId += 1;
    this.entities.set(id, components);
    return id;
  }
}

export type Resource<T> = T | null;
class Resources {
  readonly _resources = new Map<string, any>();

  /** @returns The given `value`. */
  set<T extends object>(value: T): T {
    const key = typeof value === "object" ? nameof<T>(value.prototype) : typeof value;
    this._resources.set(key, value);
    return value;
  }

  /** @returns The resource, or `null` if it doesn't exist. */
  get<T extends object>(symbol: SymbolKey<T>): Resource<T> {
    const key = nameof(symbol);
    if (!this._resources.has(key)) return null;
    return this._resources.get(key) as T;
  }
}

export abstract class Component {}

export abstract class System {}
