// deno-lint-ignore-file ban-types
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

export abstract class Component {}

function filterBy(predicate: (value: Component) => boolean): (entity: Entity) => boolean {
  return entity => entity[1].some(predicate);
}

export interface Query<T extends Component = Component> {
  match(entity: Entity): boolean;
}

export class Filter implements Query {
  constructor(private predicate: ReturnType<typeof filterBy>) {};

  /** Fluently constructs a new `Filter` query from the given `predicate`. */
  static by(predicate: ReturnType<typeof filterBy>) {
    return new Filter(predicate);
  }

  match(entity: Entity): boolean {
    return this.predicate(entity);
  }
}

export class ComponentOf<T extends Component = Component> implements Query<T> {
  constructor(readonly symbol: Function) {}

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

export type QueryGenerator = (...queries: Query[]) => QueryFn;
export type QueryFn = (this: System, world: World) => Entity[];

export type SystemGenerator = (world: World) => System;
export type SystemFn = (this: System, entities: Entity[]) => void;
export interface SystemDescriptor {
  query: QueryFn,
  system: SystemFn,
}
export type SystemDescriptorGenerator = () => SystemDescriptor;
/** Types that are runnable as ECS systems. */
export type RunnableAsSystem = SystemGenerator | System;

export abstract class System {
  constructor(readonly world: World) {}

  /** Generate a `System` given a functional system generator. */
  static from(generator: SystemDescriptorGenerator): SystemGenerator {
    class _GeneratedSystem extends System {
      private entityQuery: QueryFn;
      private system: SystemFn;

      constructor(world: World, generator: SystemDescriptorGenerator) {
        super(world);

        const descriptor = generator();
        this.entityQuery = descriptor.query.bind(this);
        this.system = descriptor.system.bind(this);
      }
      run(): void {
        this.system(this.entityQuery(this.world));
      }
    }
    return (world) => new _GeneratedSystem(world, generator);
  }

  /** Run this system. */
  abstract run(): void;
}
