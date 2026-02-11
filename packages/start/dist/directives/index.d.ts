import { type FilterPattern, type Plugin } from "vite";
export interface ServerFunctionsFilter {
    include?: FilterPattern;
    exclude?: FilterPattern;
}
export interface ServerFunctionsOptions {
    manifest: string;
    runtime: {
        server: string;
        client: string;
    };
    filter?: ServerFunctionsFilter;
}
export declare function serverFunctionsPlugin(options: ServerFunctionsOptions): Plugin[];
