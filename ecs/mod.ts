// deno-lint-ignore-file ban-types
import hashObject from "npm:hash-object@5.0.1";
import { nameof } from "../utils.ts";

let lastId = -1;

export class World {
  readonly resources = Object.seal(new Resources());
  readonly entities = new Map<number, Component[]>();

  spawn(...components: Component[]) {
    const id = lastId += 1;
    this.entities.set(id, components);
    return id;
  }
}

export type Resource<T> = T | null;
class Resources {
  readonly _resources = new Map<string, object>();

  /**
   * Adds or replaces the given `value` from this set of resources.
   * @returns The given `value`. */
  set<T extends object>(value: T): T {
    const key = typeof value === "object"
      ? nameof<T>(Object.getPrototypeOf(value))
      : typeof value;
    this._resources.set(key, value);
    return value;
  }

  /** @returns The resource, or `null` if it doesn't exist. */
  get<T extends object>(symbol: Function): Resource<T> {
    const key = nameof(symbol);
    if (!this._resources.has(key)) return null;
    return this._resources.get(key) as T;
  }
}

export type Entity = [number, Component[]];

export abstract class Component {
  /** @returns A SHA-1 hash of this component. */
  get hash(): string {
    return hashObject(this, {algorithm: 'sha1'});
  }
}

export type ComponentFilter = (value: Component) => boolean;

export type QueryGenerator = (...queries: Query[]) => QueryFn;
export type QueryFn<T = Entity> = (world: World) => T[];

function composeQuery<T = Entity, U = Entity>(query: Query<T>, callback: (value: T, index: number, array: T[]) => U) {
  return class _ComposedQuery extends Query<U> {
    match(entity: Entity): boolean {
      return query.match(entity);
    }

    override entities(world: World) {
      return query.entities(world).map((x, i, arr) => callback(x, i, arr));
    }
  }
}

export abstract class Query<E = Entity> {
  abstract match(entity: Entity): boolean;

  /** @returns Set of entities that match this query. */
  entities(world: World): E[] {
    const matches =  Array.from(world.entities.entries())
      .filter(this.match.bind(this)) as Entity[];
    return matches as E[];
  }

  /**
   * Calls a defined callback function on each component matched by this query, and returns an array that contains the results.
   * @param callback A function that accepts up to three arguments.
   * @remarks The map method calls the callback function one time for each component matched by this query.
   */
  map<U extends E>(callback: (value: E, index: number, array: E[]) => U): Query<U> {
    return new (composeQuery(this, callback))();
  }
}

export class Filter extends Query {
  constructor(private predicate: ComponentFilter) {
    super();
  }

  /** Fluently constructs a new `Filter` query from the given `predicate`. */
  static by(predicate: ComponentFilter) {
    return new Filter(predicate);
  }

  match(entity: Entity): boolean {
    return entity[1].some(this.predicate);
  }
}

export class ComponentOf<T extends Component = Component> extends Query<T> {
  constructor(readonly symbol: Function) {
    super();
  }

  match(entity: Entity): boolean {
    return entity[1].some(component => component instanceof this.symbol);
  }
}

/** Fluently construct a world query from a set of `Query` instances. */
export function query(...queries: Query[]): QueryFn {
  return function (world) {
    const entities = Array.from(world.entities.entries());
    return entities.filter(entity => queries.every(query => query.match(entity)));
  };
}

/** Types that are runnable as ECS systems. */
export type RunnableAsSystem = System;

export abstract class System {
  constructor(readonly world: World) {}

  /** Run this system. */
  abstract run(): void;
}
