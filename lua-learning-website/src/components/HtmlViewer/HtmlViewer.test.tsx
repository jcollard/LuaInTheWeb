import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { HtmlViewer } from './HtmlViewer'

describe('HtmlViewer', () => {
  it('should render an iframe element', () => {
    render(<HtmlViewer content="<h1>Hello</h1>" />)
    const iframe = screen.getByTestId('html-viewer')
    expect(iframe.tagName).toBe('IFRAME')
  })

  it('should set srcDoc with the provided content', () => {
    const content = '<h1>Test Content</h1>'
    render(<HtmlViewer content={content} />)
    const iframe = screen.getByTestId('html-viewer')
    expect(iframe).toHaveAttribute('srcdoc', content)
  })

  it('should have sandbox attribute with allow-scripts', () => {
    render(<HtmlViewer content="<p>safe</p>" />)
    const iframe = screen.getByTestId('html-viewer')
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts')
  })

  it('should have title attribute for accessibility', () => {
    render(<HtmlViewer content="" />)
    const iframe = screen.getByTitle('HTML Preview')
    expect(iframe).toBeInTheDocument()
  })

  it('should apply custom className when provided', () => {
    render(<HtmlViewer content="" className="custom-class" />)
    const iframe = screen.getByTestId('html-viewer')
    expect(iframe).toHaveClass('custom-class')
  })

  it('should render empty content without error', () => {
    render(<HtmlViewer content="" />)
    expect(screen.getByTestId('html-viewer')).toBeInTheDocument()
  })
})
