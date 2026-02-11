export function isStatementTopLevel(path) {
    let blockParent = path.scope.getBlockParent();
    const programParent = path.scope.getProgramParent();
    // a FunctionDeclaration binding refers to itself as the block parent
    if (blockParent.path === path) {
        blockParent = blockParent.parent;
    }
    return programParent === blockParent;
}
