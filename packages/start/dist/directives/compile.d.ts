import * as babel from "@babel/core";
import { type StateContext } from "./plugin.ts";
export interface CompileResult {
    valid: boolean;
    code: string;
    map: babel.BabelFileResult["map"];
}
export type CompileOptions = Omit<StateContext, "count" | "hash" | "imports" | "valid">;
export declare function compile(id: string, code: string, options: CompileOptions): Promise<CompileResult>;
