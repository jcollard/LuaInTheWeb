import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIDETerminal } from './useIDETerminal'

describe('useIDETerminal', () => {
  describe('handleOutput', () => {
    it('should add output line to terminalOutput', () => {
      const { result } = renderHook(() => useIDETerminal())

      act(() => {
        result.current.handleOutput('Hello, world!')
      })

      expect(result.current.terminalOutput).toHaveLength(1)
      expect(result.current.terminalOutput[0].text).toBe('Hello, world!')
      expect(result.current.terminalOutput[0].id).toMatch(/^line-\d+$/)
    })

    it('should add multiple output lines with unique IDs', () => {
      const { result } = renderHook(() => useIDETerminal())

      act(() => {
        result.current.handleOutput('Line 1')
        result.current.handleOutput('Line 2')
      })

      expect(result.current.terminalOutput).toHaveLength(2)
      expect(result.current.terminalOutput[0].id).not.toBe(result.current.terminalOutput[1].id)
    })
  })

  describe('handleError', () => {
    it('should add error line to terminalOutput', () => {
      const { result } = renderHook(() => useIDETerminal())

      act(() => {
        result.current.handleError('Error occurred!')
      })

      expect(result.current.terminalOutput).toHaveLength(1)
      expect(result.current.terminalOutput[0].text).toBe('Error occurred!')
    })
  })

  describe('handleReadInput', () => {
    it('should set isAwaitingInput to true', () => {
      const { result } = renderHook(() => useIDETerminal())

      act(() => {
        result.current.handleReadInput()
      })

      expect(result.current.isAwaitingInput).toBe(true)
    })

    it('should add waiting message to terminalOutput', () => {
      const { result } = renderHook(() => useIDETerminal())

      act(() => {
        result.current.handleReadInput()
      })

      expect(result.current.terminalOutput).toHaveLength(1)
      expect(result.current.terminalOutput[0].text).toBe('> Waiting for input...')
    })

    it('should return a promise', () => {
      const { result } = renderHook(() => useIDETerminal())

      let promise: Promise<string> | undefined
      act(() => {
        promise = result.current.handleReadInput()
      })

      expect(promise).toBeInstanceOf(Promise)
    })
  })

  describe('submitInput', () => {
    it('should resolve handleReadInput promise with input value', async () => {
      const { result } = renderHook(() => useIDETerminal())

      let promise: Promise<string> | undefined
      act(() => {
        promise = result.current.handleReadInput()
      })

      act(() => {
        result.current.submitInput('user input')
      })

      await expect(promise).resolves.toBe('user input')
    })

    it('should set isAwaitingInput to false', async () => {
      const { result } = renderHook(() => useIDETerminal())

      act(() => {
        result.current.handleReadInput()
      })

      expect(result.current.isAwaitingInput).toBe(true)

      act(() => {
        result.current.submitInput('test')
      })

      expect(result.current.isAwaitingInput).toBe(false)
    })

    it('should do nothing if not awaiting input', () => {
      const { result } = renderHook(() => useIDETerminal())

      // Should not throw
      act(() => {
        result.current.submitInput('ignored')
      })

      expect(result.current.isAwaitingInput).toBe(false)
    })
  })

  describe('clearTerminal', () => {
    it('should clear all terminal output', () => {
      const { result } = renderHook(() => useIDETerminal())

      act(() => {
        result.current.handleOutput('Line 1')
        result.current.handleOutput('Line 2')
        result.current.handleError('Error')
      })

      expect(result.current.terminalOutput).toHaveLength(3)

      act(() => {
        result.current.clearTerminal()
      })

      expect(result.current.terminalOutput).toHaveLength(0)
    })
  })
})
