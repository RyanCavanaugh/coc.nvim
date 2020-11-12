import helper from '../helper'
import { Neovim } from '@chemzqm/neovim'
import { DiagnosticBuffer } from '../../diagnostic/buffer'
import { DiagnosticConfig } from '../../diagnostic/manager'
import { Range, DiagnosticSeverity, Diagnostic } from 'vscode-languageserver-types'

let nvim: Neovim
const config: DiagnosticConfig = {
  checkCurrentLine: false,
  locationlistUpdate: true,
  enableSign: true,
  enableHighlightLineNumber: true,
  maxWindowHeight: 8,
  maxWindowWidth: 80,
  enableMessage: 'always',
  messageTarget: 'echo',
  messageDelay: 250,
  refreshOnInsertMode: false,
  virtualTextSrcId: 0,
  virtualText: false,
  virtualTextCurrentLineOnly: true,
  virtualTextPrefix: " ",
  virtualTextLines: 3,
  virtualTextLineSeparator: " \\ ",
  displayByAle: false,
  srcId: 1000,
  level: DiagnosticSeverity.Hint,
  signOffset: 1000,
  errorSign: '>>',
  warningSign: '>>',
  infoSign: '>>',
  refreshAfterSave: false,
  hintSign: '>>',
  filetypeMap: {
    default: ''
  },
}

async function createDiagnosticBuffer(): Promise<DiagnosticBuffer> {
  let doc = await helper.createDocument()
  return new DiagnosticBuffer(doc.bufnr, doc.uri, config)
}

function createDiagnostic(msg: string, range?: Range, severity?: DiagnosticSeverity): Diagnostic {
  range = range ? range : Range.create(0, 0, 0, 1)
  return Diagnostic.create(range, msg, severity || DiagnosticSeverity.Error, 999, 'test')
}

beforeAll(async () => {
  await helper.setup()
  nvim = helper.nvim
})

afterAll(async () => {
  await helper.shutdown()
})

afterEach(async () => {
  await helper.reset()
})

describe('diagnostic buffer', () => {

  it('should check signs', async () => {
    let buf = await createDiagnosticBuffer()
    await nvim.setLine('foo')
    await nvim.command(`sign place 1005 line=1 name=CocError buffer=${buf.bufnr}`)
    await nvim.command(`sign place 1006 line=1 name=CocError buffer=${buf.bufnr}`)
    await buf.checkSigns()
    let content = await nvim.call('execute', [`sign place buffer=${buf.bufnr}`])
    let lines: string[] = content.split('\n')
    let line = lines.find(s => s.includes('CocError'))
    expect(line).toBeUndefined()
  })

  it('should add signs', async () => {
    let diagnostics = [createDiagnostic('foo'), createDiagnostic('bar')]
    let buf = await createDiagnosticBuffer()
    buf.addSigns(diagnostics)
    await helper.wait(30)
    let content = await nvim.call('execute', [`sign place buffer=${buf.bufnr}`])
    let lines: string[] = content.split('\n')
    let line = lines.find(s => s.includes('CocError'))
    expect(line).toBeDefined()
  })

  it('should set diagnostic info', async () => {
    let r = Range.create(0, 1, 0, 2)
    let diagnostics = [
      createDiagnostic('foo', r, DiagnosticSeverity.Error),
      createDiagnostic('bar', r, DiagnosticSeverity.Warning),
      createDiagnostic('foo', r, DiagnosticSeverity.Hint),
      createDiagnostic('bar', r, DiagnosticSeverity.Information)
    ]
    let buf = await createDiagnosticBuffer()
    buf.setDiagnosticInfo(diagnostics)
    let buffer = await nvim.buffer
    let res = await buffer.getVar('coc_diagnostic_info')
    expect(res).toEqual({
      lnums: [1, 1, 1, 1],
      information: 1,
      hint: 1,
      warning: 1,
      error: 1
    })
  })

  it('should add highlight neovim', async () => {
    let diagnostic = createDiagnostic('foo')
    let buf = await createDiagnosticBuffer()
    buf.addHighlight([diagnostic], buf.bufnr)
    expect(buf.hasHighlights()).toBe(true)
  })

  it('should clear all diagnostics', async () => {
    let diagnostic = createDiagnostic('foo')
    let buf = await createDiagnosticBuffer()
    let diagnostics = [diagnostic]
    buf.refresh(diagnostics)
    await helper.wait(100)
    buf.clear()
    let content = await nvim.call('execute', [`sign place buffer=${buf.bufnr}`])
    let lines: string[] = content.split('\n')
    let line = lines.find(s => s.includes('CocError'))
    expect(line).toBeUndefined()
    await helper.wait(50)
    let buffer = await nvim.buffer
    let res = await buffer.getVar("coc_diagnostic_info")
    expect(res).toEqual({ lnums: [0, 0, 0, 0], error: 0, hint: 0, information: 0, warning: 0 })
    let { matchIds } = buf as any
    expect(matchIds.size).toBe(0)
  })
})
