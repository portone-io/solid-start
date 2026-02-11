import type * as babel from "@babel/core";
import * as t from "@babel/types";
import type { ImportDefinition } from "./types.ts";
export declare function getImportIdentifier(imports: Map<string, t.Identifier>, path: babel.NodePath, registration: ImportDefinition): t.Identifier;
