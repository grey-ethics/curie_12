import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'

export type SelectOption = { value: string; label: string }

export default function Select({
  value,
  onChange,
  options,
  id,
  className,
  style,
  buttonStyle,
  placeholder = 'Select…',
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

  const selectedIndex = useMemo(
    () => options.findIndex((o) => o.value === value),
    [options, value]
  )

  useEffect(() => {
    function onDocDown(e: PointerEvent) {
      const el = wrapRef.current
      if (!el) return
      if (!el.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
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
    if (
      !open &&
      (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Enter')
    ) {
      e.preventDefault()
      openList()
      return
    }
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHover((h) =>
        Math.min(options.length - 1, Math.max(0, h < 0 ? 0 : h + 1))
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHover((h) => Math.max(0, h < 0 ? 0 : h - 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setHover(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setHover(options.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (hover >= 0) {
        onChange(options[hover].value)
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

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

      {open && (
        <div
          className="dropdown-menu"
          role="presentation"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ul
            id={listId}
            role="listbox"
            aria-activedescendant={hover >= 0 ? `${listId}-${hover}` : undefined}
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              maxHeight: 220,
              overflowY: 'auto',
            }}
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
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
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
      )}
    </div>
  )
}