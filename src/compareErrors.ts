import { warning } from '@actions/core'
import { ErrorTs } from './main'

export type FileWithLineNumbers = { path: string, added: number[], removed: number[] }

export type CompareErrorsInput = {
    errorsBefore: ErrorTs[]
    errorsAfter: ErrorTs[]
    filesChanged: string[]
    filesAdded: string[]
    filesDeleted: string[]
    lineNumbers: FileWithLineNumbers[]
}

type Result = {
    errorsAdded: ErrorTs[]
}

/**
 * A partir des erreurs ts de la base branche
 */
export function compareErrors({ errorsBefore, errorsAfter, filesChanged, filesAdded, lineNumbers }: CompareErrorsInput): Result {

    /*
    on va déterminer numéro de ligne dans correspondant dans le fichier modifié dans la PR
    */
    const errorsBeforeTransformed: (ErrorTs & { lineInPr: number })[] = errorsBefore.map(errBefore => {

        const isModified = filesChanged.includes(errBefore.fileName)
        if (!isModified) {
            return {
                ...errBefore,
                lineInPr: parseInt(errBefore.line)
            }
        }

        const lineNumbersForThisFile = lineNumbers.find(o => o.path === errBefore.fileName)
        if (!lineNumbersForThisFile) {
            warning(`Impossible de trouver les line numbers pour le fichier ${errBefore.fileName}`)
            return {
                ...errBefore,
                lineInPr: parseInt(errBefore.line)
            }
        }
        const linesAddedBeforeLine = lineNumbersForThisFile.added.filter(n => n <= parseInt(errBefore.line))
        const linesRemoveBeforeLine = lineNumbersForThisFile.removed.filter(n => n <= parseInt(errBefore.line))
        const newLineNumber = parseInt(errBefore.line) + linesAddedBeforeLine.length - linesRemoveBeforeLine.length
        return {
            ...errBefore,
            lineInPr: newLineNumber
        }
    })

    const errorsAdded: ErrorTs[] = errorsAfter.reduce((newErrors, errAfter) => {

        const isErrorInNewFile = filesAdded.includes(errAfter.fileName)
        if (isErrorInNewFile) {
            newErrors.push(errAfter)
            return newErrors
        }
        let isNew = true
        const isStrictlySameExisting = errorsBeforeTransformed.find(errBefore => {
            const isInSameFile = errBefore.fileName === errAfter.fileName
            return isInSameFile && errBefore.code === errAfter.code && errAfter.message === errBefore.message && errBefore.lineInPr === parseInt(errAfter.line)
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
        errorsAdded
    }

}
