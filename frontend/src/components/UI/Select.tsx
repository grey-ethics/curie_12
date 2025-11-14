// src/components/UI/Select.tsx
import { useEffect, useId, useMemo, useRef, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties, KeyboardEvent } from 'react'

export type SelectOption = { value: string; label: string }
type Coords = { left: number; top: number; width: number }

export default function Select({
  value, onChange, options, id, className, style, buttonStyle, placeholder = 'Select…',
}: {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  id?: string
  className?: string
  style?: CSSProperties
  buttonStyle?: CSSProperties
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState<number>(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const menuRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<Coords>({ left: 0, top: 0, width: 0 })

  const selectedIndex = useMemo(() => options.findIndex((o) => o.value === value), [options, value])

  // Close on outside / ESC
  useEffect(() => {
    function onDocDown(e: PointerEvent) {
      const b = wrapRef.current
      const m = menuRef.current
      if (!b || !m) return
      const t = e.target as Node
      if (!b.contains(t) && !m.contains(t)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDocDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('pointerdown', onDocDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [])

  function openList() {
    setOpen(true)
    setHover(selectedIndex >= 0 ? selectedIndex : 0)
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!open && (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); openList(); return }
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHover(h => Math.min(options.length - 1, Math.max(0, h < 0 ? 0 : h + 1))) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHover(h => Math.max(0, h < 0 ? 0 : h - 1)) }
    else if (e.key === 'Home') { e.preventDefault(); setHover(0) }
    else if (e.key === 'End') { e.preventDefault(); setHover(options.length - 1) }
    else if (e.key === 'Enter') { e.preventDefault(); if (hover >= 0) { onChange(options[hover].value); setOpen(false) } }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
  }

  // Position inside the in-blade layer; clamp + flip like Dropdown
  useLayoutEffect(() => {
    if (!open) return
    const layer = document.getElementById('blade-floating-root')
    if (!layer) return

    const update = () => {
      const r = btnRef.current?.getBoundingClientRect() || wrapRef.current?.getBoundingClientRect()
      const L = layer.getBoundingClientRect()
      if (!r) return

      let left = r.left - L.left
      let top  = r.bottom - L.top + 6
      const width = r.width

      setCoords({ left, top, width })

      requestAnimationFrame(() => {
        const m = menuRef.current?.getBoundingClientRect()
        const L2 = layer.getBoundingClientRect()
        if (!m) return

        left = Math.max(8, Math.min(left, L2.width - m.width - 8))
        if (top + m.height > L2.height - 8) {
          top = r.top - L2.top - m.height - 6
        }
        top = Math.max(8, Math.min(top, L2.height - m.height - 8))
        setCoords({ left, top, width })
      })
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  const layer = typeof window !== 'undefined' ? document.getElementById('blade-floating-root') : null

  const panel = open ? (
    <div
      ref={menuRef}
      className="dropdown-menu"
      role="presentation"
      style={{
        position: 'absolute',
        left: coords.left,
        top: coords.top,
        minWidth: coords.width,       // match trigger width
        maxHeight: 220,
        overflowY: 'auto',
        pointerEvents: 'auto',        // enable interaction (parent layer uses pointer-events:none)
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <ul
        id={listId}
        role="listbox"
        aria-activedescendant={hover >= 0 ? `${listId}-${hover}` : undefined}
        style={{ margin: 0, padding: 0, listStyle: 'none' }}
      >
        {options.map((opt, i) => {
          const sel = value === opt.value
          const hv = hover === i
          return (
            <li
              key={opt.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={sel}
              data-clickable
              onMouseEnter={() => setHover(i)}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                background: hv ? 'var(--bg)' : 'transparent',
                fontWeight: sel ? 600 : 400,
                cursor: 'var(--cur-pointer, pointer), pointer',
              }}
            >
              {opt.label}
            </li>
          )
        })}
      </ul>
    </div>
  ) : null

  return (
    <div className={`dropdown ${className || ''}`} ref={wrapRef} style={style}>
      <button
        id={id}
        ref={btnRef}
        type="button"
        className="select-like"
        data-clickable
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        style={buttonStyle}
      >
        {selectedIndex >= 0 ? options[selectedIndex].label : placeholder}
      </button>

      {open && (layer ? createPortal(panel!, layer) : panel)}
    </div>
  )
}
