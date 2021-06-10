import * as ts from "typescript"

const defaultTscOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    noEmitOnError: true,
    noImplicitAny: false,
    exclude: [
        "server/test/test-typescript/**/*.ts",
        "**/*.spec.ts",
        "node_modules/"
    ]
}

type Options = {
    keepOnlyRelatedFiles: boolean
}

const defaultOptions: Options = {
    keepOnlyRelatedFiles: true
}

export type ErrorTs = {
    fileName: string
    fileNameResolved: string
    code: number
    message: string
    line: number
    character: number
}

type Input = {
    rootPath: string
    fileNames: string[]
    tsOptions?: ts.CompilerOptions
    options?: Options
}

export function compileTsFiles({ fileNames, rootPath, tsOptions, options }: Input): ErrorTs[] {

    const rootNames = [rootPath].concat(fileNames)
    const program = ts.createProgram(fileNames, {
        ...defaultTscOptions,
        ...(tsOptions ?? {})
    })

    const finalOptions: Options = {
        ...defaultOptions,
        ...(options ?? {})
    }

    const emitResult = program.emit()

    const allDiagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics)

    const errors: ErrorTs[] = []

    allDiagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
            const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!)
            const errFormated = {
                code: diagnostic.code,
                fileName: diagnostic.file.fileName.replace(rootPath, '.'),
                fileNameResolved: diagnostic.file.fileName,
                line: line + 1,
                character: character + 1,
                message: typeof diagnostic.messageText === 'string' ? diagnostic.messageText : diagnostic.messageText.messageText
            }
            const errAlreadyDetected = errors.find(err => {
                return err.fileName === errFormated.fileName
                    && err.code === errFormated.code
                    && err.line === errFormated.line
                    && err.character === errFormated.character
                    && err.message === errFormated.message
            })
            if (!errAlreadyDetected) {
                errors.push(errFormated)
            }
        } else {
            console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
        }
    })

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

    /*
    const exitCode = finalErrors.length > 0 ? 1 : 0
    console.log(`Process exiting with code '${exitCode}'.`)
    process.exit(exitCode)
    */
    return finalErrors
}