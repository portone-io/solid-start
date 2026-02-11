import type * as t from "@babel/types";
type TypeFilter<V extends t.Node> = (node: t.Node) => node is V;
export declare function isPathValid<V extends t.Node>(path: unknown, key: TypeFilter<V>): path is babel.NodePath<V>;
export type NestedExpression = t.ParenthesizedExpression | t.TypeCastExpression | t.TSAsExpression | t.TSSatisfiesExpression | t.TSNonNullExpression | t.TSInstantiationExpression | t.TSTypeAssertion;
export declare function isNestedExpression(node: t.Node): node is NestedExpression;
type TypeCheck<K> = K extends TypeFilter<infer U> ? U : never;
export declare function unwrapNode<K extends (value: t.Node) => boolean>(node: t.Node, key: K): TypeCheck<K> | undefined;
export declare function unwrapPath<V extends t.Node>(path: unknown, key: TypeFilter<V>): babel.NodePath<V> | undefined;
export {};
