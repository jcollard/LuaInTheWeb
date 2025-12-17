import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MarkdownViewer } from './MarkdownViewer'

describe('MarkdownViewer', () => {
  describe('basic markdown rendering', () => {
    it('should render heading elements', () => {
      render(<MarkdownViewer content="# Heading 1" />)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Heading 1')
    })

    it('should render bold text', () => {
      render(<MarkdownViewer content="**bold text**" />)
      expect(screen.getByText('bold text').tagName).toBe('STRONG')
    })

    it('should render italic text', () => {
      render(<MarkdownViewer content="*italic text*" />)
      expect(screen.getByText('italic text').tagName).toBe('EM')
    })

    it('should render unordered lists', () => {
      const content = `- item 1
- item 2`
      render(<MarkdownViewer content={content} />)
      expect(screen.getByRole('list')).toBeInTheDocument()
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
    })

    it('should render ordered lists', () => {
      const content = `1. first
2. second`
      render(<MarkdownViewer content={content} />)
      const list = screen.getByRole('list')
      expect(list.tagName).toBe('OL')
    })

    it('should render inline code', () => {
      render(<MarkdownViewer content="Use `print()` function" />)
      expect(screen.getByText('print()')).toBeInTheDocument()
      expect(screen.getByText('print()').tagName).toBe('CODE')
    })

    it('should render code blocks', () => {
      const content = `\`\`\`lua
print('hello')
\`\`\``
      const { container } = render(<MarkdownViewer content={content} />)
      // With syntax highlighting, code is split into spans
      const codeElement = container.querySelector('code')
      expect(codeElement).toBeInTheDocument()
      expect(codeElement?.textContent).toContain("print")
      expect(codeElement?.textContent).toContain("'hello'")
    })

    it('should render links', () => {
      render(<MarkdownViewer content="[Click here](https://example.com)" />)
      const link = screen.getByRole('link', { name: 'Click here' })
      expect(link).toHaveAttribute('href', 'https://example.com')
    })

    it('should render blockquotes', () => {
      render(<MarkdownViewer content="> This is a quote" />)
      expect(screen.getByText('This is a quote')).toBeInTheDocument()
    })

    it('should render tables', () => {
      const content = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`
      render(<MarkdownViewer content={content} />)
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('Header 1')).toBeInTheDocument()
      expect(screen.getByText('Cell 1')).toBeInTheDocument()
    })

    it('should render strikethrough text', () => {
      render(<MarkdownViewer content="~~deleted text~~" />)
      const delElement = screen.getByText('deleted text')
      expect(delElement.tagName).toBe('DEL')
    })
  })

  describe('HTML rendering with sanitization', () => {
    it('should render safe HTML elements like div', () => {
      render(<MarkdownViewer content="<div>Custom content</div>" />)
      expect(screen.getByText('Custom content')).toBeInTheDocument()
      // The div should be rendered (content appears)
      expect(screen.getByText('Custom content').tagName).toBe('DIV')
    })

    it('should render span elements with text', () => {
      render(<MarkdownViewer content='<span>Styled span</span>' />)
      expect(screen.getByText('Styled span').tagName).toBe('SPAN')
    })

    it('should render safe style attributes', () => {
      render(<MarkdownViewer content='<div style="color: red">Red text</div>' />)
      const element = screen.getByText('Red text')
      expect(element).toBeInTheDocument()
      // Browser converts 'red' to 'rgb(255, 0, 0)'
      expect(element).toHaveStyle({ color: 'rgb(255, 0, 0)' })
    })

    it('should render elements with class attributes', () => {
      render(<MarkdownViewer content='<div class="callout warning">Warning message</div>' />)
      const element = screen.getByText('Warning message')
      expect(element).toHaveClass('callout', 'warning')
    })

    it('should render nested HTML structures', () => {
      const content = `<div class="note">
  <strong>Note:</strong> This is important
</div>`
      render(<MarkdownViewer content={content} />)
      expect(screen.getByText('Note:')).toBeInTheDocument()
      expect(screen.getByText(/This is important/)).toBeInTheDocument()
    })
  })

  describe('XSS prevention', () => {
    it('should strip script tags', () => {
      render(<MarkdownViewer content='<script>alert("xss")</script>Safe text' />)
      expect(screen.getByText('Safe text')).toBeInTheDocument()
      expect(document.querySelector('script')).toBeNull()
    })

    it('should strip onclick handlers', () => {
      render(<MarkdownViewer content='<button onclick="alert(1)">Click me</button>' />)
      const button = screen.queryByRole('button')
      // Button might be rendered but without onclick
      if (button) {
        expect(button).not.toHaveAttribute('onclick')
      }
    })

    it('should strip javascript: URLs', () => {
      render(<MarkdownViewer content='<a href="javascript:alert(1)">Malicious link</a>' />)
      const link = screen.queryByRole('link')
      if (link) {
        expect(link.getAttribute('href')).not.toContain('javascript:')
      }
    })

    it('should strip onerror handlers on images', () => {
      render(<MarkdownViewer content='<img src="x" onerror="alert(1)" alt="test" />' />)
      const img = screen.queryByRole('img')
      if (img) {
        expect(img).not.toHaveAttribute('onerror')
      }
    })
  })

  describe('empty and edge cases', () => {
    it('should render empty content without error', () => {
      render(<MarkdownViewer content="" />)
      expect(screen.getByTestId('markdown-viewer')).toBeInTheDocument()
    })

    it('should handle whitespace-only content', () => {
      render(<MarkdownViewer content="   \n\n   " />)
      expect(screen.getByTestId('markdown-viewer')).toBeInTheDocument()
    })

    it('should apply custom className when provided', () => {
      render(<MarkdownViewer content="test" className="custom-class" />)
      expect(screen.getByTestId('markdown-viewer')).toHaveClass('custom-class')
    })
  })

  describe('syntax highlighting', () => {
    it('should apply language class to Lua code blocks', () => {
      const content = `\`\`\`lua
local x = 10
\`\`\``
      const { container } = render(<MarkdownViewer content={content} />)
      const codeElement = container.querySelector('code')
      expect(codeElement).toHaveClass('language-lua')
    })

    it('should highlight Lua keywords', () => {
      const content = `\`\`\`lua
local function test()
  return true
end
\`\`\``
      const { container } = render(<MarkdownViewer content={content} />)
      // Look for hljs-keyword class on keyword tokens
      const keywordSpan = container.querySelector('.hljs-keyword')
      expect(keywordSpan).toBeInTheDocument()
    })

    it('should highlight Lua strings', () => {
      const content = `\`\`\`lua
local msg = "hello world"
\`\`\``
      const { container } = render(<MarkdownViewer content={content} />)
      // Look for hljs-string class on string tokens
      const stringSpan = container.querySelector('.hljs-string')
      expect(stringSpan).toBeInTheDocument()
    })

    it('should highlight Lua comments', () => {
      const content = `\`\`\`lua
-- this is a comment
local x = 1
\`\`\``
      const { container } = render(<MarkdownViewer content={content} />)
      // Look for hljs-comment class on comment tokens
      const commentSpan = container.querySelector('.hljs-comment')
      expect(commentSpan).toBeInTheDocument()
    })

    it('should highlight Lua numbers', () => {
      const content = `\`\`\`lua
local n = 42
local pi = 3.14
\`\`\``
      const { container } = render(<MarkdownViewer content={content} />)
      // Look for hljs-number class on number tokens
      const numberSpan = container.querySelector('.hljs-number')
      expect(numberSpan).toBeInTheDocument()
    })

    it('should add language class to code element', () => {
      const content = `\`\`\`lua
print("hi")
\`\`\``
      const { container } = render(<MarkdownViewer content={content} />)
      const codeElement = container.querySelector('code')
      expect(codeElement).toHaveClass('language-lua')
    })

    it('should render code blocks without language specifier', () => {
      // Code blocks without language specifier still render as code
      const content = `\`\`\`
local function add(a, b)
  return a + b
end
\`\`\``
      const { container } = render(<MarkdownViewer content={content} />)
      const codeElement = container.querySelector('code')
      expect(codeElement).toBeInTheDocument()
      expect(codeElement?.textContent).toContain('local function add')
    })
  })

  describe('relative link handling', () => {
    it('should call onLinkClick with resolved path for relative links', async () => {
      const user = userEvent.setup()
      const onLinkClick = vi.fn()
      render(
        <MarkdownViewer
          content="[Next Lesson](02_lesson.md)"
          basePath="/book/chapters"
          onLinkClick={onLinkClick}
        />
      )
      const link = screen.getByRole('link', { name: 'Next Lesson' })
      await user.click(link)
      expect(onLinkClick).toHaveBeenCalledWith('/book/chapters/02_lesson.md')
    })

    it('should resolve paths with ./ prefix', async () => {
      const user = userEvent.setup()
      const onLinkClick = vi.fn()
      render(
        <MarkdownViewer
          content="[Link](./relative.md)"
          basePath="/docs"
          onLinkClick={onLinkClick}
        />
      )
      const link = screen.getByRole('link', { name: 'Link' })
      await user.click(link)
      expect(onLinkClick).toHaveBeenCalledWith('/docs/relative.md')
    })

    it('should not intercept external http links', async () => {
      const onLinkClick = vi.fn()
      render(
        <MarkdownViewer
          content="[External](https://example.com)"
          basePath="/book"
          onLinkClick={onLinkClick}
        />
      )
      const link = screen.getByRole('link', { name: 'External' })
      expect(link).toHaveAttribute('href', 'https://example.com')
    })

    it('should not intercept anchor links', async () => {
      const onLinkClick = vi.fn()
      render(
        <MarkdownViewer
          content="[Section](#section)"
          basePath="/book"
          onLinkClick={onLinkClick}
        />
      )
      const link = screen.getByRole('link', { name: 'Section' })
      expect(link).toHaveAttribute('href', '#section')
    })

    it('should render normal links when no basePath provided', () => {
      const onLinkClick = vi.fn()
      render(
        <MarkdownViewer
          content="[Link](page.md)"
          onLinkClick={onLinkClick}
        />
      )
      const link = screen.getByRole('link', { name: 'Link' })
      expect(link).toHaveAttribute('href', 'page.md')
    })
  })
})
