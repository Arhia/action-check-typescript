import { ErrorTs } from "./compile"
import ts from "typescript"

export function filterErrors(errorsTsc: ErrorTs[], fileNames: string[]): ErrorTs[] {

    return errorsTsc.filter(tsErr => {
        return fileNames.includes(tsErr.fileName)
    })
}