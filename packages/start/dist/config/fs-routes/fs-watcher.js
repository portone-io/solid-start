import { VITE_ENVIRONMENTS } from "../constants.js";
import { moduleId } from "./index.js";
function setupWatcher(watcher, routes) {
    watcher.on("unlink", path => routes.removeRoute(path));
    watcher.on("add", path => routes.addRoute(path));
    watcher.on("change", path => routes.updateRoute(path));
}
function createRoutesReloader(server, routes, environment) {
    routes.addEventListener("reload", handleRoutesReload);
    return () => routes.removeEventListener("reload", handleRoutesReload);
    function handleRoutesReload() {
        const envName = environment === "ssr" ? VITE_ENVIRONMENTS.server : VITE_ENVIRONMENTS.client;
        const devEnv = server.environments[envName];
        if (!devEnv?.moduleGraph)
            return;
        const mod = devEnv.moduleGraph.getModuleById(moduleId);
        if (mod) {
            const seen = new Set();
            devEnv.moduleGraph.invalidateModule(mod, seen);
        }
        if (environment !== "ssr") {
            if (mod) {
                devEnv.reloadModule(mod);
            }
            else if (devEnv.hot) {
                devEnv.hot.send({ type: "full-reload" });
            }
        }
    }
}
export const fileSystemWatcher = (routers) => {
    const plugin = {
        name: "fs-watcher",
        async configureServer(server) {
            Object.keys(routers).forEach(environment => {
                const router = globalThis.ROUTERS[environment];
                setupWatcher(server.watcher, router);
                createRoutesReloader(server, router, environment);
            });
        },
    };
    return plugin;
};
