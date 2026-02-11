import { NoHydration, getRequestEvent, ssr } from "solid-js/web";
import { getSsrManifest } from "../manifest/ssr-manifest.js";
import { TopErrorBoundary } from "../../shared/ErrorBoundary.jsx";
import { useAssets } from "../assets/index.js";
import PatchVirtualDevStyles from "../assets/PatchVirtualDevStyles.jsx";
const docType = ssr("<!DOCTYPE html>");
/**
 *
 * Read more: https://docs.solidjs.com/solid-start/reference/server/start-server
 */
export function StartServer(props) {
    const context = getRequestEvent();
    // @ts-ignore
    const nonce = context.nonce;
    useAssets(context.assets, nonce);
    return (<NoHydration>
      {docType}
      <TopErrorBoundary>
        <props.document scripts={<>
              <PatchVirtualDevStyles nonce={nonce}/>
              <script type="module" src={getSsrManifest("client").path(import.meta.env.START_CLIENT_ENTRY)}/>
            </>}/>
      </TopErrorBoundary>
    </NoHydration>);
}
