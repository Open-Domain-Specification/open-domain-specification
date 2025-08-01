import {BoundedContext} from "./BoundedContext";

export type Subdomain = {
    name: string;
    description: string;
    boundedContexts?: BoundedContext[];
}