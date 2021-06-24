import { compareErrors, FileWithLineNumbers } from '../src/compareErrors'
import { ErrorTs } from '../src/tscHelpers/compileTsFiles'

test('1. compareErrors', () => {

  const errorsBefore: ErrorTs[] = [{
    message: 'test',
    line: 3,
    character: 20,
    code: 60312,
    fileName: 'src/fakeErrors.ts',
    fileNameResolved: 'src/fakeErrors.ts'
  }]

  const errorsAfter: ErrorTs[] = [{
    message: 'test',
    line: 3,
    character: 20,
    code: 60312,
    fileName: 'src/fakeErrors.ts',
    fileNameResolved: 'src/fakeErrors.ts'
  }, {
    message: 'test2',
    line: 10,
    character: 20,
    code: 60312,
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

