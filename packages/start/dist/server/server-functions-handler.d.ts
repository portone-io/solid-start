import { type H3Event } from "h3";
import "solidstart:server-fn-manifest";
import type { FetchEvent } from "./types.ts";
export declare function handleServerFunction(h3Event: H3Event): Promise<unknown>;
export declare function createSingleFlightHeaders(sourceEvent: FetchEvent): Headers;
