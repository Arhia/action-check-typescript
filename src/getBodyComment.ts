import { ErrorTs } from "./tsc/compileTsFiles"

const BLANK_LINE = '  \n'

type Input = {
    errorsInProjectBefore: ErrorTs[]
    errorsInProjectAfter: ErrorTs[]
    newErrorsInProject: ErrorTs[]
    errorsInModifiedFiles: ErrorTs[]
    newErrorsInModifiedFiles: ErrorTs[]
}

export function getBodyComment({ errorsInProjectBefore, errorsInProjectAfter, newErrorsInProject, errorsInModifiedFiles, newErrorsInModifiedFiles }: Input): string {

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

    if (!errorsInModifiedFiles.length) {
        s += `No Typescript error in files changed in this PR ! 🎉 \n`
        s += BLANK_LINE
    } else {
        s += `**${errorsInModifiedFiles.length} Typescript errors detected in the modified files.**  \n`
        s += BLANK_LINE
        s += getListOfErrors(`Details`, errorsInModifiedFiles)
        s += BLANK_LINE
    }

    if (newErrorsInModifiedFiles.length > 0) {
        s += `**${newErrorsInModifiedFiles.length} new errors added**  \n`
        s += `*nb : new errors can be just same errors but with different locations*`
        s += BLANK_LINE
        s += getListOfErrors(`Details`, newErrorsInModifiedFiles)
        s += BLANK_LINE
    }

    s += BLANK_LINE
    s += BLANK_LINE
    s += '<a href="https://github.com/Arhia/action-check-typescript"><sub>Arhia/action-check-typescript</sub></a>'

    return s

}

function getListOfErrors(title: string, errors: ErrorTs[], thresholdCollapse = 0): string {

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
        return `${err.fileNameResolved}|${err.line}, ${err.character}|${err.message}`
    }).join('\n')


    if (shouldUseCollapsible) {
        s += BLANK_LINE
        s += `</details>  \n`
    }

    return s

}