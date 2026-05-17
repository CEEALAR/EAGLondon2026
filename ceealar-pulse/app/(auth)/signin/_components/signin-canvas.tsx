'use client'

import { useEffect, useRef } from 'react'

/**
 * A canvas-based constellation of slow-drifting points connected by faint lines.
 * Built with vanilla 2D canvas — no deps, ~60fps, ~80 lines. Responds to mouse
 * position with a soft parallax-style attraction so the field feels alive.
 */
export function SigninCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let width = 0
    let height = 0
    let dpr = 1

    const mouse = { x: -9999, y: -9999, active: false }

    type Dot = { x: number; y: number; vx: number; vy: number; r: number; hue: 'teal' | 'gold' }
    let dots: Dot[] = []

    function resize() {
      if (!canvas) return
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx?.scale(dpr, dpr)
      // Density scales with area
      const target = Math.round((width * height) / 13000)
      dots = Array.from({ length: target }, () => makeDot())
    }

    function makeDot(): Dot {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.4 + 0.6,
        hue: Math.random() < 0.18 ? 'gold' : 'teal',
      }
    }

    function step() {
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)

      // Update + draw dots
      for (const d of dots) {
        // Drift
        d.x += d.vx
        d.y += d.vy

        // Mouse attraction
        if (mouse.active) {
          const dx = mouse.x - d.x
          const dy = mouse.y - d.y
          const dist = Math.hypot(dx, dy)
          if (dist < 160) {
            const f = (160 - dist) / 160
            d.x += (dx / dist) * f * 0.6
            d.y += (dy / dist) * f * 0.6
          }
        }

        // Wrap edges
        if (d.x < -10) d.x = width + 10
        if (d.x > width + 10) d.x = -10
        if (d.y < -10) d.y = height + 10
        if (d.y > height + 10) d.y = -10

        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = d.hue === 'gold' ? 'rgba(212, 160, 23, 0.55)' : 'rgba(15, 118, 110, 0.55)'
        ctx.fill()
      }

      // Connect nearby dots
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const a = dots[i]
          const b = dots[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d = Math.hypot(dx, dy)
          if (d < 110) {
            const alpha = (1 - d / 110) * 0.18
            ctx.strokeStyle = `rgba(15, 118, 110, ${alpha})`
            ctx.lineWidth = 0.6
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      raf = requestAnimationFrame(step)
    }

    function onMove(e: MouseEvent) {
      const rect = canvas?.getBoundingClientRect()
      if (!rect) return
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
      mouse.active = true
    }
    function onLeave() {
      mouse.active = false
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)

    // Respect reduced motion: render one static frame and stop.
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      step() // single frame
    } else {
      raf = requestAnimationFrame(step)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  )
}
