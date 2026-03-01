import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useModal } from './useModal'

describe('useModal', () => {
  it('initializes closed by default', () => {
    const { result } = renderHook(() => useModal())
    expect(result.current.isOpen).toBe(false)
  })

  it('initializes with initial state', () => {
    const { result } = renderHook(() => useModal(true))
    expect(result.current.isOpen).toBe(true)
  })

  it('openModal sets isOpen to true', () => {
    const { result } = renderHook(() => useModal(false))
    act(() => result.current.openModal())
    expect(result.current.isOpen).toBe(true)
  })

  it('closeModal sets isOpen to false', () => {
    const { result } = renderHook(() => useModal(true))
    act(() => result.current.closeModal())
    expect(result.current.isOpen).toBe(false)
  })

  it('toggleModal flips state', () => {
    const { result } = renderHook(() => useModal(false))
    act(() => result.current.toggleModal())
    expect(result.current.isOpen).toBe(true)
    act(() => result.current.toggleModal())
    expect(result.current.isOpen).toBe(false)
  })
})
