// @refresh skip
import { onCleanup } from "solid-js";
import { getRequestEvent, isServer } from "solid-js/web";
import { appendHeader, setHeader } from "../http/index.js";
/**
 *
 * Read more: https://docs.solidjs.com/solid-start/reference/server/http-header
 */
export const HttpHeader = isServer
    ? (props) => {
        const event = getRequestEvent();
        if (props.append)
            appendHeader(props.name, props.value);
        else
            setHeader(props.name, props.value);
        onCleanup(() => {
            // @ts-expect-error
            if (event.nativeEvent.handled || event.complete)
                return;
            const value = event.response.headers.get(props.name);
            if (!value)
                return;
            if (!value.includes(", ")) {
                if (value === props.value)
                    event.response.headers.delete(props.name);
                return;
            }
            const values = value.split(", ");
            const index = values.indexOf(props.value);
            index !== -1 && values.splice(index, 1);
            if (values.length)
                event.response.headers.set(props.name, values.join(","));
            else
                event.response.headers.delete(props.name);
        });
        return null;
    }
    : (_props) => null;
