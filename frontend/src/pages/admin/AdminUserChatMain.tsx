import { useState } from 'react'
import ChatWindow from '../../components/Chat/ChatWindow'
import ChatComposer from '../../components/Chat/ChatComposer'
import ChatWidgets, {
  defaultWidgetState,
  WidgetState,
} from '../../components/Chat/ChatWidgets'
import { useUrlChat } from '../../hooks/useUrlChat'

function buildContent(raw: string, widgets: WidgetState): string {
  const pieces: string[] = []

  if (widgets.useDocuments) {
    pieces.push('Use the uploaded company documents as primary context when answering.')
  } else {
    pieces.push('Answer using your general knowledge. Do not rely on uploaded company documents.')
  }

  if (widgets.answerStyle === 'short') {
    pieces.push('Keep the answer very short (2–3 sentences).')
  } else if (widgets.answerStyle === 'detailed') {
    pieces.push('Provide a detailed, step-by-step explanation with any important caveats, suitable for an admin reviewing user queries.')
  }

  pieces.push(raw)
  return pieces.join('\n\n')
}

export default function AdminUserChatMain() {
  const { active, messages, send, reload } = useUrlChat('admin') // title removed
  const [widgets, setWidgets] = useState<WidgetState>(() => defaultWidgetState())

  return (
    <section className="chat-page">
      <div className="chat-main">
        <ChatWindow messages={messages} sessionId={active} onUpdated={reload} />

        <ChatComposer
          disabled={!active}
          onSend={async (t) => {
            if (active) {
              const content = buildContent(t, widgets)
              await send(active, content)
            }
          }}
          placeholder="Ask using company docs…"
        />

        {/* Controls moved UNDER the composer */}
        <div className="chat-underbar">
          <ChatWidgets state={widgets} onChange={setWidgets} />
        </div>
      </div>
    </section>
  )
}
