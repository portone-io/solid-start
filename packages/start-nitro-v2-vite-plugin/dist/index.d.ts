import { type Nitro, type NitroConfig } from "nitropack";
import type { PluginOption } from "vite";
export type UserNitroConfig = Omit<NitroConfig, "dev" | "publicAssets" | "renderer">;
export declare function nitroV2Plugin(nitroConfig?: UserNitroConfig): PluginOption;
export declare function buildNitroEnvironment(nitro: Nitro, build: () => Promise<any>): Promise<void>;
