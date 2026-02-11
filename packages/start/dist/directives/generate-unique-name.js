import * as t from "@babel/types";
export function generateUniqueName(path, name) {
    let uid;
    let i = 1;
    do {
        uid = name + "_" + i;
        i++;
    } while (path.scope.hasLabel(uid) ||
        path.scope.hasBinding(uid) ||
        path.scope.hasGlobal(uid) ||
        path.scope.hasReference(uid));
    const program = path.scope.getProgramParent();
    program.references[uid] = true;
    program.uids[uid] = true;
    return t.identifier(uid);
}
