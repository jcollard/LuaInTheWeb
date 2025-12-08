import { renderHook, act } from '@testing-library/react'
import { useBottomPanel } from './useBottomPanel'

describe('useBottomPanel', () => {
  describe('active tab state', () => {
    it('should default to terminal tab', () => {
      // Arrange & Act
      const { result } = renderHook(() => useBottomPanel())

      // Assert
      expect(result.current.activeTab).toBe('terminal')
    })

    it('should allow setting initial tab', () => {
      // Arrange & Act
      const { result } = renderHook(() => useBottomPanel({ initialTab: 'repl' }))

      // Assert
      expect(result.current.activeTab).toBe('repl')
    })

    it('should update active tab when setActiveTab is called', () => {
      // Arrange
      const { result } = renderHook(() => useBottomPanel())

      // Act
      act(() => {
        result.current.setActiveTab('repl')
      })

      // Assert
      expect(result.current.activeTab).toBe('repl')
    })

    it('should switch back to terminal', () => {
      // Arrange
      const { result } = renderHook(() => useBottomPanel({ initialTab: 'repl' }))

      // Act
      act(() => {
        result.current.setActiveTab('terminal')
      })

      // Assert
      expect(result.current.activeTab).toBe('terminal')
    })
  })
})
