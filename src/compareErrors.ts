import { ErrorTs } from "./tsc/compileTsFiles"

enum TYPE_MODIF {
    MODIF = 1,
    AJOUT = 2,
    SUPPRESSION = 3
}

type LineModif = {
    lineNumber: number
    added: number
    removed: number
}

type FileModif = {
    fileName: string
    typeModif: TYPE_MODIF
    lineModifs: LineModif[]
}


type Input = {
    errorsBefore: ErrorTs[]
    errorsAfter: ErrorTs[]
    filesModifs: FileModif[]
}

type Result = {
    errorsAdded: ErrorTs[]
    errorsRemoved: ErrorTs[]
    errorsSame: ErrorTs[]
}

/**
 * A partir des erreurs ts de la base branche
 */
export function compareErrors({ errorsBefore, errorsAfter, filesModifs }: Input): Result {

    const errorsAdded: ErrorTs[] = []
    const errorsRemoved: ErrorTs[] = []
    const errorsSame: ErrorTs[] = []

    errorsAfter.reduce((newErrors, errAfter) => {
        let isNew = true
        const errorsInSameFile = errorsBefore.filter(err => err.fileName === errAfter.fileName)
        const isStrictlySameExisting = errorsInSameFile.find(err => {
            return err.code === errAfter.code && errAfter.message === err.message && err.line === errAfter.line
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

/*


const finalErrors = finalOptions.keepOnlyRelatedFiles ? errors.filter(err => {
        return fileNames.includes(err.fileName)
    }) : errors

    const errorsByFile: {
        fileName: string
        errors: ErrorTs[]
    }[] = []

    finalErrors.forEach(err => {
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

    if (errorsByFile.length) {
        console.warn("-".repeat(100))
        console.warn(`${finalErrors.length} erreurs ont été trouvées dans ${fileNames.length} fichiers :`)
        console.warn("-".repeat(100))
        errorsByFile.forEach(errByFile => {
            console.warn(`Fichier ${errByFile.fileName} : ${errByFile.errors.length} erreurs détectées :`)
            errByFile.errors.forEach(err => {
                console.log(`(${err.line},${err.character}) : ${err.message}`)
            })
        })
    }
    */