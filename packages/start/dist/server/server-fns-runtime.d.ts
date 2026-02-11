interface Registration<T extends any[], R> {
    id: string;
    fn: (...args: T) => Promise<R>;
}
export declare function createServerReference<T extends any[], R>(id: string, fn: (...args: T) => Promise<R>): Registration<T, R>;
export declare function cloneServerReference<T extends any[], R>({ id, fn }: Registration<T, R>): (...args: T) => Promise<R>;
export {};
