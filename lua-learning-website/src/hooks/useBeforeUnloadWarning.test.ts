import { renderHook } from '@testing-library/react'
import { useBeforeUnloadWarning } from './useBeforeUnloadWarning'

describe('useBeforeUnloadWarning', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })

  it('should add beforeunload listener on mount', () => {
    renderHook(() => useBeforeUnloadWarning())

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    )
  })

  it('should remove beforeunload listener on unmount', () => {
    const { unmount } = renderHook(() => useBeforeUnloadWarning())

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    )
  })

  it('should set returnValue and call preventDefault on beforeunload event', () => {
    renderHook(() => useBeforeUnloadWarning())

    // Get the handler that was registered
    const handler = addEventListenerSpy.mock.calls.find(
      (call: [string, EventListenerOrEventListenerObject]) => call[0] === 'beforeunload'
    )?.[1] as EventListener

    expect(handler).toBeDefined()

    // Create a mock BeforeUnloadEvent
    const event = {
      preventDefault: vi.fn(),
      returnValue: '',
    } as unknown as BeforeUnloadEvent

    // Call the handler
    handler(event)

    // Verify preventDefault was called (standard way to trigger dialog)
    expect(event.preventDefault).toHaveBeenCalled()
    // Verify returnValue was set (legacy browser support)
    expect(event.returnValue).toBe('')
  })

  it('should use the same handler reference for add and remove', () => {
    const { unmount } = renderHook(() => useBeforeUnloadWarning())

    const addedHandler = addEventListenerSpy.mock.calls.find(
      (call: [string, EventListenerOrEventListenerObject]) => call[0] === 'beforeunload'
    )?.[1]

    unmount()

    const removedHandler = removeEventListenerSpy.mock.calls.find(
      (call: [string, EventListenerOrEventListenerObject]) => call[0] === 'beforeunload'
    )?.[1]

    expect(addedHandler).toBe(removedHandler)
  })
})
