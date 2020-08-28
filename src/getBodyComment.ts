import { ErrorParsed } from './parseOutputTsc'

const BLANK_LINE = '  \n'
interface Cfg {
    errorsInProjectBefore: ErrorParsed[]
    errorsInProjectAfter: ErrorParsed[]
    errorsInPr: ErrorParsed[]
    newErrorsInPr: ErrorParsed[]
}

export function getBodyComment({ errorsInProjectBefore, errorsInProjectAfter, errorsInPr, newErrorsInPr }: Cfg): string {

    const delta = errorsInProjectAfter.length - errorsInProjectBefore.length
    let s = `## Tsc check  \n`

    const areStillErrors = !!errorsInProjectAfter.length

    if (areStillErrors) {
        if (delta < 0) {
            s += BLANK_LINE
            s += `You have remove ${-delta} errors with this PR 👏  \n`
            s += BLANK_LINE
        } else if (delta > 0) {
            s += BLANK_LINE
            s += `You have added ${delta} errors whith this PR 😥  \n`
            s += BLANK_LINE
        }
        s += `**${errorsInProjectAfter.length} Typescript errors detected in all the codebase 😟.**  \n`
        s += getListOfErrors(`Details`, errorsInProjectAfter)
        s += BLANK_LINE
        s += BLANK_LINE

    }

    if (!areStillErrors) {
        s += `No Typescript error in the codebase ! 🎉  \n`
        s += BLANK_LINE
        if (delta < 0) {
            s += `You have remove ${-delta} Typescript errors with this PR 💪  \n`
            s += BLANK_LINE
        }
        return s
    }


    if (!errorsInPr.length) {
        s += `No Typescript error in files changed in this PR ! 🎉 \n`
        s += BLANK_LINE
    } else {
        s += `**${errorsInPr.length} Typescript errors detected in the modified files.**  \n`
        s += BLANK_LINE
        s += getListOfErrors(`Details`, errorsInPr)
        s += BLANK_LINE
    }

    if (newErrorsInPr.length > 0) {
        s += `**${newErrorsInPr.length} new errors added (nb : new errors can be just errors with different locations)**  \n`
        s += BLANK_LINE
        s += getListOfErrors(`Details`, newErrorsInPr)
        s += BLANK_LINE
    }

    s += BLANK_LINE
    s += BLANK_LINE
    s += '<a href="https://github.com/Arhia/action-check-typescript"><sub>Arhia/action-check-typescript</sub></a>'

    return s

}

function getListOfErrors(title: string, errors: ErrorParsed[], thresholdCollapse = 0): string {

    const shouldUseCollapsible = errors.length > thresholdCollapse
    let s = ``

    if (shouldUseCollapsible) {
        s += `<details><summary>${title}</summary>  \n`
        s += BLANK_LINE
        s += BLANK_LINE
    } else {
        s += `${title}  \n`
        s += BLANK_LINE
    }

    s += `\nFilename|Location|Message\n`
    s += `-- | -- | -- \n`
    s += errors.map(err => {
        return `${err.file}|${err.line}, ${err.column}|${err.message}`
    }).join('\n')


    if (shouldUseCollapsible) {
        s += BLANK_LINE
        s += `</details>  \n`
    }

    return s

}