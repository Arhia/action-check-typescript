import { ErrorTs } from "./compile"

export function filterErrors(errorsTsc: ErrorTs[], fileNames: string[]): ErrorTs[] {

    return errorsTsc.filter(tsErr => {
        return fileNames.includes(tsErr.fileName)
    })
}