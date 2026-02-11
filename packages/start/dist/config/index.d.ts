import { type PluginOption } from "vite";
import { type Options as SolidOptions } from "vite-plugin-solid";
import { type EnvPluginOptions } from "./env.ts";
export interface SolidStartOptions {
    solid?: Partial<SolidOptions>;
    ssr?: boolean;
    routeDir?: string;
    extensions?: string[];
    middleware?: string;
    serialization?: {
        /**
         * The serialization mode to use for server functions/actions.
         * The "js" mode uses a custom binary format that is more efficient than JSON, but requires a custom deserializer (with `eval()`) on the client.
         * A strong CSP should block `eval()` executions, which would prevent the "js" mode from working.
         * The "json" mode uses JSON for serialization, which is less efficient but can be deserialized with `JSON.parse` on the client.
         *
         * @default "json"
         */
        mode?: "js" | "json";
    };
    env?: EnvPluginOptions;
}
export declare function solidStart(options?: SolidStartOptions): Array<PluginOption>;
