'use client'

import { useRef, useEffect, useCallback } from 'react'
import SignaturePadLib from 'signature_pad'

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void
  disabled?: boolean
}

export function SignaturePad({ onSignatureChange, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePadLib | null>(null)

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !padRef.current) return

    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(ratio, ratio)

    padRef.current.clear()
    onSignatureChange(null)
  }, [onSignatureChange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
    })

    pad.addEventListener('endStroke', () => {
      if (!pad.isEmpty()) {
        onSignatureChange(pad.toDataURL())
      }
    })

    padRef.current = pad

    // Initial sizing
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(ratio, ratio)

    const observer = new ResizeObserver(() => resizeCanvas())
    observer.observe(canvas)

    return () => {
      observer.disconnect()
      pad.off()
    }
  }, [onSignatureChange, resizeCanvas])

  useEffect(() => {
    if (padRef.current) {
      if (disabled) {
        padRef.current.off()
      } else {
        padRef.current.on()
      }
    }
  }, [disabled])

  function handleClear() {
    padRef.current?.clear()
    onSignatureChange(null)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Signature 签名</label>
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full border border-gray-300 rounded-md bg-white"
        style={{ height: 120, touchAction: 'none' }}
      />
    </div>
  )
}
