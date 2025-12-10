import { render, screen } from '@testing-library/react'
import { MenuDivider } from './MenuDivider'

describe('MenuDivider', () => {
  it('should render with role separator', () => {
    // Arrange & Act
    render(<MenuDivider />)

    // Assert
    expect(screen.getByRole('separator')).toBeInTheDocument()
  })

  it('should render as an hr element', () => {
    // Arrange & Act
    render(<MenuDivider />)

    // Assert
    const separator = screen.getByRole('separator')
    expect(separator.tagName).toBe('HR')
  })

  it('should apply divider CSS class', () => {
    // Arrange & Act
    render(<MenuDivider />)

    // Assert
    expect(screen.getByRole('separator').className).toMatch(/divider/)
  })
})
