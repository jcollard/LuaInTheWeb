import { useState, useRef, useEffect, useCallback } from 'react'
import type { RGBColor } from './types'
import { hsvToRgb, rgbToHsv, rgbToHex, hexToRgb } from './colorUtils'
import { colorAtPosition, drawSvGradient, hueFromCanvasY, drawHueBar } from './colorPanelUtils'

type PickerTarget = 'fg' | 'bg'

export interface UseColorPickerReturn {
  // Inline picker
  svCanvasRef: React.RefObject<HTMLCanvasElement | null>
  hueCanvasRef: React.RefObject<HTMLCanvasElement | null>
  handleSvMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void
  handleHueMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void
  // Modal picker
  pickerTarget: PickerTarget | null
  hexValue: string
  setHexValue: (v: string) => void
  modalSvRef: React.RefObject<HTMLCanvasElement | null>
  modalHueRef: React.RefObject<HTMLCanvasElement | null>
  fgBgSectionRef: React.RefObject<HTMLDivElement | null>
  popoverStyle: React.CSSProperties
  openPicker: (target: PickerTarget) => void
  closePicker: () => void
  handleModalSvMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void
  handleModalHueMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void
  handleHexApply: () => void
  // Brightness
  adjustBrightness: (target: 'fg' | 'bg', delta: number) => void
}

export function useColorPicker(
  selectedFg: RGBColor,
  selectedBg: RGBColor,
  onSetFg: (color: RGBColor) => void,
  onSetBg: (color: RGBColor) => void,
): UseColorPickerReturn {
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null)

  // Inline picker state
  const [hue, setHue] = useState(0)
  const [svDragging, setSvDragging] = useState<'left' | 'right' | null>(null)
  const [hueDragging, setHueDragging] = useState(false)
  const svCanvasRef = useRef<HTMLCanvasElement>(null)
  const hueCanvasRef = useRef<HTMLCanvasElement>(null)
  const hueRef = useRef(hue)
  hueRef.current = hue

  // Modal picker state
  const [modalHue, setModalHue] = useState(0)
  const [modalSvDragging, setModalSvDragging] = useState(false)
  const [modalHueDragging, setModalHueDragging] = useState(false)
  const [hexValue, setHexValue] = useState('')
  const modalSvRef = useRef<HTMLCanvasElement>(null)
  const modalHueRef = useRef<HTMLCanvasElement>(null)
  const fgBgSectionRef = useRef<HTMLDivElement>(null)
  const modalHueValRef = useRef(modalHue)
  modalHueValRef.current = modalHue

  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})

  const modalApply = pickerTarget === 'fg' ? onSetFg : onSetBg

  const openPicker = useCallback((target: PickerTarget) => {
    const color = target === 'fg' ? selectedFg : selectedBg
    const [h] = rgbToHsv(color[0], color[1], color[2])
    setModalHue(h)
    setHexValue(rgbToHex(color))
    if (fgBgSectionRef.current) {
      const rect = fgBgSectionRef.current.getBoundingClientRect()
      setPopoverStyle({
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
      })
    }
    setPickerTarget(target)
  }, [selectedFg, selectedBg])

  const closePicker = useCallback(() => {
    setPickerTarget(null)
  }, [])

  const adjustBrightness = useCallback((target: 'fg' | 'bg', delta: number) => {
    const color = target === 'fg' ? selectedFg : selectedBg
    const setter = target === 'fg' ? onSetFg : onSetBg
    const [h, s, v] = rgbToHsv(color[0], color[1], color[2])
    setter(hsvToRgb(h, s, Math.max(0, Math.min(1, v + delta))))
  }, [selectedFg, selectedBg, onSetFg, onSetBg])

  // --- Inline picker drawing ---
  useEffect(() => {
    const [, s, v] = rgbToHsv(selectedFg[0], selectedFg[1], selectedFg[2])
    drawSvGradient(svCanvasRef.current, hue, { s, v })
  }, [hue, selectedFg])
  useEffect(() => { drawHueBar(hueCanvasRef.current, hue) }, [hue])

  // --- Modal picker drawing ---
  useEffect(() => {
    if (pickerTarget === null) return
    const color = pickerTarget === 'fg' ? selectedFg : selectedBg
    const [, s, v] = rgbToHsv(color[0], color[1], color[2])
    drawSvGradient(modalSvRef.current, modalHue, { s, v })
  }, [modalHue, pickerTarget, selectedFg, selectedBg])

  useEffect(() => {
    if (pickerTarget === null) return
    drawHueBar(modalHueRef.current, modalHue)
  }, [pickerTarget, modalHue])

  // --- Inline SV: mousedown + drag ---
  const handleSvMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget
    const color = colorAtPosition(canvas, hueRef.current, e.clientX, e.clientY)
    if (e.button === 2) {
      e.preventDefault()
      onSetBg(color)
      setSvDragging('right')
    } else {
      onSetFg(color)
      setSvDragging('left')
    }
  }, [onSetFg, onSetBg])

  useEffect(() => {
    if (!svDragging) return
    const setter = svDragging === 'left' ? onSetFg : onSetBg
    const onMove = (e: MouseEvent) => {
      const canvas = svCanvasRef.current
      if (!canvas) return
      setter(colorAtPosition(canvas, hueRef.current, e.clientX, e.clientY))
    }
    const onUp = () => setSvDragging(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [svDragging, onSetFg, onSetBg])

  // --- Inline hue bar: mousedown + drag ---
  const handleHueMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setHue(hueFromCanvasY(e.currentTarget, e.clientY))
    setHueDragging(true)
  }, [])

  useEffect(() => {
    if (!hueDragging) return
    const onMove = (e: MouseEvent) => {
      const canvas = hueCanvasRef.current
      if (!canvas) return
      setHue(hueFromCanvasY(canvas, e.clientY))
    }
    const onUp = () => setHueDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [hueDragging])

  // --- Modal SV: mousedown + drag (always applies to target) ---
  const handleModalSvMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = e.currentTarget
    const color = colorAtPosition(canvas, modalHueValRef.current, e.clientX, e.clientY)
    modalApply(color)
    setHexValue(rgbToHex(color))
    setModalSvDragging(true)
  }, [modalApply])

  useEffect(() => {
    if (!modalSvDragging) return
    const onMove = (e: MouseEvent) => {
      const canvas = modalSvRef.current
      if (!canvas) return
      const color = colorAtPosition(canvas, modalHueValRef.current, e.clientX, e.clientY)
      modalApply(color)
      setHexValue(rgbToHex(color))
    }
    const onUp = () => setModalSvDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [modalSvDragging, modalApply])

  // --- Modal hue bar: mousedown + drag ---
  const handleModalHueMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setModalHue(hueFromCanvasY(e.currentTarget, e.clientY))
    setModalHueDragging(true)
  }, [])

  useEffect(() => {
    if (!modalHueDragging) return
    const onMove = (e: MouseEvent) => {
      const canvas = modalHueRef.current
      if (!canvas) return
      setModalHue(hueFromCanvasY(canvas, e.clientY))
    }
    const onUp = () => setModalHueDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [modalHueDragging])

  const handleHexApply = useCallback(() => {
    const rgb = hexToRgb(hexValue)
    if (rgb) modalApply(rgb)
  }, [hexValue, modalApply])

  return {
    svCanvasRef,
    hueCanvasRef,
    handleSvMouseDown,
    handleHueMouseDown,
    pickerTarget,
    hexValue,
    setHexValue,
    modalSvRef,
    modalHueRef,
    fgBgSectionRef,
    popoverStyle,
    openPicker,
    closePicker,
    handleModalSvMouseDown,
    handleModalHueMouseDown,
    handleHexApply,
    adjustBrightness,
  }
}
