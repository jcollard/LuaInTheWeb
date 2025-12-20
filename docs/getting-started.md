# Getting Started

This guide will help you set up your development environment for LuaInTheWeb.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+ or yarn
- Git

## Project Structure

LuaInTheWeb uses npm workspaces to manage multiple packages:

```
LuaInTheWeb/
├── lua-learning-website/    # Main React application
├── packages/
│   └── shell-core/          # @lua-learning/shell-core - Shell emulation library
└── package.json             # Root workspace configuration
```

The `lua-learning-website` depends on `@lua-learning/shell-core`, which provides shell emulation functionality. This package is built automatically when you run `npm run build` in the website directory.

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/jcollard/LuaInTheWeb.git
   cd LuaInTheWeb
   ```

2. Install dependencies (from the root directory):
   ```bash
   npm install
   ```
   This installs dependencies for all workspace packages.

3. Start the development server:
   ```bash
   cd lua-learning-website
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

## Building

To build for production:

```bash
cd lua-learning-website
npm run build
```

This automatically builds the `@lua-learning/shell-core` dependency first via the `prebuild` script, then builds the website.

Alternatively, build all packages from the root:

```bash
npm run build
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:mutation` | Run mutation tests |

## IDE Setup

### VS Code (Recommended)

Recommended extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- ES7+ React/Redux/React-Native snippets

### Settings

The project includes VS Code settings in `.vscode/settings.json` for consistent formatting.

## MCP (Model Context Protocol) Setup

The project includes Code-Index-MCP configuration for enhanced AI-assisted development with Claude Code.

### Configuration

The `.mcp.json` file in the project root configures the Code-Index-MCP server:

```json
{
  "mcpServers": {
    "code-index-mcp": {
      "command": "uvx",
      "args": ["code-index-mcp"]
    }
  }
}
```

### Prerequisites

- **uv** (Python package manager): Install from [https://docs.astral.sh/uv/](https://docs.astral.sh/uv/)
- The `uvx` command must be available in your PATH

### Features

Code-Index-MCP provides:
- **Fast file search**: Find files by pattern across the codebase
- **Code search**: Search for code patterns with regex support
- **Symbol extraction**: Index and search functions, classes, interfaces, and methods
- **File watching**: Automatic index updates when files change
- **Multi-language support**: TypeScript, JavaScript, Python, Lua, CSS, Markdown, and more

### Usage with Claude Code

When using Claude Code with MCP enabled, the assistant can:
- Quickly find files and code patterns
- Understand project structure through symbol indexing
- Search across the entire codebase efficiently

### Index Management

After switching branches, the index may need to be rebuilt:
- The file watcher detects changes automatically
- For major branch switches, a deep index rebuild may be required
- The MCP server handles this automatically when needed

### Testing the Setup

To verify the MCP server is working:
1. Start a Claude Code session
2. The MCP server will automatically connect
3. Claude can now use advanced code search and indexing features

## Next Steps

- Read the [Architecture Guide](./architecture.md) to understand the codebase
- Review the [Testing Guide](./testing.md) for TDD practices
- Check the [roadmap](../roadmap/) for current work
