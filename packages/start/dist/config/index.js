import { defu } from "defu";
import { globSync } from "node:fs";
import { extname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePath } from "vite";
import solid from "vite-plugin-solid";
import { serverFunctionsPlugin } from "../directives/index.js";
import { DEFAULT_EXTENSIONS, VIRTUAL_MODULES, VITE_ENVIRONMENTS } from "./constants.js";
import { devServer } from "./dev-server.js";
import { envPlugin } from "./env.js";
import { SolidStartClientFileRouter, SolidStartServerFileRouter } from "./fs-router.js";
import { fsRoutes } from "./fs-routes/index.js";
import lazy from "./lazy.js";
import { manifest } from "./manifest.js";
import { parseIdQuery } from "./utils.js";
const absolute = (path, root) => path ? (isAbsolute(path) ? path : join(root, path)) : path;
export function solidStart(options) {
    const start = defu(options ?? {}, {
        appRoot: "./src",
        routeDir: "./routes",
        ssr: true,
        devOverlay: true,
        experimental: {
            islands: false,
        },
        solid: {},
        extensions: [],
    });
    const extensions = [...DEFAULT_EXTENSIONS, ...(start.extensions || [])];
    const routeDir = join(start.appRoot, start.routeDir);
    const root = process.cwd();
    const appEntryPath = globSync(join(root, start.appRoot, "app.{j,t}sx"))[0];
    if (!appEntryPath) {
        throw new Error(`Could not find an app jsx/tsx entry in ${start.appRoot}.`);
    }
    const entryExtension = extname(appEntryPath);
    const handlers = {
        client: `${start.appRoot}/entry-client${entryExtension}`,
        server: `${start.appRoot}/entry-server${entryExtension}`,
    };
    return [
        {
            name: "solid-start:config",
            enforce: "pre",
            configEnvironment(name) {
                return {
                    resolve: {
                        // remove when https://github.com/solidjs/vite-plugin-solid/pull/228 is released
                        externalConditions: ["solid", "node"],
                    },
                };
            },
            async config(_, env) {
                const clientInput = [handlers.client];
                if (env.command === "build") {
                    const clientRouter = globalThis.ROUTERS.client;
                    for (const route of await clientRouter.getRoutes()) {
                        for (const [key, value] of Object.entries(route)) {
                            if (value && key.startsWith("$") && !key.startsWith("$$")) {
                                function toRouteId(route) {
                                    return `${route.src}?${route.pick.map((p) => `pick=${p}`).join("&")}`;
                                }
                                clientInput.push(toRouteId(value));
                            }
                        }
                    }
                }
                return {
                    appType: "custom",
                    build: { assetsDir: "_build/assets" },
                    optimizeDeps: {
                        // Suppress TS errors from Vite 7 types when configuring Vite 8's Rolldown
                        ...{
                            rolldownOptions: {
                                transform: {
                                    jsx: "react",
                                },
                            },
                        },
                    },
                    environments: {
                        [VITE_ENVIRONMENTS.client]: {
                            consumer: "client",
                            build: {
                                write: true,
                                manifest: true,
                                outDir: "dist/client",
                                rollupOptions: {
                                    input: clientInput,
                                    treeshake: true,
                                    preserveEntrySignatures: "exports-only",
                                },
                            },
                        },
                        [VITE_ENVIRONMENTS.server]: {
                            consumer: "server",
                            build: {
                                ssr: true,
                                write: true,
                                manifest: true,
                                copyPublicDir: false,
                                rollupOptions: {
                                    input: "~/entry-server.tsx",
                                },
                                outDir: "dist/server",
                                commonjsOptions: {
                                    include: [/node_modules/],
                                },
                            },
                        },
                    },
                    resolve: {
                        alias: {
                            "@solidjs/start/server/entry": handlers.server,
                            "~": join(process.cwd(), start.appRoot),
                            ...(!start.ssr
                                ? {
                                    "@solidjs/start/server": "@solidjs/start/server/spa",
                                    "@solidjs/start/client": "@solidjs/start/client/spa",
                                }
                                : {}),
                        },
                    },
                    define: {
                        "import.meta.env.MANIFEST": `globalThis.MANIFEST`,
                        "import.meta.env.START_SSR": JSON.stringify(start.ssr),
                        // Use JSON.stringify so backslashes on Windows are escaped and
                        // esbuild receives a valid JS string literal for the define value
                        "import.meta.env.START_APP_ENTRY": JSON.stringify(appEntryPath),
                        "import.meta.env.START_CLIENT_ENTRY": JSON.stringify(handlers.client),
                        "import.meta.env.START_DEV_OVERLAY": JSON.stringify(start.devOverlay),
                        "import.meta.env.SEROVAL_MODE": JSON.stringify(start.serialization?.mode || "json"),
                    },
                    builder: {
                        sharedPlugins: true,
                        async buildApp(builder) {
                            const client = builder.environments[VITE_ENVIRONMENTS.client];
                            const server = builder.environments[VITE_ENVIRONMENTS.server];
                            if (!client)
                                throw new Error("Client environment not found");
                            if (!server)
                                throw new Error("SSR environment not found");
                            if (!client.isBuilt)
                                await builder.build(client);
                            if (!server.isBuilt)
                                await builder.build(server);
                        },
                    },
                };
            },
        },
        manifest(start),
        fsRoutes({
            routers: {
                client: new SolidStartClientFileRouter({
                    dir: absolute(routeDir, root),
                    extensions,
                }),
                ssr: new SolidStartServerFileRouter({
                    dir: absolute(routeDir, root),
                    extensions,
                    dataOnly: !start.ssr,
                }),
            },
        }),
        lazy(),
        envPlugin(options?.env),
        // Must be placed after fsRoutes, as treeShake will remove the
        // server fn exports added in by this plugin
        serverFunctionsPlugin({
            manifest: VIRTUAL_MODULES.serverFnManifest,
            runtime: {
                server: normalizePath(fileURLToPath(new URL("../server/server-fns-runtime.js", import.meta.url))),
                client: normalizePath(fileURLToPath(new URL("../server/server-runtime.js", import.meta.url))),
            },
        }),
        {
            name: "solid-start:virtual-modules",
            async resolveId(id) {
                const { filename, query } = parseIdQuery(id);
                let base;
                if (filename === VIRTUAL_MODULES.clientEntry)
                    base = handlers.client;
                if (filename === VIRTUAL_MODULES.serverEntry)
                    base = handlers.server;
                if (filename === VIRTUAL_MODULES.app)
                    base = appEntryPath;
                if (base) {
                    let id = (await this.resolve(base))?.id;
                    if (!id)
                        return;
                    if (query.size > 0)
                        id += `?${query.toString()}`;
                    return id;
                }
            },
        },
        {
            name: "solid-start:capture-client-bundle",
            enforce: "post",
            generateBundle(options, bundle) {
                globalThis.START_CLIENT_BUNDLE = bundle;
                globalThis.START_CLIENT_OUT_DIR = options.dir;
            },
        },
        devServer(),
        solid({
            ...start.solid,
            ssr: true,
            extensions: extensions.map(ext => `.${ext}`),
        }),
    ];
}
