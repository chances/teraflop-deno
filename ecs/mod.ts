// deno-lint-ignore-file ban-types
import hashObject from "npm:hash-object@5.0.1";
import { AnyConstructor, nameof } from "../utils.ts";

let lastId = -1;

export class World {
  readonly resources = Object.seal(new Resources());
  readonly entities = new Map<number, Component[]>();
  readonly _tags = new Map<number, string[]>();

  tag(entity: Entity, label: string) {
    if (!this._tags.has(entity[0])) this._tags.get(entity[0])?.push(label);
    else this._tags.set(entity[0], [label]);
  }

  hasTag(entity: Entity, label: string) {
    if (!this._tags.has(entity[0])) return false;
    return this._tags.get(entity[0])?.includes(label);
  }

  tags(entity: Entity) {
    if (!this._tags.has(entity[0])) return [];
    return Array.from(this._tags.get(entity[0])!);
  }

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
      ? nameof(Object.getPrototypeOf(value))
      : typeof value;
    this._resources.set(key, value);
    return value;
  }

  /** @returns The resource, or `null` if it doesn't exist. */
  get<T extends AnyConstructor>(symbol: T): Resource<T> {
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
      .filter(entity => this.match(entity)) as Entity[];
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

export class ComponentOf<T extends Component = Component> extends Query {
  constructor(readonly symbol: AnyConstructor) {
    super();
  }

  match(entity: Entity): boolean {
    return entity[1].some(component => component instanceof this.symbol);
  }

  /** @returns Set of components that match this query. */
  components(world: World): T[] {
    return this.entities(world).reduce(
      (acc, entity) => {
        if (Array.isArray(entity) && Array.isArray(entity[1]))
          entity[1].filter(component => component instanceof this.symbol)
            .forEach(component => acc.push(component as T));
        return acc;
      },
      [] as T[]
    );
  }
}

class AndQuery extends Query {
  constructor(readonly queries: Query[]) {
    super();
  }

  match(entity: Entity): boolean {
    return this.queries.every(query => query.match(entity));
  }
}

/** Fluently construct a world query that matches *all* of the given `Query` instances. */
export function query(...queries: Query[]): Query {
  return new AndQuery(queries);
}

/** Types that are runnable as ECS systems. */
export type RunnableAsSystem = System;

export abstract class System {
  constructor(readonly world: World) {}

  /** Run this system. */
  abstract run(): void;
}
