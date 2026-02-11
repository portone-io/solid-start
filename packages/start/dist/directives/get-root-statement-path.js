import * as t from "@babel/types";
export function getRootStatementPath(path) {
    let current = path.parentPath;
    while (current) {
        const next = current.parentPath;
        if (next && t.isProgram(next.node)) {
            return current;
        }
        current = next;
    }
    return path;
}
