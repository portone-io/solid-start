import type { Middleware } from "h3";
import type { FetchEvent } from "../server/types.ts";
/** Function responsible for receiving an observable [operation]{@link Operation} and returning a [result]{@link OperationResult}. */
export type MiddlewareFn = (event: FetchEvent) => Promise<unknown> | unknown;
/** This composes an array of Exchanges into a single ExchangeIO function */
export type RequestMiddleware = (event: FetchEvent) => Response | Promise<Response> | void | Promise<void> | Promise<void | Response>;
type EventHandlerResponse<T = any> = T | Promise<T>;
type ResponseMiddlewareResponseParam = {
    body?: Awaited<EventHandlerResponse>;
};
export type ResponseMiddleware = (event: FetchEvent, response: ResponseMiddlewareResponseParam) => Response | Promise<Response> | void | Promise<void>;
/**
 * Creates middleware for handling requests and responses.
 *
 * @see https://docs.solidjs.com/solid-start/reference/server/create-middleware
/**
 * Creates request/response middlewares via H3.
 *
 * Accepts an array of H3 {@link Middleware}
 *
 * @tip To run your middleware before response, `await next()` in your function block.
 *@example
 * const middleware = createMiddleware([
 *   async (event, next) => {
 *     const resp = await next();
 *     if (resp instanceof Response) return resp;
 *     return new Response("Not found", { status: 404 });
 *   },
 * ]);
 *
 */
export declare function createMiddleware(args: {
    /** @deprecated Use H3 `Middleware` */
    onRequest?: RequestMiddleware | RequestMiddleware[] | undefined;
    /** @deprecated Use H3 `Middleware` */
    onBeforeResponse?: ResponseMiddleware | ResponseMiddleware[] | undefined;
} | Middleware[]): Middleware[];
export {};
