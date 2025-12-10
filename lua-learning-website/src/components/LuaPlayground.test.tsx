import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import LuaPlayground from './LuaPlayground'

// Use vi.hoisted to make mocks available before vi.mock is hoisted
const { mockDoString, mockGlobalSet, mockGlobalClose } = vi.hoisted(() => ({
  mockDoString: vi.fn(),
  mockGlobalSet: vi.fn(),
  mockGlobalClose: vi.fn(),
}))

vi.mock('wasmoon', () => {
  const mockLuaEngine = {
    doString: mockDoString,
    global: {
      set: mockGlobalSet,
      close: mockGlobalClose,
    },
  }
  return {
    LuaFactory: class {
      async createEngine() {
        return mockLuaEngine
      }
    },
    LuaEngine: class {},
  }
})

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: {
    value: string
    onChange?: (v: string | undefined) => void
  }) => (
    <textarea
      data-testid="mock-monaco"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

// Mock xterm to avoid matchMedia issues
vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    options = {}
    rows = 24
    onData = vi.fn().mockReturnValue({ dispose: vi.fn() })
    open = vi.fn()
    write = vi.fn()
    writeln = vi.fn()
    clear = vi.fn()
    dispose = vi.fn()
    loadAddon = vi.fn()
    attachCustomKeyEventHandler = vi.fn()
    scrollToBottom = vi.fn()
    refresh = vi.fn()
  },
}))

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit = vi.fn()
    dispose = vi.fn()
  },
}))

// Mock theme context for components using useTheme
vi.mock('../contexts/useTheme', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
    isDark: true,
  }),
}))

describe('LuaPlayground', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Cycle 4.1: Uses CodeEditor instead of CodeMirror
  it('should render CodeEditor component', async () => {
    render(<LuaPlayground />)
    await waitFor(() => {
      expect(screen.getByTestId('mock-monaco')).toBeInTheDocument()
    })
  })

  // Cycle 4.2: Running code produces output (via hook integration)
  it('should have Run Code button', async () => {
    render(<LuaPlayground />)
    await waitFor(() => {
      expect(screen.getByText('Run Code')).toBeInTheDocument()
    })
  })

  it('should display Lua Playground heading', () => {
    render(<LuaPlayground />)
    expect(screen.getByText('Lua Playground')).toBeInTheDocument()
  })

  it('should have mode switcher buttons', () => {
    render(<LuaPlayground />)
    expect(screen.getByRole('button', { name: 'Code Editor' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Interactive REPL' })).toBeInTheDocument()
  })
})
