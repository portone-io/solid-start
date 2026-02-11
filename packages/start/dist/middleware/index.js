// @refresh skip
import { getFetchEvent } from "../server/fetchEvent.js";
function wrapRequestMiddleware(onRequest) {
    return async (h3Event) => {
        const fetchEvent = getFetchEvent(h3Event);
        const response = await onRequest(fetchEvent);
        if (response)
            return response;
    };
}
function wrapResponseMiddleware(onBeforeResponse) {
    return async (h3Event, next) => {
        const resp = await next();
        const fetchEvent = getFetchEvent(h3Event);
        const mwResponse = await onBeforeResponse(fetchEvent, {
            body: resp,
        });
        if (mwResponse)
            return mwResponse;
    };
}
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
export function createMiddleware(args) {
    if (Array.isArray(args))
        return args;
    const mw = [];
    if (typeof args.onRequest === "function") {
        mw.push(wrapRequestMiddleware(args.onRequest));
    }
    else if (Array.isArray(args.onRequest)) {
        mw.push(...args.onRequest.map(wrapRequestMiddleware));
    }
    if (typeof args.onBeforeResponse === "function") {
        mw.push(wrapResponseMiddleware(args.onBeforeResponse));
    }
    else if (Array.isArray(args.onBeforeResponse)) {
        mw.push(...args.onBeforeResponse.map(wrapResponseMiddleware));
    }
    return mw;
}
