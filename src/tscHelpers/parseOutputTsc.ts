import { ErrorTs } from "../main"

export function parseOutputTsc(output: string): ErrorTs[] {
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


export const tscMatcher: Matcher = {
    regexp: "^([^\\s].*)[\\(:](\\d+)[,:](\\d+)(?:\\):\\s+|\\s+-\\s+)(error|warning|info)\\s+TS(\\d+)\\s*:\\s*(.*)$",
    parts: [{
        name: "fileName",
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

export function parseTscErrorLine(str: string, matcher: Matcher): ErrorTs {

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

    return result as unknown as ErrorTs

}