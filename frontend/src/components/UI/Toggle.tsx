export default function Toggle({
  value, onChange, leftLabel, rightLabel
}: {
  value: boolean
  onChange: (v: boolean) => void
  leftLabel?: string
  rightLabel?: string
}) {
  return (
    <div
      className="toggle"
      role="switch"
      aria-checked={value}
      tabIndex={0}
      data-clickable
      onClick={() => onChange(!value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(!value) }
      }}
    >
      {leftLabel && <span className={!value ? 'active' : ''}>{leftLabel}</span>}
      <div className={`pill ${value ? 'on' : 'off'}`} />
      {rightLabel && <span className={value ? 'active' : ''}>{rightLabel}</span>}
    </div>
  )
}
