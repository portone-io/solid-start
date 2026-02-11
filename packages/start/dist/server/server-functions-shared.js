import { deserializeJSONStream, deserializeJSStream } from "./serialization.js";
export const BODY_FORMAT_KEY = "X-Start-Type";
export const BODY_FORMAL_FILE = "__START__";
export var BodyFormat;
(function (BodyFormat) {
    BodyFormat["Seroval"] = "0";
    BodyFormat["String"] = "1";
    BodyFormat["FormData"] = "2";
    BodyFormat["URLSearchParams"] = "3";
    BodyFormat["Blob"] = "4";
    BodyFormat["File"] = "5";
    BodyFormat["ArrayBuffer"] = "6";
    BodyFormat["Uint8Array"] = "7";
})(BodyFormat || (BodyFormat = {}));
export function getHeadersAndBody(body) {
    switch (true) {
        case typeof body === "string":
            return {
                headers: {
                    "Content-Type": "text/plain",
                    [BODY_FORMAT_KEY]: BodyFormat.String,
                },
                body,
            };
        case body instanceof FormData:
            return {
                headers: {
                    [BODY_FORMAT_KEY]: BodyFormat.FormData,
                },
                body,
            };
        case body instanceof URLSearchParams:
            return {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    [BODY_FORMAT_KEY]: BodyFormat.URLSearchParams,
                },
                body,
            };
        case body instanceof File: {
            const formData = new FormData();
            formData.append(BODY_FORMAL_FILE, body, body.name);
            return {
                headers: {
                    [BODY_FORMAT_KEY]: BodyFormat.File,
                },
                body: formData,
            };
        }
        case body instanceof Blob:
            return {
                headers: {
                    [BODY_FORMAT_KEY]: BodyFormat.Blob,
                },
                body,
            };
        case body instanceof ArrayBuffer:
            return {
                headers: {
                    [BODY_FORMAT_KEY]: BodyFormat.ArrayBuffer,
                },
                body,
            };
        case body instanceof Uint8Array:
            return {
                headers: {
                    [BODY_FORMAT_KEY]: BodyFormat.Uint8Array,
                },
                body: new Uint8Array(body),
            };
        default:
            return undefined;
    }
}
export async function extractBody(instance, client, source) {
    const contentType = source.headers.get("content-type");
    const startType = source.headers.get(BODY_FORMAT_KEY);
    const clone = source.clone();
    switch (true) {
        case startType === BodyFormat.Seroval:
            if (client && import.meta.env.SEROVAL_MODE === "js") {
                return await deserializeJSStream(instance, clone);
            }
            return await deserializeJSONStream(clone);
        case startType === BodyFormat.String:
            return await clone.text();
        case startType === BodyFormat.File: {
            const formData = await clone.formData();
            return formData.get(BODY_FORMAL_FILE);
        }
        case startType === BodyFormat.FormData:
        case contentType?.startsWith("multipart/form-data"):
            return await clone.formData();
        case startType === BodyFormat.URLSearchParams:
        case contentType?.startsWith("application/x-www-form-urlencoded"):
            return new URLSearchParams(await clone.text());
        case startType === BodyFormat.Blob:
            return await clone.blob();
        case startType === BodyFormat.ArrayBuffer:
            return await clone.arrayBuffer();
        case startType === BodyFormat.Uint8Array:
            return new Uint8Array(await clone.arrayBuffer());
    }
    return undefined;
}
