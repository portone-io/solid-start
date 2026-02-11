import { createFilter, } from "vite";
import { compile } from "./compile.js";
const DEFAULT_INCLUDE = "src/**/*.{jsx,tsx,ts,js,mjs,cjs}";
const DEFAULT_EXCLUDE = "node_modules/**/*.{jsx,tsx,ts,js,mjs,cjs}";
const DIRECTIVE = "use server";
function createManifest() {
    return {
        server: new Set(),
        client: new Set(),
    };
}
function createDeferredPromise() {
    let resolve;
    let reject;
    return {
        reference: new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        }),
        resolve(value) {
            resolve(value);
        },
        reject(value) {
            reject(value);
        },
    };
}
class Debouncer {
    source;
    promise;
    timeout;
    constructor(source) {
        this.source = source;
        this.promise = createDeferredPromise();
        this.defer();
    }
    defer() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
        this.timeout = setTimeout(() => {
            this.promise.resolve(this.source());
        }, 1000);
    }
}
function mergeManifestRecord(source, target) {
    const current = source.size;
    for (const entry of target) {
        source.add(entry);
    }
    return {
        invalidPreload: current !== source.size,
        invalidated: [...source],
    };
}
function invalidateModule(moduleGraph, path) {
    const target = moduleGraph.getModuleById(path);
    if (target) {
        moduleGraph.invalidateModule(target);
    }
}
function invalidateModules(server, result, manifest) {
    if (server) {
        if (result.invalidPreload) {
            invalidateModule(server.environments.client.moduleGraph, manifest);
            invalidateModule(server.environments.ssr.moduleGraph, manifest);
        }
    }
}
export function serverFunctionsPlugin(options) {
    const filter = createFilter(options.filter?.include || DEFAULT_INCLUDE, options.filter?.exclude || DEFAULT_EXCLUDE);
    let env;
    const manifest = createManifest();
    const preload = {
        server: undefined,
        client: undefined,
    };
    let currentServer;
    const clientOptions = {
        directive: DIRECTIVE,
        definitions: {
            register: {
                kind: "named",
                name: "createServerReference",
                source: options.runtime.client,
            },
            clone: {
                kind: "named",
                name: "cloneServerReference",
                source: options.runtime.client,
            },
        },
    };
    const serverOptions = {
        directive: DIRECTIVE,
        definitions: {
            register: {
                kind: "named",
                name: "createServerReference",
                source: options.runtime.server,
            },
            clone: {
                kind: "named",
                name: "cloneServerReference",
                source: options.runtime.server,
            },
        },
    };
    return [
        {
            name: "solid-start:server-functions/setup",
            enforce: "pre",
            configResolved(config) {
                env = config.mode !== "production" ? "development" : "production";
            },
            configureServer(server) {
                currentServer = server;
            },
        },
        {
            name: "solid-start:server-functions/preload",
            enforce: "pre",
            resolveId(source) {
                if (source === options.manifest) {
                    return { id: options.manifest, moduleSideEffects: true };
                }
                return null;
            },
            async load(id, opts) {
                const mode = opts?.ssr ? "server" : "client";
                if (id === options.manifest) {
                    const current = new Debouncer(() => [...manifest[mode]].map(entry => `import "${entry}";`).join("\n"));
                    preload[mode] = current;
                    const result = await current.promise.reference;
                    return result;
                }
                return null;
            },
        },
        {
            name: "solid-start:server-functions/compiler",
            async transform(code, fileId, opts) {
                const mode = opts?.ssr ? "server" : "client";
                const [id] = fileId.split("?");
                if (!filter(id)) {
                    return null;
                }
                const result = await compile(id, code, {
                    ...(mode === "server" ? serverOptions : clientOptions),
                    mode,
                    env,
                });
                if (result.valid) {
                    const preloader = preload[mode];
                    if (preloader) {
                        preloader.defer();
                    }
                    invalidateModules(currentServer, mergeManifestRecord(manifest.server, new Set([id])), options.manifest);
                    return {
                        code: result.code || "",
                        map: result.map,
                    };
                }
                return null;
            },
        },
    ];
}
