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
    let s = ``

    if (!errorsInProjectAfter.length) {
        s += `- No Typescript error in the project ! 🎉  \n`
        s += BLANK_LINE
        if (delta < 0) {
            s += `- You have remove ${-delta} Typescript errors in the code 💪  \n`
            s += BLANK_LINE
        }
        return s
    }

    s += `${errorsInProjectAfter.length} Typescript errors detected in the project 😟.  \n`
    if (delta < 0) {
        s += `- You have remove ${-delta} errors in the code 👏  \n`
        s += BLANK_LINE
    } else {
        s += `- You have added ${delta} errors in the code 😥  \n`
        s += BLANK_LINE
    }
    s += getListOfErrors(`Details of errors in project after this PR`, errorsInProjectAfter)

    if (!errorsInPr.length) {
        s += `- No Typescript error in files changed in the PR ! 🎉 \n`
        s += BLANK_LINE
    } else {
        s += `- ${errorsInPr.length} Typescript errors detected in the modified files.  \n`
        s += BLANK_LINE
        s += getListOfErrors(`Details of errors in changed files`, errorsInPr)
        s += BLANK_LINE
    }

    if (newErrorsInPr.length > 0) {
        s += `${newErrorsInPr.length} new errors added (nb : new errors can be just errors with different locations)\n`
        s += BLANK_LINE
        s += getListOfErrors(`Details of new errors`, newErrorsInPr)
        s += BLANK_LINE
    }

    s += BLANK_LINE
    s += BLANK_LINE
    s += '<a href="https://github.com/Arhia/action-check-typescript"><sub>Arhia/action-check-typescript</sub></a>'

    return s

}

function getListOfErrors(title: string, errors: ErrorParsed[], thresholdCollapse = 5): string {

    const shouldUseCollapsible = errors.length > thresholdCollapse
    let s = ``

    if (shouldUseCollapsible) {
        s += `**<details><summary>${title}</summary>**  \n`
        s += BLANK_LINE
        s += BLANK_LINE
    } else {
        s += `- **${title}**  \n`
        s += BLANK_LINE
    }

    s += `\nFilename|Location|Message\n`
    s += `-- | -- | -- \n`
    s += errors.map(err => {
        return `${err.file}|${err.line}, ${err.column}|${err.message}`
    }).join('\n')


    if (shouldUseCollapsible) {
        s += `</details>  \n`
    }

    return s

}