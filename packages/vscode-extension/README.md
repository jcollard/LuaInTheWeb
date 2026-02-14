# Lua Canvas IDE

A VS Code extension for Lua game development with canvas graphics support.

## Features

- **Run Lua Files**: Execute Lua scripts directly from VS Code
- **Canvas Graphics**: Display canvas graphics in a WebView panel
- **Interactive REPL**: Lua REPL with command history and multiline support
- **Hot Reload**: Automatically reload canvas when Lua files are saved
- **Full Canvas API**: Support for shapes, text, images, audio, and more

## Usage

### Running Lua Files

1. Open a `.lua` file
2. Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on macOS)
3. Or click the play button in the editor title bar
4. Or right-click and select "Run Lua File"

### Opening the REPL

Run the command "Lua Canvas: Open Lua REPL" from the command palette.

### Canvas API

Use the canvas API in your Lua scripts:

```lua
local canvas = require("canvas")

canvas.start(800, 600)

function canvas.update(dt)
  -- Update game logic
end

function canvas.draw()
  canvas.clear()
  canvas.setColor(255, 255, 255)
  canvas.fillRect(100, 100, 50, 50)
  canvas.text("Hello, World!", 10, 20)
end
```

## Configuration

- `luaCanvas.hotReload`: Enable/disable automatic hot reload (default: true)
- `luaCanvas.canvasWidth`: Default canvas width (default: 800)
- `luaCanvas.canvasHeight`: Default canvas height (default: 600)

## Development

### Building

```bash
# From the monorepo root
npm run build:vscode

# Or from this package
npm run build
```

### Packaging

```bash
npm run package
```

This creates a `.vsix` file that can be installed in VS Code.

## License

MIT
