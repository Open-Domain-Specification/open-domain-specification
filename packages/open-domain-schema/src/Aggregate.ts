import {ValueObject} from "./ValueObject";
import {Entity} from "./Entity";

export type Aggregate = {
    name: string;
    description: string;
    entities: Entity[];
    valueObjects?: ValueObject[];
}