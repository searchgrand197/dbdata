import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { mountTemplateEditor } from './templateEditorMount'
import { OpdSheetChrome } from './OpdSheetChrome'
import './templateEditor.css'

const LOCAL_STORAGE_KEY = 'custom-editor-single-layout'
const CANVAS_W = 1024
const CANVAS_H = 1451

export default function App() {
  const rootRef = useRef(null)
  const [mode, setMode] = useState('home') // 'home' | 'editor'
  const [layout, setLayout] = useState(null)
  const [values, setValues] = useState({})
  // null = not printing | 'no-bg' | 'with-bg'
  const [printMode, setPrintMode] = useState(null)

  useEffect(() => {
    if (mode !== 'editor') return undefined
    const el = rootRef.current
    if (!el) return undefined
    return mountTemplateEditor(el)
  }, [mode])

  // Load latest layout snapshot whenever we are on the home (generator) page.
  useEffect(() => {
    if (mode !== 'home') return

    const load = async () => {
      try {
        const res = await fetch('/api/templates')
        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          const list = Array.isArray(data.templates) ? data.templates : []
          const single = list.find((t) => t.key === 'single' && t.layout && t.layout.fields)
          if (single && single.layout) {
            setLayout(single.layout)
            return
          }
        }
      } catch {
        // fall back to localStorage below
      }

      try {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (parsed && parsed.fields && typeof parsed.fields === 'object') {
          setLayout(parsed)
        }
      } catch {
        // ignore
      }
    }

    load()
  }, [mode])

  // Trigger window.print() after React renders the print portal into the DOM
  useEffect(() => {
    if (!printMode) return
    const timer = setTimeout(() => {
      window.print()
    }, 80)
    // Reset print mode when print dialog closes (or is cancelled)
    const onAfterPrint = () => setPrintMode(null)
    window.addEventListener('afterprint', onAfterPrint)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('afterprint', onAfterPrint)
    }
  }, [printMode])

  const fieldNames = layout && layout.fields ? Object.keys(layout.fields) : []
  const noteIds = layout && layout.notes ? Object.keys(layout.notes) : []
  const printOffsetX = layout && typeof layout.printOffsetX === 'number' ? layout.printOffsetX : 0
  const printOffsetY = layout && typeof layout.printOffsetY === 'number' ? layout.printOffsetY : 0

  const handleChange = (name, v) => {
    setValues((prev) => ({ ...prev, [name]: v }))
  }

  const handlePrint = (withBackground) => {
    if (!layout) return
    setPrintMode(withBackground ? 'with-bg' : 'no-bg')
  }

  // ── Shared field/note renderer ──────────────────────────────────────────────
  const renderFields = (offsetX, offsetY) => {
    const boxes = []
    fieldNames.forEach((name) => {
      const cfg = layout.fields[name] || {}
      const x = typeof cfg.x === 'number' ? cfg.x : CANVAS_W / 2
      const y = typeof cfg.y === 'number' ? cfg.y : CANVAS_H / 2
      const left = ((x + offsetX) / CANVAS_W) * 100
      const top = ((y + offsetY) / CANVAS_H) * 100
      const size = cfg.size || 13
      boxes.push(
        <div
          key={name}
          className="field-box"
          style={{
            left: `${left.toFixed(4)}%`,
            top: `${top.toFixed(4)}%`,
            fontSize: `${((size / 600) * 100).toFixed(4)}cqw`,
            cursor: 'default',
          }}
        >
          {values[name] ?? ''}
        </div>,
      )
    })
    noteIds.forEach((id) => {
      const cfg = layout.notes[id] || {}
      const x = typeof cfg.x === 'number' ? cfg.x : CANVAS_W / 2
      const y = typeof cfg.y === 'number' ? cfg.y : CANVAS_H / 2
      const left = ((x + offsetX) / CANVAS_W) * 100
      const top = ((y + offsetY) / CANVAS_H) * 100
      const size = cfg.size || 11
      boxes.push(
        <div
          key={id}
          className="field-box"
          style={{
            left: `${left.toFixed(4)}%`,
            top: `${top.toFixed(4)}%`,
            fontSize: `${((size / 600) * 100).toFixed(4)}cqw`,
            cursor: 'default',
          }}
        >
          {cfg.text || ''}
        </div>,
      )
    })
    return boxes
  }

  // ── Generator preview (right panel) ────────────────────────────────────────
  const renderGeneratorPreview = () => {
    if (!layout || !layout.fields || (!fieldNames.length && !noteIds.length)) {
      return (
        <div className="template-editor-canvas-wrap opd-generator-wrap">
          <div className="template-editor-canvas opd-sheet">
            <OpdSheetChrome />
            <div className="opd-empty-hint">
              No fields defined yet. Open the OPD editor, add fields, save the layout, then return
              here.
            </div>
          </div>
        </div>
      )
    }

    const bgSrc = layout.backgroundDataUrl || undefined

    return (
      <div className="template-editor-canvas-wrap opd-generator-wrap">
        <div className={`template-editor-canvas opd-sheet${bgSrc ? ' opd-sheet--with-bg' : ''}`}>
          <OpdSheetChrome />
          {bgSrc ? <img src={bgSrc} alt="" /> : null}
          {renderFields(printOffsetX, printOffsetY)}
        </div>
      </div>
    )
  }

  // ── Print portal — rendered into document.body, shown only by @media print ─
  const renderPrintPortal = () => {
    if (!printMode || !layout) return null

    const bgSrc = layout.backgroundDataUrl || null
    const withBg = printMode === 'with-bg'
    // Show background image only when user chose "with bg" AND there is one
    const showBgImg = withBg && !!bgSrc
    // Show the Vardaan chrome only when user chose "with bg" AND there is NO uploaded image
    const showChrome = withBg && !bgSrc
    const sheetClass = [
      'template-editor-canvas opd-sheet',
      showBgImg ? 'opd-sheet--with-bg' : '',
    ].filter(Boolean).join(' ')

    return createPortal(
      <div id="opd-print-portal">
        <div className="opd-print-page">
          <div className={sheetClass}>
            {showBgImg && <img src={bgSrc} alt="" />}
            {showChrome && <OpdSheetChrome />}
            {renderFields(printOffsetX, printOffsetY)}
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  // ── Home (generator) page ───────────────────────────────────────────────────
  if (mode === 'home') {
    return (
      <>
        {renderPrintPortal()}
        <div className="template-editor-app">
          <div className="template-editor-page">
            <div className="template-editor-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <h1>OPD Generator</h1>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setMode('editor')}
                  style={{ width: 'auto', paddingInline: 16, whiteSpace: 'nowrap' }}
                >
                  OPD editor
                </button>
              </div>
              <p className="template-editor-subtitle">
                Fill in patient details on the left and preview your A4 OPD template on the right. The
                fields and positions come from the saved template editor layout.
              </p>

              <div className="template-editor-layout">
                <div className="template-editor-sidebar">
                  <h2>Patient / visit data</h2>
                  <div className="editor-values">
                    {fieldNames.length === 0 && (
                      <p className="field-hint">
                        No fields yet. Click &quot;Open template editor&quot; to create them.
                      </p>
                    )}
                    <div className="generator-field-grid">
                      {fieldNames.map((name) => (
                        <div className="field" key={name}>
                          <label htmlFor={`field-input-${name}`}>{name}</label>
                          <input
                            id={`field-input-${name}`}
                            type="text"
                            value={values[name] ?? ''}
                            onChange={(e) => handleChange(name, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => handlePrint(false)}
                    style={{ width: '100%', marginTop: 8 }}
                  >
                    Generate (print)
                  </button>
                  <button
                    type="button"
                    className="secondary-btn opd-btn-print-bg"
                    onClick={() => handlePrint(true)}
                    style={{ width: '100%', marginTop: 8 }}
                  >
                    Print with background
                  </button>
                </div>

                <div className="template-editor-preview-scroll">{renderGeneratorPreview()}</div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Editor page ─────────────────────────────────────────────────────────────
  return (
    <div className="template-editor-app">
      <div className="template-editor-page" ref={rootRef}>
        <div className="template-editor-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              marginBottom: 8,
            }}
          >
            <h1 style={{ margin: 0 }}>OPD Generator – Template Editor</h1>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setMode('home')}
              style={{ width: 'auto', paddingInline: 16, whiteSpace: 'nowrap' }}
            >
              Back to OPD generator
            </button>
          </div>
          <p className="template-editor-subtitle">
            Add your own fields on an A4-sized page. Each field appears as a simple draggable label
            on the preview. You can optionally set a background image for the page.
          </p>

          <div className="template-editor-layout">
            <div className="template-editor-preview-scroll">
              <div className="template-editor-canvas-wrap opd-generator-wrap">
                <div className="template-editor-canvas opd-sheet" id="editor-canvas">
                  <OpdSheetChrome />
                  <img id="editor-bg" alt="" />
                  {/* Field boxes are injected by templateEditorMount.js */}
                </div>
              </div>
            </div>

            <div className="template-editor-sidebar">
              <h2>Background</h2>
              <div className="editor-values">
                <div className="field">
                  <label htmlFor="template-upload">Background image (optional)</label>
                  <input
                    id="template-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                  />
                  <span className="field-hint">
                    If you choose an image, it will be used as the A4 page background. Leave empty
                    for a plain white page.
                  </span>
                </div>
              </div>

              <h2>Print calibration</h2>
              <div className="editor-values">
                <div className="field">
                  <label>Fine-tune print alignment (advanced)</label>
                  <span className="field-hint">
                    If printed text is slightly shifted compared to the real pad, adjust these values
                    while looking at &quot;Print with background&quot;. Positive values move content down/right,
                    negative values move it up/left.
                  </span>
                </div>
                <div className="generator-field-grid">
                  <div className="field">
                    <label htmlFor="calib-offset-x">Horizontal offset (px in editor)</label>
                    <input
                      id="calib-offset-x"
                      type="number"
                      defaultValue={printOffsetX}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0
                        setLayout((prev) =>
                          prev ? { ...prev, printOffsetX: v } : prev,
                        )
                      }}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="calib-offset-y">Vertical offset (px in editor)</label>
                    <input
                      id="calib-offset-y"
                      type="number"
                      defaultValue={printOffsetY}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0
                        setLayout((prev) =>
                          prev ? { ...prev, printOffsetY: v } : prev,
                        )
                      }}
                    />
                  </div>
                </div>
              </div>

              <h2>Fields &amp; notes</h2>
              <div className="editor-values">
                <div className="field">
                  <label htmlFor="new-field-name">New field / note text</label>
                  <input
                    id="new-field-name"
                    type="text"
                    placeholder="Type field label or note text"
                    autoComplete="off"
                  />
                  <span className="field-hint">
                    Use the left button to add a field (with input on the generator page), or the right
                    button to add a note (just printed text, no input).
                  </span>
                  <p className="field-hint" id="field-error" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" id="add-field-btn" className="primary-btn" style={{ flex: 1 }}>
                    Add field
                  </button>
                  <button type="button" id="add-note-btn" className="secondary-btn" style={{ flex: 1 }}>
                    Add note
                  </button>
                </div>
              </div>

              <div className="editor-values">
                <h3 style={{ margin: '0 0 6px', fontSize: 14 }}>Existing fields</h3>
                <div id="field-list" />
              </div>

              <div className="editor-values">
                <h3 style={{ margin: '0 0 6px', fontSize: 14 }}>Notes</h3>
                <div id="note-list" />
              </div>

              <h2>Save layout</h2>
              <p className="field-hint">
                Saves the current positions of all fields. It always uses a single layout; there is
                no template name.
              </p>
              <button
                type="button"
                id="save-layout-btn"
                className="secondary-btn"
                style={{ width: '100%', marginBottom: 4 }}
              >
                Save layout
              </button>
              <p className="field-hint" id="save-layout-status" />

              <h2 style={{ marginTop: 16 }}>Generated config</h2>
              <textarea id="layout-json" readOnly className="layout-json" defaultValue="" />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  id="copy-layout-btn"
                  className="secondary-btn"
                  style={{ flex: 1 }}
                >
                  Copy JSON
                </button>
              </div>
              <p className="field-hint" id="copy-status" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
