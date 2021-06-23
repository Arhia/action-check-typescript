import { ErrorTs } from "./tsc/compileTsFiles"
import { warning } from '@actions/core'

type Input = {
    errorsBefore: ErrorTs[]
    errorsAfter: ErrorTs[]
    filesChanged: string[]
    filesAdded: string[]
    filesDeleted: string[]
    lineNumbers: { path: string, added: number[], removed: number[] }[]
}

type Result = {
    errorsAdded: ErrorTs[]
    errorsRemoved: ErrorTs[]
    errorsSame: ErrorTs[]
}

/**
 * A partir des erreurs ts de la base branche
 */
export function compareErrors({ errorsBefore, errorsAfter, filesChanged, filesAdded, lineNumbers }: Input): Result {

    const errorsAdded: ErrorTs[] = []
    const errorsRemoved: ErrorTs[] = []
    const errorsSame: ErrorTs[] = []

    /*
    on va déterminer numéro de ligne dans correspondant dans le fichier modifié dans la PR
    */
    const errorsBeforeTransformed: (ErrorTs & { lineInPr: number })[] = errorsBefore.map(errBefore => {

        const isModified = filesChanged.includes(errBefore.fileName)
        if (!isModified) {
            return {
                ...errBefore,
                lineInPr: errBefore.line
            }
        }

        const lineNumbersForThisFile = lineNumbers.find(o => o.path === errBefore.fileName)
        if (!lineNumbersForThisFile) {
            warning(`Impossible de trouver les line numbers pour le fichier ${errBefore.fileName}`)
            return {
                ...errBefore,
                lineInPr: errBefore.line
            }
        }
        const linesAddedBeforeLine = lineNumbersForThisFile.added.filter(n => n <= errBefore.line)
        const linesRemoveBeforeLine = lineNumbersForThisFile.removed.filter(n => n <= errBefore.line)
        const newLineNumber = errBefore.line + linesAddedBeforeLine.length - linesRemoveBeforeLine.length
        return {
            ...errBefore,
            lineInPr: newLineNumber
        }
    })

    errorsAfter.reduce((newErrors, errAfter) => {

        const isErrorInNewFile = filesAdded.includes(errAfter.fileName)
        if (isErrorInNewFile) {
            newErrors.push(errAfter)
            return newErrors
        }
        let isNew = true
        const isStrictlySameExisting = errorsBeforeTransformed.find(errBefore => {
            const isInSameFile = errBefore.fileName === errAfter.fileName
            return isInSameFile && errBefore.code === errAfter.code && errAfter.message === errBefore.message && errBefore.lineInPr === errAfter.line
        })
        if (isStrictlySameExisting) {
            isNew = false
        }
        if (isNew) {
            newErrors.push(errAfter)
        }
        return newErrors
    }, [] as ErrorTs[])

    return {
        errorsAdded,
        errorsRemoved,
        errorsSame
    }

}
