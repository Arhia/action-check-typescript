import { parseTscErrorLine, tscMatcher, parseOutputTsc } from '../src/parseOutputTsc'

test('1. parse tsc error line', () => {
  const line = `src/main.ts(39,11): error TS1155: 'const' declarations must be initialized.`
  const errorParsed = parseTscErrorLine(line, tscMatcher)
  expect(errorParsed).toBeDefined()
  expect(errorParsed.file).toEqual('src/main.ts')
  expect(errorParsed.line).toEqual('39')
  expect(errorParsed.column).toEqual('11')
  expect(errorParsed.code).toEqual('1155')
  expect(errorParsed.severity).toEqual('error')
  expect(errorParsed.message).toEqual("'const' declarations must be initialized.")
})


test('2. parse output', () => {
  const output = `
  src/main.ts(39,11): error TS1155: 'const' declarations must be initialized.
  src/main.ts(39,11): error TS7005: Variable 'hereIsAUnusedVariableToHaveAnError' implicitly has an 'any' type.
  `
  const linesParsed = parseOutputTsc(output)
  expect(linesParsed).toHaveLength(2)
  expect(linesParsed[0].file).toEqual('src/main.ts')
  expect(linesParsed[1].file).toEqual('src/main.ts')
  expect(linesParsed[1].column).toEqual('11')
})
