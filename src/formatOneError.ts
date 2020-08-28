import { ErrorTs } from "./compile"

export function formatOneError(tsError: ErrorTs): string {
    return `${tsError.fileName} (${tsError.line}, ${tsError.column}): ${tsError.message}\n`
}