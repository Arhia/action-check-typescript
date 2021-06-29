import { compareErrors, FileWithLineNumbers } from '../src/compareErrors'
import { ErrorTs } from '../src/main'
import { outputBaseBranch } from './test_compare_1/outputBaseBranch'
import { errorsCurrentBranch } from './test_compare_1/errorsCurrentBranch'
import { errorsBaseBranch } from './test_compare_1/erreursBaseBranch'
import { lineNumbers } from './test_compare_1/lineNumbers'
import { filesAdded, filesModified, filesRemoved } from './test_compare_1/filesChanged'

import { parseTscErrorLine, tscMatcher, parseOutputTsc } from '../src/tscHelpers/parseOutputTsc'
import { getBodyComment } from '../src/getBodyComment'

test('1. parse tsc error line', () => {
  const line = `src/main.ts(39,11): error TS1155: 'const' declarations must be initialized.`
  const errorParsed = parseTscErrorLine(line, tscMatcher)
  expect(errorParsed).toBeDefined()
  expect(errorParsed.fileName).toEqual('src/main.ts')
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
  expect(linesParsed[0].fileName).toEqual('src/main.ts')
  expect(linesParsed[1].fileName).toEqual('src/main.ts')
  expect(linesParsed[1].column).toEqual('11')
})

test('3. compareErrors', () => {

  const errorsBefore: ErrorTs[] = [{
    message: 'test',
    line: '3',
    column: '20',
    code: '60312',
    fileName: 'src/fakeErrors.ts',
    fileNameResolved: 'src/fakeErrors.ts'
  }]

  const errorsAfter: ErrorTs[] = [{
    message: 'test',
    line: '3',
    column: '20',
    code: '60312',
    fileName: 'src/fakeErrors.ts',
    fileNameResolved: 'src/fakeErrors.ts'
  }, {
    message: 'test2',
    line: '10',
    column: '20',
    code: '60312',
    fileName: 'src/fakeErrors.ts',
    fileNameResolved: 'src/fakeErrors.ts'
  }]

  const lineNumbers: FileWithLineNumbers[] = [{
    path: 'src/fakeErrors.ts',
    added: [2],
    removed: [2]
  }]

  const { errorsAdded } = compareErrors({
    errorsBefore: errorsBefore,
    errorsAfter: errorsAfter,
    lineNumbers: lineNumbers,
    filesChanged: ['src/fakeErrors.ts'],
    filesDeleted: [],
    filesAdded: []
  })

  expect(errorsAdded).toHaveLength(1)
  expect(errorsAdded[0].message).toEqual("test2")

})

test('4. Parsing output', () => {
  const parsedErrors = parseOutputTsc(outputBaseBranch)
  expect(parsedErrors).toHaveLength(1252)
  expect(parsedErrors[0]).toHaveProperty('extraMsg')
  expect(parsedErrors[0].extraMsg).toEqual("Type 'LastCnt' is missing the following properties from type 'SelectionPeriaDataCnt': catc_id, src_id")
})

test('5. compare errors test 1', () => {

  const resultCompareErrors = compareErrors({
    errorsBefore: errorsBaseBranch as unknown as ErrorTs[],
    errorsAfter: errorsCurrentBranch as unknown as ErrorTs[],
    filesChanged: filesModified.split(' '),
    filesAdded: filesAdded.split(' '),
    filesDeleted: filesRemoved.split(' '),
    lineNumbers: lineNumbers
  })

  expect(resultCompareErrors.errorsAdded).toHaveLength(15)

  const errorsInModifiedFiles = errorsCurrentBranch.filter(err => {
    return filesModified.concat(filesAdded).includes(err.fileName)
  })

  const newErrorsInModifiedFiles = resultCompareErrors.errorsAdded.filter(err => {
    return filesModified.concat(filesAdded).includes(err.fileName)
  })

  const comment = getBodyComment({
    errorsInProjectBefore: errorsBaseBranch,
    errorsInProjectAfter: errorsCurrentBranch,
    newErrorsInProject: resultCompareErrors.errorsAdded,
    errorsInModifiedFiles,
    newErrorsInModifiedFiles
  })

  expect(comment).toMatch(/\*\*15 new errors added\*\*/)

})
