import { type Plugin } from "vite";
declare const LOADERS: {
    node: string;
    "cloudflare-workers": string;
    "netlify-edge": string;
};
export interface EnvPluginOptions {
    server?: {
        runtime?: keyof typeof LOADERS | (string & {});
        load?: (mode: string) => Record<string, string>;
        prefix?: string;
    };
    client?: {
        load?: (mode: string) => Record<string, string>;
        prefix?: string;
    };
}
export declare function envPlugin(options?: EnvPluginOptions): Plugin;
export {};
