import { type Component } from "solid-js";
export declare function cloneServerReference(id: string): (...args: any[]) => Promise<unknown>;
export declare function createClientReference(Component: Component<any>, id: string): Component<any>;
