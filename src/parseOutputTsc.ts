export function parseOutputTsc(output: string): ErrorParsed[] {
    const lines = output.split('\n').map(line => line.trim()).filter(line => !!line)
    const errorsParsed = lines.map(line => parseTscErrorLine(line, tscMatcher))
    return errorsParsed
}

interface Matcher {
    regexp: string,
    parts: {
        name: string
        position: number
    }[]
}

export interface ErrorParsed {
    file: string
    line: string
    column: string
    severity: string
    code: string
    message: string
}

export const tscMatcher: Matcher = {
    regexp: "^([^\\s].*)[\\(:](\\d+)[,:](\\d+)(?:\\):\\s+|\\s+-\\s+)(error|warning|info)\\s+TS(\\d+)\\s*:\\s*(.*)$",
    parts: [{
        name: "file",
        position: 1
    }, {
        name: "line",
        position: 2
    }, {
        name: "column",
        position: 3
    }, {
        name: "severity",
        position: 4
    }, {
        name: "code",
        position: 5
    }, {
        name: "message",
        position: 6
    }]
}

export function parseTscErrorLine(str: string, matcher: Matcher): ErrorParsed {

    console.log(`on a reçu la chaine ${str}`)
    let arr: string[] = []
    try {
        arr = str.match(matcher.regexp) || []
    } catch (error) {
        console.error('erreur match string')
        throw error
    }
    const result: { [k: string]: string } = {}
    arr.forEach((hash, index) => {
        const matcherHash = matcher.parts.find(part => part.position === index)
        if (matcherHash) {
            result[matcherHash.name] = hash
        }
    })

    return result as unknown as ErrorParsed

}