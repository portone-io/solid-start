export declare function registerServerFunction<T extends any[], R>(id: string, callback: (...args: T) => Promise<R>): (...args: T) => Promise<R>;
export declare function getServerFunction<T extends any[], R>(id: string): ((...args: T) => Promise<R>);
