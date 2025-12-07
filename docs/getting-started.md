# Getting Started

This guide will help you set up your development environment for LuaInTheWeb.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+ or yarn
- Git

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/jcollard/LuaInTheWeb.git
   cd LuaInTheWeb
   ```

2. Install dependencies:
   ```bash
   cd lua-learning-website
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

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

## Next Steps

- Read the [Architecture Guide](./architecture.md) to understand the codebase
- Review the [Testing Guide](./testing.md) for TDD practices
- Check the [roadmap](../roadmap/) for current work
