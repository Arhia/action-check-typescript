import { ErrorParsed } from "./parseOutputTsc"

export function compareErrors(errorsBefore: ErrorParsed[], errorsAfter: ErrorParsed[]): ErrorParsed[] {

    return errorsAfter.reduce((newErrors, errAfter) => {
        let isNew = true
        const errorsInSameFile = errorsBefore.filter(err => err.file === errAfter.file)
        const isStrictlySameExisting = errorsInSameFile.find(err => {
            return err.code === errAfter.code && err.severity === errAfter.severity && errAfter.message === err.message && err.line === errAfter.line && err.column === errAfter.column
        })
        if (isStrictlySameExisting) {
            isNew = false
        }
        if (isNew) {
            newErrors.push(errAfter)
        }
        return newErrors
    }, [] as ErrorParsed[])

}