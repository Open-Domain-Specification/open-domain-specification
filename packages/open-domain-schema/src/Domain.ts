import {DomainType} from "./DomainType";
import {Subdomain} from "./Subdomain";

export type Domain = {
    name: string;
    type: DomainType;
    description: string;
    subdomains?: Subdomain[];
}