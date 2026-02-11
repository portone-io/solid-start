const REGISTRATIONS = new Map();
export function registerServerFunction(id, callback) {
    REGISTRATIONS.set(id, callback);
    return callback;
}
export function getServerFunction(id) {
    const fn = REGISTRATIONS.get(id);
    if (fn) {
        return fn;
    }
    throw new Error('invalid server function: ' + id);
}
