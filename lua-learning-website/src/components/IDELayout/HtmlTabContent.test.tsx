import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { HtmlTabContent } from './HtmlTabContent'

describe('HtmlTabContent', () => {
  it('should render the HtmlViewer with provided content', () => {
    render(<HtmlTabContent content="<h1>Hello</h1>" />)
    const iframe = screen.getByTestId('html-viewer')
    expect(iframe).toHaveAttribute('srcdoc', '<h1>Hello</h1>')
  })

  it('should render TabBar when tabBarProps are provided', () => {
    const tabBarProps = {
      tabs: [{ path: '/test.html', name: 'test.html', isDirty: false, type: 'html' as const, isPreview: false, isPinned: false }],
      activeTab: '/test.html',
      onSelect: () => {},
      onClose: () => {},
    }
    render(<HtmlTabContent content="<p>test</p>" tabBarProps={tabBarProps} />)
    expect(screen.getByText('test.html')).toBeInTheDocument()
  })

  it('should render without TabBar when tabBarProps is undefined', () => {
    const { container } = render(<HtmlTabContent content="<p>test</p>" />)
    // Should still render the iframe
    expect(screen.getByTestId('html-viewer')).toBeInTheDocument()
    // TabBar should not be present
    expect(container.querySelector('[data-testid="tab-bar"]')).toBeNull()
  })
})
