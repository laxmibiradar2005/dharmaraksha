import { useLanguage } from '../context/languageState'
import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../hooks/useWorkspace'
interface Source { id: string; title: string; text: string; page: number; url: string; retrievedAt: string }
interface Status { ready: boolean; documents: number; chunks: number; coverage?: string; backend?: string; degraded?: boolean; model: string; economyMode: boolean; budget: { ceilingInr: number; dailyCeilingInr: number; providers: { reservedInr: number }[] } }
export default function LegalLibrary() {
  const {t} = useLanguage()

  const [status,setStatus] = useState<Status | null>(null)
  const [query,setQuery] = useState('')
  const [sources,setSources] = useState<Source[]>([])
  const [busy,setBusy] = useState(false)
  const [searched,setSearched] = useState(false)
  const [error,setError] = useState('')
  useEffect(() => { const c = new AbortController(); api<Status>('/api/rag/status',{signal:c.signal}).then(setStatus).catch(()=>{}); return()=>c.abort() },[])
  async function search(e: FormEvent) {
    e.preventDefault(); if (!query.trim() || busy) return
    setBusy(true); setError(''); setSources([]); setSearched(false)
    try { const result = await api<{sources:Source[]}>(`/api/rag/search?q=${encodeURIComponent(query)}`); setSources(result.sources); setSearched(true) }
    catch (e) { setError(e instanceof Error ? e.message : 'Law search unavailable.') }
    finally { setBusy(false) }
  }
  return <section className="panel law-library" aria-label={t("Official law library")}>
    <span className="eyebrow">{t("OFFICIAL LAW LIBRARY")}</span><h2>{t("Start with the source.")}</h2>
    <p>{status?.ready ? t('{documents} documents · {chunks} searchable passages · Local search is free.').replace('{documents}',String(status.documents)).replace('{chunks}',status.chunks.toLocaleString()) : t("The local legal library is not ready yet.")}</p>
    {status?.economyMode && <p className="library-budget">{t("Economy mode · One research model · ₹")}{status.budget.dailyCeilingInr}{t("/day local cap · ₹")}{status.budget.ceilingInr}{t("total local cap")}<br/><small>{t("Reserved estimate: ₹")}{status.budget.providers.reduce((n,p)=>n+p.reservedInr,0).toFixed(2)}{t(". This is not your provider balance.")}</small></p>}
    <form onSubmit={e=>void search(e)}><label className="sr-only" htmlFor="law-search">{t("Search official laws")}</label><input id="law-search" value={query} maxLength={600} onChange={e=>setQuery(e.target.value)} placeholder={t("Try bail, consumer refunds, or contract consent")}/><button className="primary-button" disabled={busy || !query.trim()}>{busy ? 'Searching…' : t("Search laws")}</button></form>
    <p className="library-note">{t(status?.coverage || 'Selected public laws and judgments. Confirm applicable dates, jurisdiction and later amendments.')} {status?.backend?.includes('pgvector') ? t("Multilingual semantic and keyword search.") : t("Keyword search snapshot.")} {status?.degraded && 'Vector service unavailable; using the cached library.'}</p>
    {error && <p role="alert">{error}</p>}
    <div aria-live="polite">{searched && !sources.length && <p>{t("No matching passages. Try the Act name or a more specific legal term.")}</p>}{sources.map(s=><article key={s.id}><a href={s.url.startsWith('https://') ? s.url : undefined} target="_blank" rel="noreferrer">{s.title} {t("· PDF page")} {s.page} ↗</a><small>{t("Downloaded")} {s.retrievedAt.slice(0,10)}</small><p>{s.text}</p></article>)}</div>
  </section>
}
