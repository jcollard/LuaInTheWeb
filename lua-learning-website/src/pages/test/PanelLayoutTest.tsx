import { useState } from 'react'
import { IDEPanelGroup } from '../../components/IDEPanelGroup'
import { IDEPanel } from '../../components/IDEPanel'
import { IDEResizeHandle } from '../../components/IDEResizeHandle'

/**
 * Test page for Panel Layout components
 * Serves as both E2E test target and manual QA sandbox
 */
export function PanelLayoutTest() {
  const [leftCollapsed, setLeftCollapsed] = useState(false)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '16px', borderBottom: '1px solid #3c3c3c' }}>
        <h1 style={{ margin: 0, fontSize: '18px' }}>Panel Layout Test Page</h1>
        <p style={{ margin: '8px 0 0', color: '#888', fontSize: '14px' }}>
          Drag handles to resize panels. Double-click to reset. Press arrow keys when focused.
        </p>
      </header>

      <main style={{ flex: 1, overflow: 'hidden' }}>
        <IDEPanelGroup direction="horizontal" persistId="test-layout">
          <IDEPanel
            defaultSize={30}
            minSize={10}
            collapsible
            collapsed={leftCollapsed}
            onCollapse={setLeftCollapsed}
            header="Left Panel"
          >
            <div style={{ padding: '16px' }}>
              <h2 style={{ fontSize: '14px', marginTop: 0 }}>Explorer</h2>
              <p style={{ color: '#888', fontSize: '13px' }}>
                This panel can be collapsed using the button in the header.
              </p>
              <ul style={{ color: '#ccc', fontSize: '13px' }}>
                <li>File 1.lua</li>
                <li>File 2.lua</li>
                <li>File 3.lua</li>
              </ul>
            </div>
          </IDEPanel>

          <IDEResizeHandle />

          <IDEPanel defaultSize={70} minSize={20}>
            <IDEPanelGroup direction="vertical" persistId="test-layout-right">
              <IDEPanel defaultSize={60} minSize={20} header="Editor">
                <div style={{ padding: '16px' }}>
                  <h2 style={{ fontSize: '14px', marginTop: 0 }}>Code Editor</h2>
                  <pre style={{
                    background: '#2d2d2d',
                    padding: '16px',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '13px'
                  }}>
{`-- Example Lua code
local function greet(name)
  print("Hello, " .. name .. "!")
end

greet("World")`}
                  </pre>
                </div>
              </IDEPanel>

              <IDEResizeHandle />

              <IDEPanel defaultSize={40} minSize={15} header="Output">
                <div style={{ padding: '16px' }}>
                  <h2 style={{ fontSize: '14px', marginTop: 0 }}>Terminal Output</h2>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#4ec9b0',
                    background: '#1e1e1e',
                    padding: '12px',
                    borderRadius: '4px'
                  }}>
                    <div>$ lua script.lua</div>
                    <div>Hello, World!</div>
                    <div style={{ color: '#888' }}>Process exited with code 0</div>
                  </div>
                </div>
              </IDEPanel>
            </IDEPanelGroup>
          </IDEPanel>
        </IDEPanelGroup>
      </main>
    </div>
  )
}
