import { ErrorParsed } from "./parseOutputTsc"

export function filterErrors(errorsTsc: ErrorParsed[], fileNamesString: string): ErrorParsed[] {

    const fileNames = fileNamesString.split(" ")
    return errorsTsc.filter(tsErr => {
        return fileNames.includes(tsErr.file)
    })
}