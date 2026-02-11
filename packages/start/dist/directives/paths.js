export function isPathValid(path, key) {
    const node = path.node;
    return node ? key(node) : false;
}
export function isNestedExpression(node) {
    switch (node.type) {
        case "ParenthesizedExpression":
        case "TypeCastExpression":
        case "TSAsExpression":
        case "TSSatisfiesExpression":
        case "TSNonNullExpression":
        case "TSTypeAssertion":
        case "TSInstantiationExpression":
            return true;
        default:
            return false;
    }
}
export function unwrapNode(node, key) {
    if (key(node)) {
        return node;
    }
    if (isNestedExpression(node)) {
        return unwrapNode(node.expression, key);
    }
    return undefined;
}
export function unwrapPath(path, key) {
    if (isPathValid(path, key)) {
        return path;
    }
    if (isPathValid(path, isNestedExpression)) {
        return unwrapPath(path.get("expression"), key);
    }
    return undefined;
}
