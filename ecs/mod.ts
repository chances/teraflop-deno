export class World {
  readonly entities = new Map<number, Component[]>();
}
export abstract class Component {}
export abstract class System {}
