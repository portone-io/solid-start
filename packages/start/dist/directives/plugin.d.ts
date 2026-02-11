import type * as babel from "@babel/core";
import * as t from "@babel/types";
import type { ImportDefinition } from "./types.ts";
export interface StateContext {
    env: "production" | "development";
    mode: "server" | "client";
    directive: string;
    hash: string;
    count: number;
    imports: Map<string, t.Identifier>;
    valid: boolean;
    definitions: {
        register: ImportDefinition;
        clone: ImportDefinition;
    };
}
interface State extends babel.PluginPass {
    opts: StateContext;
}
export declare function directivesPlugin(): babel.PluginObj<State>;
export {};
