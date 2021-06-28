import { ErrorTs } from "./main"

const BLANK_LINE = '  \n'

type Input = {
    errorsInProjectBefore: ErrorTs[]
    errorsInProjectAfter: ErrorTs[]
    newErrorsInProject: ErrorTs[]
    errorsInModifiedFiles: ErrorTs[]
    newErrorsInModifiedFiles: ErrorTs[]
}

export function getBodyComment({ errorsInProjectBefore, errorsInProjectAfter, errorsInModifiedFiles, newErrorsInModifiedFiles }: Input): string {

    const delta = errorsInProjectAfter.length - errorsInProjectBefore.length
    let s = `## Typescript errors check  \n`

    const areStillErrors = !!errorsInProjectAfter.length

    if (areStillErrors) {
        if (delta < 0) {
            s += BLANK_LINE
            s += `Yeah, you have remove ${-delta} errors with this PR 👏  \n`
            s += BLANK_LINE
        } else if (delta > 0) {
            s += BLANK_LINE
            s += `Ohhh you have added ${delta} errors whith this PR 😥  \n`
            s += BLANK_LINE
        }
        s += `**${errorsInProjectAfter.length} ts errors detected in all the codebase 😟.**  \n`
        s += getNbOfErrorsByFile(`Details`, errorsInProjectAfter)
        s += BLANK_LINE
        s += BLANK_LINE

    }

    if (!areStillErrors) {
        s += `No ts error in the codebase ! 🎉  \n`
        s += BLANK_LINE
        if (delta < 0) {
            s += `Congrats, you have remove ${-delta} ts errors with this PR 💪  \n`
            s += BLANK_LINE
        }
        return s
    }

    if (!errorsInModifiedFiles.length) {
        s += `Well done : no ts error in files changed in this PR ! 🎉 \n`
        s += BLANK_LINE
    } else {
        s += `**${errorsInModifiedFiles.length} ts errors detected in the modified files.**  \n`
        s += BLANK_LINE
        s += getListOfErrors(`Details`, errorsInModifiedFiles)
        s += BLANK_LINE
    }

    if (newErrorsInModifiedFiles.length > 0) {
        s += `**${newErrorsInModifiedFiles.length} new errors added**  \n`
        s += `*Note : in some cases, new errors can be just same errors but with different locations*`
        s += BLANK_LINE
        s += getListOfErrors(`Details`, newErrorsInModifiedFiles)
        s += BLANK_LINE
    }

    s += BLANK_LINE
    s += BLANK_LINE
    s += '<a href="https://github.com/Arhia/action-check-typescript"><sub>Arhia/action-check-typescript</sub></a>'

    return s

}

function getListOfErrors(title: string, errors: ErrorTs[], thresholdCollapse = 10): string {

    const shouldUseCollapsible = errors.length > thresholdCollapse
    let s = ``

    if (shouldUseCollapsible) {
        s += `<details><summary>${title}</summary>  \n`
        s += BLANK_LINE
        s += BLANK_LINE
    } else {
        s += BLANK_LINE
    }

    s += `\nFilename|Location|Message\n`
    s += `-- | -- | -- \n`
    s += errors.map(err => {
        return `${err.fileName}|${err.line}, ${err.column}|${err.message}`
    }).join('\n')


    if (shouldUseCollapsible) {
        s += BLANK_LINE
        s += `</details>  \n`
    }

    return s

}

function getNbOfErrorsByFile(title: string, errors: ErrorTs[], thresholdCollapse = 10): string {

    const errorsByFile: {
        fileName: string
        errors: ErrorTs[]
    }[] = []

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

    errorsByFile.sort((errA, errB) => {
        return -(errA.errors.length > errB.errors.length)
    })

    const shouldUseCollapsible = errorsByFile.length > thresholdCollapse
    let s = ``

    if (shouldUseCollapsible) {
        s += `<details><summary>${title}</summary>  \n`
        s += BLANK_LINE
        s += BLANK_LINE
    } else {
        s += BLANK_LINE
        s += `${title}  \n`
        s += BLANK_LINE
    }

    s += `\nFilename|Nb of errors\n`
    s += `-- | -- \n`
    s += errorsByFile.map(err => {
        return `${err.fileName}|${err.errors.length}`
    }).join('\n')


    if (shouldUseCollapsible) {
        s += BLANK_LINE
        s += `</details>  \n`
    } else {
        s += BLANK_LINE
    }

    return s

}