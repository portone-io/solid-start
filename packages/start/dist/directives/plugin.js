import * as t from "@babel/types";
import { bubbleFunctionDeclaration } from "./bubble-function-declaration.js";
import { generateUniqueName } from "./generate-unique-name.js";
import { getDescriptiveName } from "./get-descriptive-name.js";
import { getImportIdentifier } from "./get-import-identifier.js";
import { getRootStatementPath } from "./get-root-statement-path.js";
import { isStatementTopLevel } from "./is-statement-top-level.js";
import { isPathValid, unwrapPath } from "./paths.js";
import { removeUnusedVariables } from "./remove-unused-variables.js";
function isValidFunction(node) {
    return t.isArrowFunctionExpression(node) || t.isFunctionExpression(node);
}
function isDirectiveValid(ctx, directives) {
    for (let i = 0, len = directives.length; i < len; i++) {
        if (directives[i].value.value === ctx.directive) {
            return true;
        }
    }
    return false;
}
function cleanDirectives(path, target) {
    const newDirectives = [];
    for (let i = 0, len = path.node.directives.length; i < len; i++) {
        const current = path.node.directives[i];
        if (current.value.value !== target) {
            newDirectives.push(current);
        }
    }
    path.node.directives = newDirectives;
}
function cleanFunctionDirectives(ctx, path) {
    const body = path.get("body");
    if (isPathValid(body, t.isBlockStatement)) {
        cleanDirectives(body, ctx.directive);
    }
}
function isFunctionDirectiveValid(ctx, path) {
    const body = path.get("body");
    if (isPathValid(body, t.isBlockStatement)) {
        return isDirectiveValid(ctx, body.node.directives);
    }
    return false;
}
function createID(ctx, name) {
    const base = `${ctx.hash}-${ctx.count++}`;
    if (ctx.env === "development") {
        return `${base}-${name}`;
    }
    return base;
}
function transformFunction(ctx, path, direct) {
    if (!direct) {
        if (!isFunctionDirectiveValid(ctx, path)) {
            return;
        }
        cleanFunctionDirectives(ctx, path);
    }
    // First, get root statement
    const rootStatement = getRootStatementPath(path);
    // Create a unique ID for the function
    const fnID = createID(ctx, getDescriptiveName(path, "anonymous"));
    if (ctx.mode === "server") {
        // Create a "source" function on the root-level
        const sourceReference = t.callExpression(getImportIdentifier(ctx.imports, path, ctx.definitions.register), [t.stringLiteral(fnID), path.node]);
        const sourceID = generateUniqueName(path, "serverFn");
        rootStatement.insertBefore(t.variableDeclaration("const", [t.variableDeclarator(sourceID, sourceReference)]));
        // Clone the source function to replace the server function
        path.replaceWith(t.callExpression(getImportIdentifier(ctx.imports, path, ctx.definitions.clone), [sourceID]));
    }
    else {
        // Otherwise, clone the function based on its ID
        path.replaceWith(t.callExpression(getImportIdentifier(ctx.imports, path, ctx.definitions.clone), [
            t.stringLiteral(fnID),
        ]));
    }
    path.scope.crawl();
}
function traceBinding(path, name) {
    const current = path.scope.getBinding(name);
    if (!current) {
        return undefined;
    }
    switch (current.kind) {
        case "const":
        case "let":
        case "var": {
            if (isPathValid(current.path, t.isVariableDeclarator)) {
                // Check if left is identifier
                const left = unwrapPath(current.path.get("id"), t.isIdentifier);
                if (left) {
                    const right = unwrapPath(current.path.get("init"), t.isIdentifier);
                    if (right) {
                        return traceBinding(path, right.node.name);
                    }
                    // Only valid for functions
                    const func = unwrapPath(current.path.get("init"), isValidFunction);
                    if (func) {
                        return current;
                    }
                }
            }
            return undefined;
        }
        case "hoisted":
        case "local":
        case "module":
        case "param":
        case "unknown":
            return undefined;
    }
}
function transformBindingForServer(ctx, binding) {
    if (isPathValid(binding.path, t.isVariableDeclarator)) {
        const right = unwrapPath(binding.path.get("init"), isValidFunction);
        if (right) {
            transformFunction(ctx, right, true);
        }
    }
}
function transformModuleLevelDirective(ctx, program) {
    cleanDirectives(program, ctx.directive);
    program.traverse({
        FunctionDeclaration(child) {
            // We only need to move top-level functions
            if (isStatementTopLevel(child)) {
                bubbleFunctionDeclaration(child);
            }
        },
    });
    program.scope.crawl();
    if (ctx.mode === "server") {
        // Trace bindings
        const bindings = new Set();
        program.traverse({
            ExportDefaultDeclaration(path) {
                const id = unwrapPath(path.get("declaration"), t.isIdentifier);
                if (id) {
                    const binding = traceBinding(path, id.node.name);
                    if (binding) {
                        bindings.add(binding);
                    }
                }
            },
            ExportNamedDeclaration(path) {
                if (path.node.source || path.node.exportKind === "type") {
                    return;
                }
                for (const specifier of path.get("specifiers")) {
                    if (isPathValid(specifier, t.isExportSpecifier)) {
                        const binding = traceBinding(specifier, specifier.node.local.name);
                        if (binding) {
                            bindings.add(binding);
                        }
                    }
                }
                const declarations = path.get("declaration");
                if (isPathValid(declarations, t.isVariableDeclaration)) {
                    for (const declaration of declarations.get("declarations")) {
                        // Check if left is identifier
                        const left = unwrapPath(declaration.get("id"), t.isIdentifier);
                        if (left) {
                            const binding = traceBinding(left, left.node.name);
                            if (binding) {
                                bindings.add(binding);
                            }
                        }
                    }
                }
            },
        });
        for (const binding of bindings) {
            transformBindingForServer(ctx, binding);
        }
    }
    else {
        // Trace bindings
        const uniqueBindings = new Set();
        const exportedBindings = new Map();
        program.traverse({
            ExportDefaultDeclaration(path) {
                const id = unwrapPath(path.get("declaration"), t.isIdentifier);
                if (id) {
                    const binding = traceBinding(path, id.node.name);
                    if (binding) {
                        uniqueBindings.add(binding);
                        exportedBindings.set("default", binding);
                    }
                }
            },
            ExportNamedDeclaration(path) {
                if (path.node.source || path.node.exportKind === "type") {
                    return;
                }
                for (const specifier of path.get("specifiers")) {
                    if (isPathValid(specifier, t.isExportSpecifier)) {
                        const binding = traceBinding(specifier, specifier.node.local.name);
                        if (binding) {
                            const key = t.isIdentifier(specifier.node.exported)
                                ? specifier.node.exported.name
                                : specifier.node.exported.value;
                            uniqueBindings.add(binding);
                            exportedBindings.set(key, binding);
                        }
                    }
                }
                const declarations = path.get("declaration");
                if (isPathValid(declarations, t.isVariableDeclaration)) {
                    for (const declaration of declarations.get("declarations")) {
                        // Check if left is identifier
                        const left = unwrapPath(declaration.get("id"), t.isIdentifier);
                        if (left) {
                            const binding = traceBinding(left, left.node.name);
                            if (binding) {
                                uniqueBindings.add(binding);
                                exportedBindings.set(left.node.name, binding);
                            }
                        }
                    }
                }
            },
        });
        // generate ids for each unique binding
        const sourceIDs = new Map();
        for (const binding of uniqueBindings) {
            if (isPathValid(binding.path, t.isVariableDeclarator)) {
                const init = unwrapPath(binding.path.get("init"), isValidFunction);
                if (init) {
                    sourceIDs.set(binding, createID(ctx, getDescriptiveName(init, "anonymous")));
                }
            }
        }
        // clear body
        program.node.body = [];
        const declarations = [];
        const specifiers = [];
        const declarationMap = new Map();
        // Declare all client functions
        for (const [exported, binding] of exportedBindings) {
            let currentIdentifier = declarationMap.get(binding);
            if (!currentIdentifier) {
                currentIdentifier = generateUniqueName(program, "fn");
                const fnID = sourceIDs.get(binding);
                if (fnID) {
                    declarations.push(t.variableDeclarator(currentIdentifier, t.callExpression(getImportIdentifier(ctx.imports, program, ctx.definitions.clone), [
                        t.stringLiteral(fnID),
                    ])));
                    declarationMap.set(binding, currentIdentifier);
                }
            }
            if (currentIdentifier) {
                specifiers.push(t.exportSpecifier(currentIdentifier, t.stringLiteral(exported)));
            }
        }
        const body = [];
        if (declarations.length > 0) {
            body.push(t.variableDeclaration("const", declarations));
        }
        if (specifiers.length > 0) {
            body.push(t.exportNamedDeclaration(null, specifiers, null));
        }
        program.pushContainer("body", body);
    }
}
export function directivesPlugin() {
    return {
        name: "solid-start:directives",
        visitor: {
            Program(program, ctx) {
                const isModuleLevel = isDirectiveValid(ctx.opts, program.node.directives);
                if (isModuleLevel) {
                    transformModuleLevelDirective(ctx.opts, program);
                    ctx.opts.valid = true;
                }
                else {
                    // First, bubble up function declarations
                    program.traverse({
                        FunctionDeclaration(child) {
                            // if (isFunctionDirectiveValid(ctx.opts, child)) {
                            bubbleFunctionDeclaration(child);
                            // }
                        },
                    });
                    program.scope.crawl();
                    // Now we transform each function
                    program.traverse({
                        ArrowFunctionExpression(path) {
                            transformFunction(ctx.opts, path, false);
                        },
                        FunctionExpression(path) {
                            transformFunction(ctx.opts, path, false);
                        },
                    });
                    program.scope.crawl();
                    if (ctx.opts.count > 0) {
                        ctx.opts.valid = true;
                        removeUnusedVariables(program);
                    }
                }
            },
        },
    };
}
