// src/components/Chat/ChatWidgets.tsx
import Toggle from '../UI/Toggle'
import Select from '../UI/Select'

export type WidgetState = {
  useDocuments: boolean
  answerStyle: 'default' | 'short' | 'detailed'
}

export function defaultWidgetState(): WidgetState {
  return { useDocuments: true, answerStyle: 'default' }
}

export default function ChatWidgets({
  state,
  onChange,
}: {
  state: WidgetState
  onChange: (next: WidgetState) => void
}) {
  const set = (patch: Partial<WidgetState>) => onChange({ ...state, ...patch })

  return (
    <div
      className="chat-widgets"
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
      }}
    >
      {/* Context toggle: LLM vs Docs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12 }}>Context</span>
        <Toggle
          value={state.useDocuments}
          onChange={(v) => set({ useDocuments: v })}
          leftLabel="LLM"
          rightLabel="Docs"
        />
      </div>

      {/* Answer style select */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12 }}>Answer style</span>
        <Select
          value={state.answerStyle}
          onChange={(v) => set({ answerStyle: v as WidgetState['answerStyle'] })}
          options={[
            { value: 'default', label: 'Normal' },
            { value: 'short', label: 'Short' },
            { value: 'detailed', label: 'Detailed' },
          ]}
          buttonStyle={{ minWidth: 120 }}
        />
      </div>
    </div>
  )
}
