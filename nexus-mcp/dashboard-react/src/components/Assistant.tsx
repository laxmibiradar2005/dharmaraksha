import { useLanguage } from '../context/languageState'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import Icon from './Icon'
import { api } from '../hooks/useWorkspace'

export interface Message { role: 'user' | 'assistant'; text: string; offline?: boolean; sources?: { title: string; url: string }[] }
export interface Attachment { name: string; text: string }
const suggestions = [
  { title: 'Understand my rights', text: 'How can I understand my rights as a tenant in India?', icon: 'shield' as const },
  { title: 'Review a document', text: 'Help me understand the important terms and potential concerns in my document.', icon: 'file' as const },
  { title: 'Find my next step', text: 'What information should I prepare before speaking to a lawyer about a consumer complaint?', icon: 'court' as const },
]

export function RichText({ text }: { text: string }) {

  return <div className="rich-text">{text.split('\n').map((line, i) => {
    const content = line.replace(/^#{1,4}\s*/, '')
    const parts = content.split(/(\*\*[^*]+\*\*)/g).map((part, j) => part.startsWith('**') && part.endsWith('**') ? <strong key={j}>{part.slice(2, -2)}</strong> : part)
    return /^#{1,4}\s/.test(line) ? <h4 key={i}>{parts}</h4> : <p key={i}>{content ? parts : <br />}</p>
  })}</div>
}

export default function Assistant({ messages, setMessages, attachment, onAttachment, draft, setDraft, onBusyChange }: {
  messages: Message[]; setMessages: (messages: Message[]) => void;
  attachment: Attachment | null; onAttachment: (attachment: Attachment | null) => void;
  draft: string; setDraft: (draft: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const {t, language, choose} = useLanguage()

  const [ended, setEnded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const end = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => { if (!messages.length) setEnded(false) }, [messages.length])
  useEffect(() => { onBusyChange(loading || uploading) }, [loading, uploading, onBusyChange])
  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }) }, [messages, loading])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || loading || uploading || ended) return
    const next: Message[] = [...messages, { role: 'user', text }]
    setMessages(next); setDraft(''); setError(''); setLoading(true)
    controller.current = new AbortController()
    const timer = setTimeout(() => controller.current?.abort(), 135000)
    try {
      const data = await api<{ reply: string; ended?: boolean; offline?: boolean; sources?: { title: string; url: string }[] }>('/api/assistant/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.current.signal,
        body: JSON.stringify({ message: text, history: messages.slice(-12), language, context: attachment?.text.slice(0, 20000) }) })
      setEnded(data.ended === true)
      setMessages([...next, { role: 'assistant', text: data.reply, offline: data.offline, sources: data.sources }])
    } catch (err) {
      setMessages(messages); setDraft(text)
      setError(err instanceof Error && err.name === 'AbortError' ? 'The request timed out. Please try again.' : err instanceof Error ? err.message : 'Unable to reach the assistant. Please try again.')
    } finally { clearTimeout(timer); setLoading(false) }
  }

  async function upload(file?: File) {
    if (!file) return
    setError('')
    if (file.size > 10 * 1024 * 1024) { setError('Choose a document smaller than 10 MB.'); return }
    if (!/\.(pdf|docx|txt|md)$/i.test(file.name)) { setError('Please choose a PDF, DOCX, TXT, or Markdown document.'); return }
    setUploading(true)
    const form = new FormData(); form.append('file', file)
    try {
      const data = await api<{ text: string }>('/api/chat/parse-document', { method: 'POST', body: form })
      if (!data.text.trim()) throw new Error('No readable text was found. Try a text-based PDF or TXT file.')
      onAttachment({ name: file.name, text: data.text })
      if (!draft) setDraft('Please summarize this document and highlight the terms I should review with a lawyer.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Document upload failed.') }
    finally { setUploading(false); if (fileInput.current) fileInput.current.value = '' }
  }

  return <section className="assistant-workspace panel">
    <div className="assistant-toolbar"><div className="assistant-identity"><span className="assistant-avatar"><Icon name="spark" /></span><div><strong>{t("Dharmaraksha AI")}</strong><small>{t("Your Indian legal research companion")}</small></div></div>
      <button type="button" className="secondary-button" onClick={choose} disabled={loading}>{t("Change language by voice")}</button>
    </div>
    <div className="conversation" aria-live="polite" aria-busy={loading}>
      {!messages.length && <div className="assistant-welcome"><div className="welcome-symbol"><Icon name="scales" size={36} /></div><span className="eyebrow">{t("A LITTLE CLARITY GOES A LONG WAY")}</span><h2>{t("Let's make the law")}<br /><em>{t("easier to understand.")}</em></h2><p>{t("Ask a question, unpack a legal document, or explore your next step.")}<br />{t("Start wherever you are.")}</p><div className="suggestions">{suggestions.map(item => <button key={t(item.title)} onClick={() => setDraft(item.text)}><Icon name={item.icon} /><strong>{t(item.title)}</strong><Icon name="diagonal" size={16} /></button>)}</div></div>}
      {messages.map((message, i) => <article key={i} className={`message ${message.role}`}><span className="message-avatar">{message.role === 'assistant' ? <Icon name="spark" size={17} /> : t("You")}</span><div><span className="message-author">{message.role === 'assistant' ? t("Dharmaraksha AI") : t("You")}</span>{message.offline && <span className="offline-label">{t("Offline draft · Small model · Cached context only")}</span>}<RichText text={message.text} />{message.sources?.filter(source => source.url.startsWith('https://')).map(source => <a className="source-link" href={source.url} key={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}</div></article>)}
      {loading && <div className="thinking"><Icon name="spark" size={18} /><span>{t("Considering your question")}</span><span className="thinking-dots">•••</span></div>}<div ref={end} />
    </div>
    {ended && <p role="status">{t("Conversation ended. Start a new conversation when you are ready.")}</p>}
    <form className="composer-area" onSubmit={submit}>
      {error && <div className="inline-error" role="alert">{error}</div>}
      {attachment && <div className="attachment-chip"><Icon name="file" size={16} /><span>{attachment.name}</span><button type="button" aria-label={t("Remove attached document")} disabled={loading} onClick={() => onAttachment(null)}><Icon name="close" size={14} /></button></div>}
      <div className="composer"><textarea aria-label={t("Your legal question")} placeholder={t("What would you like to understand?")} value={draft} maxLength={6000} onChange={e => setDraft(e.target.value)} disabled={loading || ended} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit() } }} rows={2} />
        <div className="composer-tools"><input type="file" ref={fileInput} hidden accept=".pdf,.docx,.txt,.md" onChange={e => void upload(e.target.files?.[0])} /><button className="attach-button" type="button" disabled={loading || uploading} onClick={() => fileInput.current?.click()}><Icon name="attach" size={17} />{uploading ? t("Reading document…") : t("Attach document")}</button><span className="composer-hint">{t("Enter to send")}</span><button className="send-button" aria-label={t("Send question")} type="submit" disabled={ended || loading || uploading || !draft.trim()}><Icon name="arrow" size={21} /></button></div>
      </div><p className="assistant-note"><Icon name="shield" size={13} />{t("AI can make mistakes. Verify sources with a qualified lawyer. Documents are sent to the configured AI provider.")}</p>
    </form>
  </section>
}
