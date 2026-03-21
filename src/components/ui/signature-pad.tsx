'use client'

import { useRef, useEffect, useCallback } from 'react'
import SignaturePadLib from 'signature_pad'

/**
 * Trim whitespace around signature strokes and return a cropped data URL.
 * Scans for non-white pixels to find the bounding box, then copies that
 * region (plus padding) onto a smaller canvas.
 */
function trimSignature(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas.toDataURL()

  const { width, height } = canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const { data } = imageData

  let top = height
  let bottom = 0
  let left = width
  let right = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      // Non-white pixel (check R, G, B — ignore fully white)
      if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) {
        if (y < top) top = y
        if (y > bottom) bottom = y
        if (x < left) left = x
        if (x > right) right = x
      }
    }
  }

  // No strokes found — return empty
  if (top >= bottom || left >= right) return canvas.toDataURL()

  const pad = 10
  const cropX = Math.max(0, left - pad)
  const cropY = Math.max(0, top - pad)
  const cropW = Math.min(width, right + pad) - cropX
  const cropH = Math.min(height, bottom + pad) - cropY

  const trimmed = document.createElement('canvas')
  trimmed.width = cropW
  trimmed.height = cropH
  const tCtx = trimmed.getContext('2d')
  if (!tCtx) return canvas.toDataURL()

  // Fill white background then draw cropped region
  tCtx.fillStyle = '#fff'
  tCtx.fillRect(0, 0, cropW, cropH)
  tCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

  return trimmed.toDataURL()
}

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
        onSignatureChange(trimSignature(canvas))
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
