import { ErrorTs } from "./main"

type Input = {
    errors: ErrorTs[]
    fileNames: string[]
}

type ErrorsByFile = {
    fileName: string
    errors: ErrorTs[]
}

type Result = {
    info: string
    errorsByFile: ErrorsByFile[]
}

export function formatErrorsByFiles({ fileNames, errors }: Input): Result {

    const errorsByFile: ErrorsByFile[] = []

    errors.forEach(err => {
        const errByFileFound = errorsByFile.find(o => o.fileName === err.fileName)
        if (errByFileFound) {
            errByFileFound.errors.push(err)
        } else {
            errorsByFile.push({
                fileName: err.fileName,
                errors: [err]
            })
        }
    })

    let s = ''

    const filesWithoutError = fileNames.filter(fileName => {
        const hasErrors = !!errorsByFile.find(o => o.fileName === fileName)
        return !hasErrors
    })

    if (filesWithoutError.length) {
        s += `\n`
        s += `=`.repeat(50)
        s += `${filesWithoutError.length} fichiers sans aucune erreur ts : `
        s += `=`.repeat(50)
        s += `\n`
        filesWithoutError.forEach(fileName => {
            s += fileName
        })
    }

    if (errorsByFile.length) {
        const sTotal = errors.length > 1 ? 's' : ''
        s += "\n"
        s += "=".repeat(110)
        s += `${errors.length} erreur${sTotal} ${errors.length > 1 ? 'ont' : 'a'} été trouvée${sTotal} dans les ${fileNames.length} fichiers`
        s += "=".repeat(110)
        errorsByFile.forEach(errByFile => {
            const nbErreurs = errByFile.errors.length
            const letterS = nbErreurs > 1 ? 's' : ''
            s += "\n"
            s += "-".repeat(100)
            s += `Fichier ${errByFile.fileName} : ${errByFile.errors.length} erreur${letterS} détectée${letterS} :`
            s += "-".repeat(100)
            s += "\n"
            errByFile.errors.forEach(err => {
                s += `(${err.line},${err.column}) : ${err.message}`
            })
        })
    }

    return {
        info: s,
        errorsByFile
    }

}