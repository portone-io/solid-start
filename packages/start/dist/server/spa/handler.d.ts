import type { JSX } from "solid-js";
import type { HandlerOptions, PageEvent } from "../types.ts";
/**
 *
 * Read more: https://docs.solidjs.com/solid-start/reference/server/create-handler
 */
export declare function createHandler(fn: (context: PageEvent) => JSX.Element, options?: HandlerOptions | ((context: PageEvent) => HandlerOptions)): {
    "~rou3": import("h3").RouterContext;
    request(request: import("srvx").ServerRequest | URL | string, options?: RequestInit, context?: import("h3").H3EventContext): Response | Promise<Response>;
    use(route: string, handler: import("h3").Middleware, opts?: import("h3").MiddlewareOptions): /*elided*/ any;
    use(handler: import("h3").Middleware, opts?: import("h3").MiddlewareOptions): /*elided*/ any;
    on(method: import("h3").HTTPMethod | Lowercase<import("h3").HTTPMethod> | "", route: string, handler: import("h3").HTTPHandler, opts?: import("h3").RouteOptions): /*elided*/ any;
    register(plugin: import("h3").H3Plugin): /*elided*/ any;
    mount(base: string, input: import("srvx").FetchHandler | {
        fetch: import("srvx").FetchHandler;
    } | /*elided*/ any): /*elided*/ any;
    all(route: string, handler: import("h3").HTTPHandler, opts?: import("h3").RouteOptions): /*elided*/ any;
    get(route: string, handler: import("h3").HTTPHandler, opts?: import("h3").RouteOptions): /*elided*/ any;
    post(route: string, handler: import("h3").HTTPHandler, opts?: import("h3").RouteOptions): /*elided*/ any;
    put(route: string, handler: import("h3").HTTPHandler, opts?: import("h3").RouteOptions): /*elided*/ any;
    delete(route: string, handler: import("h3").HTTPHandler, opts?: import("h3").RouteOptions): /*elided*/ any;
    patch(route: string, handler: import("h3").HTTPHandler, opts?: import("h3").RouteOptions): /*elided*/ any;
    head(route: string, handler: import("h3").HTTPHandler, opts?: import("h3").RouteOptions): /*elided*/ any;
    options(route: string, handler: import("h3").HTTPHandler, opts?: import("h3").RouteOptions): /*elided*/ any;
    connect(route: string, handler: import("h3").HTTPHandler, opts?: import("h3").RouteOptions): /*elided*/ any;
    trace(route: string, handler: import("h3").HTTPHandler, opts?: import("h3").RouteOptions): /*elided*/ any;
    readonly config: import("h3").H3Config;
    "~middleware": import("h3").Middleware[];
    "~routes": import("h3").H3Route[];
    fetch(_request: import("srvx").ServerRequest): Response | Promise<Response>;
    handler(event: import("h3").H3Event): unknown | Promise<unknown>;
    "~request"(request: import("srvx").ServerRequest, context?: import("h3").H3EventContext): Response | Promise<Response>;
    "~findRoute"(_event: import("h3").H3Event): import("h3").MatchedRoute<import("h3").H3Route> | void;
    "~getMiddleware"(event: import("h3").H3Event, route: import("h3").MatchedRoute<import("h3").H3Route> | undefined): import("h3").Middleware[];
    "~addRoute"(_route: import("h3").H3Route): void;
};
