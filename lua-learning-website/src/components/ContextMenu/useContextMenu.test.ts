import { renderHook, act } from '@testing-library/react'
import { useContextMenu } from './useContextMenu'

describe('useContextMenu', () => {
  it('should start with menu closed and position at origin', () => {
    // Arrange & Act
    const { result } = renderHook(() => useContextMenu())

    // Assert
    expect(result.current.isOpen).toBe(false)
    expect(result.current.position).toEqual({ x: 0, y: 0 })
  })

  it('should open menu and set position when show is called', () => {
    // Arrange
    const { result } = renderHook(() => useContextMenu())

    // Act
    act(() => {
      result.current.show(100, 200)
    })

    // Assert
    expect(result.current.isOpen).toBe(true)
    expect(result.current.position).toEqual({ x: 100, y: 200 })
  })

  it('should close menu when hide is called', () => {
    // Arrange
    const { result } = renderHook(() => useContextMenu())

    act(() => {
      result.current.show(100, 200)
    })
    expect(result.current.isOpen).toBe(true)

    // Act
    act(() => {
      result.current.hide()
    })

    // Assert
    expect(result.current.isOpen).toBe(false)
  })

  it('should retain position after hide is called', () => {
    // Arrange
    const { result } = renderHook(() => useContextMenu())

    act(() => {
      result.current.show(150, 250)
    })

    // Act
    act(() => {
      result.current.hide()
    })

    // Assert
    expect(result.current.position).toEqual({ x: 150, y: 250 })
  })

  it('should update position when show is called multiple times', () => {
    // Arrange
    const { result } = renderHook(() => useContextMenu())

    act(() => {
      result.current.show(100, 200)
    })

    // Act
    act(() => {
      result.current.show(300, 400)
    })

    // Assert
    expect(result.current.isOpen).toBe(true)
    expect(result.current.position).toEqual({ x: 300, y: 400 })
  })

  it('should maintain stable function references across renders', () => {
    // Arrange
    const { result, rerender } = renderHook(() => useContextMenu())
    const initialShow = result.current.show
    const initialHide = result.current.hide

    // Act
    rerender()

    // Assert
    expect(result.current.show).toBe(initialShow)
    expect(result.current.hide).toBe(initialHide)
  })
})
