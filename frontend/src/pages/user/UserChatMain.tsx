/*
- Same change as admin page: pass sessionId and onUpdated to ChatWindow for widget execution/refresh.
*/

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
    pieces.push(
      'Use the uploaded company documents as primary context when answering.'
    )
  } else {
    pieces.push(
      'Answer using your general knowledge. Do not rely on uploaded company documents.'
    )
  }

  if (widgets.answerStyle === 'short') {
    pieces.push('Keep the answer very short (2–3 sentences).')
  } else if (widgets.answerStyle === 'detailed') {
    pieces.push(
      'Provide a detailed, step-by-step explanation with any important caveats.'
    )
  }

  pieces.push(raw)
  return pieces.join('\n\n')
}

export default function UserChatMain() {
  const { title, active, messages, send, reload } = useUrlChat('user')
  const [widgets, setWidgets] = useState<WidgetState>(() => defaultWidgetState())

  return (
    <section className="chat-page">
      <div className="chat-header">
        <div className="left">
          <h2>{title}</h2>
        </div>
        <div className="right">
          <ChatWidgets state={widgets} onChange={setWidgets} />
        </div>
      </div>

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
      </div>
    </section>
  )
}
