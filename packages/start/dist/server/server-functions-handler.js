import { parseSetCookie } from "cookie-es";
import { parseCookies } from "h3";
import { sharedConfig } from "solid-js";
import { renderToString } from "solid-js/web";
import { provideRequestEvent } from "solid-js/web/storage";
import { getFetchEvent, mergeResponseHeaders } from "./fetchEvent.js";
import { createPageEvent } from "./handler.js";
import { deserializeFromJSONString, serializeToJSONStream, serializeToJSStream, } from "./serialization.js";
import { BODY_FORMAT_KEY, BodyFormat, extractBody, getHeadersAndBody, } from "./server-functions-shared.js";
import "solidstart:server-fn-manifest";
import { getServerFunction } from "./server-fns.js";
import { getExpectedRedirectStatus } from "./util.js";
export async function handleServerFunction(h3Event) {
    const event = getFetchEvent(h3Event);
    const request = event.request;
    const serverReference = request.headers.get("X-Server-Id");
    const instance = request.headers.get("X-Server-Instance");
    const singleFlight = request.headers.has("X-Single-Flight");
    const url = new URL(request.url);
    let functionId;
    if (serverReference) {
        // invariant(typeof serverReference === "string", "Invalid server function");
        [functionId] = serverReference.split("#");
    }
    else {
        functionId = url.searchParams.get("id");
        if (!functionId) {
            return process.env.NODE_ENV === "development"
                ? new Response("Server function not found", { status: 404 })
                : new Response(null, { status: 404 });
        }
    }
    const serverFunction = getServerFunction(functionId);
    let parsed = [];
    // grab bound arguments from url when no JS
    if (!instance || request.method === "GET") {
        const args = url.searchParams.get("args");
        if (args) {
            const result = (await deserializeFromJSONString(args));
            for (const arg of result) {
                parsed.push(arg);
            }
        }
    }
    if (request.method === "POST" && request.body !== null) {
        const bodyFormat = request.headers.get(BODY_FORMAT_KEY);
        const decoded = await extractBody("", false, request.clone());
        if (bodyFormat === BodyFormat.Seroval) {
            parsed = decoded;
        }
        else {
            parsed.push(decoded);
        }
    }
    try {
        let result = await provideRequestEvent(event, async () => {
            /* @ts-expect-error */
            sharedConfig.context = { event };
            event.locals.serverFunctionMeta = {
                id: functionId,
            };
            return serverFunction(...parsed);
        });
        if (singleFlight && instance) {
            result = await handleSingleFlight(event, result);
        }
        // handle responses
        if (result instanceof Response) {
            if (result.headers && result.headers.has("X-Content-Raw"))
                return result;
            if (instance) {
                // forward headers
                if (result.headers)
                    mergeResponseHeaders(h3Event, result.headers);
                // forward non-redirect statuses
                if (result.status && (result.status < 300 || result.status >= 400))
                    h3Event.res.status = result.status;
                if (result.customBody) {
                    result = await result.customBody();
                }
                else if (result.body == null)
                    result = null;
            }
        }
        // handle no JS success case
        if (!instance)
            return handleNoJS(result, request, parsed);
        const body = getHeadersAndBody(result);
        if (body) {
            return new Response(body.body, {
                headers: body.headers,
            });
        }
        h3Event.res.headers.set(BODY_FORMAT_KEY, BodyFormat.Seroval);
        if (import.meta.env.SEROVAL_MODE === "js") {
            h3Event.res.headers.set("content-type", "text/javascript");
            return serializeToJSStream(instance, result);
        }
        h3Event.res.headers.set("content-type", "text/plain");
        return serializeToJSONStream(result);
    }
    catch (x) {
        if (x instanceof Response) {
            if (singleFlight && instance) {
                x = await handleSingleFlight(event, x);
            }
            // forward headers
            if (x.headers)
                mergeResponseHeaders(h3Event, x.headers);
            // forward non-redirect statuses
            if (x.status && (!instance || x.status < 300 || x.status >= 400))
                h3Event.res.status = x.status;
            if (x.customBody) {
                x = await x.customBody();
            }
            else if (x.body == null)
                x = null;
            h3Event.res.headers.set("X-Error", "true");
        }
        else if (instance) {
            const error = x instanceof Error ? x.message : typeof x === "string" ? x : "true";
            h3Event.res.headers.set("X-Error", error.replace(/[\r\n]+/g, ""));
        }
        else {
            x = handleNoJS(x, request, parsed, true);
        }
        if (instance) {
            const body = getHeadersAndBody(x);
            if (body) {
                const headers = new Headers(body.headers);
                const errorHeader = h3Event.res.headers.get("X-Error");
                if (errorHeader !== null) {
                    headers.set("X-Error", errorHeader);
                }
                return new Response(body.body, {
                    headers: body.headers,
                });
            }
            h3Event.res.headers.set(BODY_FORMAT_KEY, BodyFormat.Seroval);
            if (import.meta.env.SEROVAL_MODE === "js") {
                h3Event.res.headers.set("content-type", "text/javascript");
                return serializeToJSStream(instance, x);
            }
            h3Event.res.headers.set("content-type", "text/plain");
            return serializeToJSONStream(x);
        }
        return x;
    }
}
function handleNoJS(result, request, parsed, thrown) {
    const url = new URL(request.url);
    const isError = result instanceof Error;
    let statusCode = 302;
    let headers;
    if (result instanceof Response) {
        headers = new Headers(result.headers);
        if (result.headers.has("Location")) {
            headers.set(`Location`, new URL(result.headers.get("Location"), url.origin + import.meta.env.BASE_URL).toString());
            statusCode = getExpectedRedirectStatus(result);
        }
    }
    else
        headers = new Headers({
            Location: new URL(request.headers.get("referer")).toString(),
        });
    if (result) {
        headers.append("Set-Cookie", `flash=${encodeURIComponent(JSON.stringify({
            url: url.pathname + url.search,
            result: isError ? result.message : result,
            thrown: thrown,
            error: isError,
            input: [...parsed.slice(0, -1), [...parsed[parsed.length - 1].entries()]],
        }))}; Secure; HttpOnly;`);
    }
    return new Response(null, {
        status: statusCode,
        headers,
    });
}
let App;
export function createSingleFlightHeaders(sourceEvent) {
    // cookie handling logic is pretty simplistic so this might be imperfect
    // unclear if h3 internals are available on all platforms but we need a way to
    // update request headers on the underlying H3 event.
    const headers = new Headers(sourceEvent.request.headers);
    const cookies = parseCookies(sourceEvent.nativeEvent);
    const SetCookies = sourceEvent.response.headers.getSetCookie();
    headers.delete("cookie");
    // let useH3Internals = false;
    // if (sourceEvent.nativeEvent.node?.req) {
    // 	useH3Internals = true;
    // 	sourceEvent.nativeEvent.node.req.headers.cookie = "";
    // }
    SetCookies.forEach(cookie => {
        if (!cookie)
            return;
        const { maxAge, expires, name, value } = parseSetCookie(cookie);
        if (maxAge != null && maxAge <= 0) {
            delete cookies[name];
            return;
        }
        if (expires != null && expires.getTime() <= Date.now()) {
            delete cookies[name];
            return;
        }
        cookies[name] = value;
    });
    Object.entries(cookies).forEach(([key, value]) => {
        headers.append("cookie", `${key}=${value}`);
        // useH3Internals &&
        // 	(sourceEvent.nativeEvent.node.req.headers.cookie += `${key}=${value};`);
    });
    return headers;
}
async function handleSingleFlight(sourceEvent, result) {
    let revalidate;
    let url = new URL(sourceEvent.request.headers.get("referer")).toString();
    if (result instanceof Response) {
        if (result.headers.has("X-Revalidate"))
            revalidate = result.headers.get("X-Revalidate").split(",");
        if (result.headers.has("Location"))
            url = new URL(result.headers.get("Location"), new URL(sourceEvent.request.url).origin + import.meta.env.BASE_URL).toString();
    }
    const event = { ...sourceEvent };
    event.request = new Request(url, {
        headers: createSingleFlightHeaders(sourceEvent),
    });
    return await provideRequestEvent(event, async () => {
        await createPageEvent(event);
        App || (App = (await import("solid-start:app")).default);
        /* @ts-expect-error */
        event.router.dataOnly = revalidate || true;
        /* @ts-expect-error */
        event.router.previousUrl = sourceEvent.request.headers.get("referer");
        try {
            renderToString(() => {
                /* @ts-expect-error */
                sharedConfig.context.event = event;
                App();
            });
        }
        catch (e) {
            console.log(e);
        }
        /* @ts-expect-error */
        const body = event.router.data;
        if (!body)
            return result;
        let containsKey = false;
        for (const key in body) {
            if (body[key] === undefined)
                delete body[key];
            else
                containsKey = true;
        }
        if (!containsKey)
            return result;
        if (!(result instanceof Response)) {
            body["_$value"] = result;
            result = new Response(null, { status: 200 });
        }
        else if (result.customBody) {
            body["_$value"] = result.customBody();
        }
        result.customBody = () => body;
        result.headers.set("X-Single-Flight", "true");
        return result;
    });
}
