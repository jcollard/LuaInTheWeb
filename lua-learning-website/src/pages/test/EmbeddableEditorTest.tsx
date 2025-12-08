import { EmbeddableEditor } from '../../components/EmbeddableEditor'

/**
 * Test page for EmbeddableEditor component
 * Serves as both E2E test target and manual QA sandbox
 */
export function EmbeddableEditorTest() {
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>EmbeddableEditor Test Page</h1>

      <section style={{ marginBottom: '40px' }}>
        <h2>Interactive Editor</h2>
        <p>Full-featured editor with run, reset, and output panel.</p>
        <EmbeddableEditor code={`print("Hello from Lua!")`} />
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Read-only Editor</h2>
        <p>Non-editable, no run button.</p>
        <EmbeddableEditor
          code={`local x = 10\nlocal y = 20\nprint(x + y)`}
          readOnly
          runnable={false}
        />
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Custom Height Editor</h2>
        <p>Editor with custom height and output height.</p>
        <EmbeddableEditor
          code={`-- Taller editor\nfor i = 1, 5 do\n  print("Line " .. i)\nend`}
          height="300px"
          outputHeight="200px"
        />
      </section>
    </div>
  )
}
