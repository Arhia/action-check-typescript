import { ErrorParsed } from './parseOutputTsc'

export function getBodyComment(errors: ErrorParsed[], filesChanged: string[]): string {

    const isWholeProject = !filesChanged.length

    let s = ``

    if (!errors.length) {
        s = `No Typescript error in the ${isWholeProject ? `projet` : `PR`} ! 🎉`
        return s
    }

    s = `
    ${errors.length} Typescript errors detected in the ${isWholeProject ? `projet` : `PR`}.  
    <details><summary>Details of errors</summary>${getListOfErrors(errors)}</details>
    `
    return s
}

function getListOfErrors(errors: ErrorParsed[]): string {

    const header = `Filename|Location|Message'\n`
    const separator = `-- | -- | -- \n`
    const rows = errors.map(err => {
        return `${err.file}|${err.line}, ${err.column}|${err.message}`
    }).join('\n')

    return header + separator + rows

}