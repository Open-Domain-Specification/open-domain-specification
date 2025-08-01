import {Aggregate} from "./Aggregate";
import {ContextRelationship} from "./ContextRelationship";

export type BoundedContext = {
    name: string;
    description: string;
    relationships?: ContextRelationship[];
    aggregates?: Aggregate[];
}