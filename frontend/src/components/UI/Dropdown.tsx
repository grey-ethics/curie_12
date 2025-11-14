import { useEffect, useRef, useState } from 'react'

type Item = { label?: string; onClick?: () => void; separator?: boolean; custom?: JSX.Element }

export default function Dropdown({ trigger, items }: { trigger: JSX.Element, items: Item[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside pointerdown (more reliable than click after re-renders)
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const el = ref.current
      if (!el || !el.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className="dropdown" ref={ref}>
      <div onClick={() => setOpen(v => !v)}>{trigger}</div>
      {open && (
        <div
          className="dropdown-menu"
          // Prevent the outside-handler from firing when clicking inside custom content
          onPointerDown={(e) => e.stopPropagation()}
        >
          {items.map((it, i) =>
            it.separator ? (
              <div className="sep" key={i} />
            ) : it.custom ? (
              <div key={i} className="custom">{it.custom}</div>
            ) : (
              <button key={i} onClick={() => { setOpen(false); it.onClick?.() }}>
                {it.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}