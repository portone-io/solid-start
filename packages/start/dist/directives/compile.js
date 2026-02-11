import * as babel from "@babel/core";
import path from "node:path";
import { directivesPlugin } from "./plugin.js";
import xxHash32 from "./xxhash32.js";
export async function compile(id, code, options) {
    const context = {
        ...options,
        valid: false,
        hash: xxHash32(id).toString(16),
        count: 0,
        imports: new Map(),
    };
    const pluginOption = [directivesPlugin, context];
    const plugins = [
        "jsx",
    ];
    if (/\.[mc]?tsx?$/i.test(id)) {
        plugins.push("typescript");
    }
    const result = await babel.transformAsync(code, {
        plugins: [pluginOption],
        parserOpts: {
            plugins,
        },
        filename: path.basename(id),
        ast: false,
        sourceMaps: true,
        configFile: false,
        babelrc: false,
        sourceFileName: id,
    });
    if (result) {
        return {
            valid: context.valid,
            code: result.code || "",
            map: result.map,
        };
    }
    throw new Error("invariant");
}
