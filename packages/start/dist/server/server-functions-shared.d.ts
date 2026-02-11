export declare const BODY_FORMAT_KEY = "X-Start-Type";
export declare const BODY_FORMAL_FILE = "__START__";
export declare const enum BodyFormat {
    Seroval = "0",
    String = "1",
    FormData = "2",
    URLSearchParams = "3",
    Blob = "4",
    File = "5",
    ArrayBuffer = "6",
    Uint8Array = "7"
}
export declare function getHeadersAndBody(body: any): {
    headers?: HeadersInit;
    body: BodyInit;
} | undefined;
export declare function extractBody(instance: string, client: boolean, source: Request | Response): Promise<unknown>;
