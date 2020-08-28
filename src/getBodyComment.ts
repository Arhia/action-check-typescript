import { ErrorParsed } from './parseOutputTsc'

interface Cfg {
    errorsInProjectBefore: ErrorParsed[]
    errorsInProjectAfter: ErrorParsed[]
    errorsInPr?: ErrorParsed[]
    newErrorsInPr: ErrorParsed[]
}

export function getBodyComment({ errorsInProjectBefore, errorsInProjectAfter, errorsInPr, newErrorsInPr }: Cfg): string {

    const delta = errorsInProjectAfter.length - errorsInProjectBefore.length
    let s = ``

    if (!errorsInProjectAfter.length) {
        s = `No Typescript error in the project ! 🎉`
        if (delta < 0) {
            s += `You have remove ${-delta} errors in the code 💪`
        }
        return s
    }

    s += `${errorsInProjectAfter.length} Typescript errors detected in the project 😟.  \n`
    if (delta < 0) {
        s += `You have remove ${-delta} errors in the code 👏`
    } else {
        s += `You have added ${delta} errors in the code 😥`
    }
    s += `<details><summary>Details of errors in project</summary>  \n${getListOfErrors(errorsInProjectAfter)}</details>  \n`

    if (!errorsInPr) {
        return s
    }

    if (!errorsInPr.length) {
        s += `No Typescript error in files changed in the PR ! 🎉 \n`
        return s
    }

    s += `${errorsInPr.length} Typescript errors detected in the modified files.  \n`
    s += `<details><summary>Details of errors</summary>  \n${getListOfErrors(errorsInPr)}</details>  \n`

    if (newErrorsInPr.length > 0) {
        s += `${newErrorsInPr.length} new errors added (nb : new errors can be just errors with different locations)\n`
        s += `<details><summary>Details of errors</summary>  \n${getListOfErrors(newErrorsInPr)}</details>  \n`
    }

    return s

}

function getListOfErrors(errors: ErrorParsed[]): string {

    const header = `\nFilename|Location|Message'\n`
    const separator = `-- | -- | -- \n`
    const rows = errors.map(err => {
        return `${err.file}|${err.line}, ${err.column}|${err.message}`
    }).join('\n')

    return header + separator + rows

}