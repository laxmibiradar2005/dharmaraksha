import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const cases = [{ session_id: 'test-case-1', topic: 'Review of a rental agreement', status: 'complete', risk_level: 'low', agents_done: 4, created_at: '2026-11-13T05:00:00Z' }, { session_id: 'test-case-2', topic: 'Consumer complaint research', status: 'running', risk_level: 'medium', agents_done: 2, created_at: '2026-11-12T05:00:00Z' }]

test.beforeEach(async ({ page }) => {
  await page.route('**/api/languages/*', route => route.fulfill({json:{messages:{}}}))
  await page.addLocatorHandler(page.getByRole('heading',{name:'Which language do you want to use?'}),async()=>{await page.locator('.language-grid button').filter({hasText:'English'}).click()},{times:1})
  // Live Telegram traffic must not navigate unrelated browser tests away.
  await page.routeWebSocket('**/ws', ws => ws.send(JSON.stringify({type:'connected'})))
  await page.route('**/api/voice/status', route => route.fulfill({ json: { configured: false } }))
  await page.route('**/api/voice/speak', route => route.fulfill({ status: 503, json: { error: 'Live speech is disabled during automated testing.' } }))
  await page.route('**/api/sessions', route => route.fulfill({ json: cases }))
  await page.route('**/api/sessions/test-case-1', route => route.fulfill({ json: { ...cases[0], verdict: '## Research findings\nThis is a test report. **Verify with a lawyer.**' } }))
})

test('courtroom fills the page and supports camera views, participants, and navigation', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('/#/overview')
  await expect(page.getByRole('heading', { name: 'The courtroom' })).toBeVisible()
  const bounds = await page.locator('.court-experience').boundingBox()
  expect(bounds?.height).toBe(1000)
  expect(bounds?.width).toBe(1440)
  await expect(page.locator('.court-canvas canvas')).toBeVisible()
  await expect(page.getByText('Opening the courtroom…', { exact: true })).toBeHidden()
  await page.getByRole('button', { name: '04 Entire room' }).click()
  await expect(page.getByRole('button', { name: '04 Entire room' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Reset courtroom camera' }).click()
  await expect(page.getByRole('button', { name: '01 The gallery' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Participants', exact: true }).click()
  await page.locator('.participant-list button').first().click()
  await expect(page.locator('.court-participants')).toContainText('PARTICIPANT PROFILE')
  await page.getByRole('button', { name: 'Close participants' }).click()
  await page.getByRole('link', { name: 'AI assistant', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Good questions. Clearer answers.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'AI assistant AI' })).toHaveAttribute('aria-current', 'page')
  expect(errors).toEqual([])
})

test('assistant submits language and history and renders untrusted output safely', async ({ page }) => {
  let body: Record<string, unknown> = {}
  await page.route('**/api/assistant/chat', async route => { body = route.request().postDataJSON(); await route.fulfill({ json: { reply: 'Review this carefully. <img src=x onerror=alert(1)>', language: 'kn-IN' } }) })
  await page.goto('/#/assistant')
  await page.getByRole('button', {name:'Change language by voice',exact:true}).click()
  await page.locator('.language-grid button').filter({hasText:'Kannada'}).click()
  await page.getByRole('button', { name: 'Understand my rights' }).click()
  await page.getByRole('button', { name: 'Send question' }).click()
  await expect(page.locator('.message.assistant')).toContainText('<img src=x onerror=alert(1)>')
  await expect(page.locator('.message img')).toHaveCount(0)
  expect(body.language).toBe('kn-IN')
  await page.getByRole('textbox', { name: 'Your legal question' }).fill('What facts would be useful?')
  await page.getByRole('button', { name: 'Send question' }).click()
  await expect(page.locator('.message.assistant')).toHaveCount(2)
  expect(body.history).toHaveLength(2)
})

test('assistant preserves drafts after failure and protects an in-flight request from reset', async ({ page }) => {
  await page.route('**/api/assistant/chat', async route => { await new Promise(resolve => setTimeout(resolve, 400)); await route.fulfill({ status: 503, json: { error: 'AI provider unavailable. Try again.' } }) })
  await page.goto('/#/assistant')
  await page.getByRole('textbox', { name: 'Your legal question' }).fill('Please help me understand a contract.')
  await page.getByRole('button', { name: 'Send question' }).click()
  await expect(page.getByRole('button', { name: 'New conversation' })).toBeDisabled()
  await expect(page.getByRole('alert')).toContainText('AI provider unavailable')
  await expect(page.getByRole('textbox', { name: 'Your legal question' })).toHaveValue('Please help me understand a contract.')
  await expect(page.locator('.message')).toHaveCount(0)
})

test('document upload extracts real text and carries it into the assistant request', async ({ page }) => {
  let body: Record<string, unknown> = {}
  await page.route('**/api/assistant/chat', async route => { body = route.request().postDataJSON(); await route.fulfill({ json: { reply: 'The reference document is available for discussion.' } }) })
  await page.goto('/#/assistant')
  await page.locator('input[type=file]').setInputFiles({ name: 'example-contract.txt', mimeType: 'text/plain', buffer: Buffer.from('Example agreement: payment is due in thirty days.') })
  await expect(page.locator('.attachment-chip')).toContainText('example-contract.txt')
  await page.getByRole('button', { name: 'Send question' }).click()
  await expect(page.locator('.message.assistant')).toBeVisible()
  expect(body.context).toBe('Example agreement: payment is due in thirty days.')
})

test('case filters, search, details, and report download work', async ({ page }) => {
  await page.goto('/#/cases')
  await page.getByRole('button', { name: 'Completed', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await page.getByRole('textbox', { name: 'Search investigations' }).fill('missing')
  await expect(page.getByRole('heading', { name: 'No matching cases' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await page.getByRole('button', { name: 'Review of a rental agreement CASE' }).click()
  await expect(page.getByRole('dialog')).toContainText('Research findings')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download findings' }).click()
  expect((await download).suggestedFilename()).toBe('Dharmaraksha-test-cas.txt')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('new investigation uses a correlated session and handles live review and completion', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true }))
  let emit: ((data: string) => void) | undefined
  await page.routeWebSocket('**/ws', ws => { emit = data => ws.send(data); ws.send(JSON.stringify({ type: 'connected' })) })
  let sessionId = ''
  await page.route('**/api/pipeline/start', async route => {
    sessionId = route.request().postDataJSON().session_id
    emit?.(JSON.stringify({ type: 'session_start', session_id: sessionId, topic: 'Test legal investigation' }))
    await route.fulfill({ json: { ok: true, session_id: sessionId } })
  })
  await page.route('**/api/pipeline/risk-response', async route => {
    expect(route.request().postDataJSON().session_id).toBe(sessionId)
    emit?.(JSON.stringify({ type: 'RISK_GATE', session_id: sessionId, status: 'approved' }))
    emit?.(JSON.stringify({ type: 'session_complete', session_id: sessionId, verdict: 'Test investigation completed.' }))
    await route.fulfill({ json: { ok: true } })
  })
  await page.goto('/#/overview')
  await expect(page.locator('.court-session').getByText('Server connected', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'New investigation', exact: true }).click()
  await page.getByRole('textbox', { name: 'Investigation topic' }).fill('Please review this test legal investigation.')
  await page.getByRole('button', { name: 'Start investigation' }).click()
  await expect(page.getByRole('heading', { name: 'The courtroom' })).toBeVisible()
  emit?.(JSON.stringify({ type: 'session_error', session_id: 'another-session', error: 'Unrelated error' }))
  await expect(page.getByText('Unrelated error')).toHaveCount(0)
  emit?.(JSON.stringify({ type: 'RISK_GATE', session_id: sessionId, status: 'paused', risk_score: 7 }))
  await expect(page.getByRole('heading', { name: 'Human review required · Risk score 7' })).toBeVisible()
  await page.getByRole('button', { name: 'Approve and continue' }).click()
  await expect(page.locator('.findings-panel')).toContainText('Test investigation completed.')
})

test('mobile navigation, agent search, and layout fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/overview')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: 'Agent network' }).click()
  await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false')
  await page.getByRole('textbox', { name: 'Search agents' }).fill('Tax')
  await expect(page.locator('.agent-card')).toHaveCount(1)
  await expect(page.locator('.agent-card')).toContainText('Tax Law Specialist')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('assistant has no serious accessibility issues', async ({ page }) => {
  await page.goto('/#/assistant')
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([])
})

test('PDF uploads use the installed PDF parser successfully', async ({ request }) => {
  const content = 'BT /F1 16 Tf 40 100 Td (Document upload test.) Tj ET'
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${object}\nendobj\n` })
  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  const response = await request.post('/api/chat/parse-document', { multipart: { file: { name: 'test.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf) } } })
  expect(response.ok()).toBe(true)
  expect((await response.json()).text).toContain('Document upload test.')
})

test('legacy voice page loads without browser errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/#/nfc-voice')
  await expect(page.getByText('DHARMARAKSHA', { exact: true }).first()).toBeVisible()
  expect(errors).toEqual([])
})

test('Criminal Law selection opens its profile, survives reload, and introduces the correct agent', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: { cancel() {}, speak(speech: SpeechSynthesisUtterance) { queueMicrotask(() => speech.onstart?.(new Event('start') as SpeechSynthesisEvent)) } } })
  })
  await page.goto('/#/agents')
  await page.getByRole('button', { name: 'Meet Criminal Law (BNS) in the courtroom' }).click()
  await expect(page).toHaveURL(/courtroom\?agent=criminal_law_agent/)
  await expect(page.locator('.court-heading h1')).toHaveText('Criminal Law (BNS)')
  await expect(page.locator('.court-participants')).toContainText('I am the Criminal Law Specialist.')
  await page.reload()
  await page.locator('.language-grid button').filter({hasText:'English'}).click()
  await expect(page.locator('.court-participants')).toContainText('Criminal Law (BNS)')
  await page.getByRole('button', { name: 'Play introduction Device voice' }).click()
  await expect(page.getByRole('button', { name: 'Stop introduction Device voice' })).toBeVisible()
  await page.getByRole('button', { name: 'Stop introduction Device voice' }).click()
  await page.getByRole('button', { name: 'Ask this specialist' }).click()
  await expect(page.getByRole('textbox', { name: 'Your legal question' })).toHaveValue('I would like help from Criminal Law (BNS). ')
})

test('clear view hides scene text and allows restoring navigation', async ({ page }) => {
  await page.goto('/#/courtroom?agent=criminal_law_agent')
  await page.getByRole('button', { name: 'Hide interface' }).click()
  await expect(page.locator('.court-heading')).toBeHidden()
  await expect(page.locator('.court-participants')).toBeHidden()
  await expect(page.locator('.court-camera-bar')).toBeHidden()
  await expect(page.locator('.court-canvas canvas')).toBeVisible()
  await page.getByRole('button', { name: 'Show controls' }).click()
  await page.getByRole('link', { name: 'Case workspace', exact: true }).click()
  await expect(page.locator('.case-table')).toBeVisible()
})

test('assistant conversation survives voice and document navigation', async ({ page }) => {
  await page.route('**/api/assistant/chat', route => route.fulfill({ json: { reply: 'Your conversation is still here.' } }))
  await page.goto('/#/assistant')
  await page.getByRole('textbox', { name: 'Your legal question' }).fill('Help me understand my rental agreement.')
  await page.getByRole('button', { name: 'Send question' }).click()
  await expect(page.locator('.message.assistant')).toBeVisible()
  await page.getByRole('link', { name: 'Voice & document scan' }).click()
  await expect(page.getByRole('button', { name: 'Try demo card' })).toBeVisible()
  await page.getByRole('link', { name: 'Documents', exact: true }).click()
  await page.getByRole('button', { name: 'Open document assistant' }).click()
  await expect(page.locator('.message.assistant')).toHaveText(/Your conversation is still here/)
})

test('Online introduction is requested only on click and can be stopped', async ({ page }) => {
  let calls = 0
  await page.route('**/api/voice/status', route => route.fulfill({ json: { configured: true } }))
  await page.route('**/api/voice/speak', route => {
    if (route.request().postDataJSON().text.startsWith('Namaste. Which language')) return route.fulfill({contentType:'audio/wav',body:Buffer.from('greeting')})
    calls++
    expect(route.request().postDataJSON().text).toContain('Criminal Law Specialist')
    return route.fulfill({ contentType: 'audio/wav', body: Buffer.from('test-audio') })
  })
  await page.addInitScript(() => { HTMLMediaElement.prototype.play = () => Promise.resolve() })
  await page.goto('/#/courtroom?agent=criminal_law_agent')
  const play = page.getByRole('button', { name: 'Play introduction Online voice' })
  await expect(play).toBeVisible()
  expect(calls).toBe(0)
  await play.click()
  await expect.poll(() => calls).toBe(1)
  await page.getByRole('button', { name: 'Stop introduction Online voice' }).click()
  await expect(play).toBeVisible()
})

test('fullscreen hides overlays and restores usable navigation', async ({ page }) => {
  await page.goto('/#/courtroom')
  await page.getByRole('button', { name: 'Enter fullscreen' }).click()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
  await expect(page.locator('.court-heading')).toBeHidden()
  await page.getByRole('button', { name: 'Show controls' }).click()
  await page.getByRole('button', { name: 'Exit fullscreen' }).click()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false)
  await expect(page.locator('.court-header')).toBeVisible()
  await page.getByRole('button', { name: 'Hide interface' }).click()
  await page.goto('/#/courtroom?agent=criminal_law_agent')
  await expect(page.locator('.court-participants')).toBeVisible()
})

test('photo capture requires review and supports retake before sending', async ({ page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL
  test.skip(!!base && new URL(base).protocol === 'http:' && !['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Physical LAN HTTP cannot expose browser getUserMedia; tested separately as unavailable.')
  let uploads = 0
  await page.routeWebSocket('**/ws', () => {})
  await page.route('**/api/document-vision', route => {
    uploads++
    expect(route.request().postDataJSON().image_base64.length).toBeGreaterThan(20)
    return route.fulfill({ json: { sessionId: 'test-case-1', extractedText: 'Example document' } })
  })
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: { cancel() {}, getVoices() { return [] }, speak(speech: SpeechSynthesisUtterance) { queueMicrotask(() => speech.onend?.(new Event('end') as SpeechSynthesisEvent)) } } })
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480
      const ctx = canvas.getContext('2d')!
      const timer = setInterval(() => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 640, 480); ctx.fillStyle = '#000'; ctx.fillText('Test document', 40, 40) }, 30)
      const stream = canvas.captureStream(30)
      stream.getTracks().forEach(track => track.addEventListener('ended', () => clearInterval(timer)))
      return stream
    }
  })
  await page.goto('/#/nfc-voice')
  await page.getByRole('button', { name: 'Try demo card' }).click()
  await page.getByRole('button', { name: /English English/ }).click()
  await page.waitForFunction(() => (document.querySelector('video')?.readyState ?? 0) >= 2)
  await page.getByRole('button', { name: 'Capture photo' }).click()
  await expect(page.getByRole('img', { name: 'Captured document preview' })).toBeVisible()
  expect(uploads).toBe(0)
  await page.getByRole('button', { name: 'Retake', exact: true }).click()
  await page.waitForFunction(() => (document.querySelector('video')?.readyState ?? 0) >= 2)
  await page.getByRole('button', { name: 'Capture photo' }).click()
  expect(uploads).toBe(0)
  await page.getByRole('button', { name: 'Use photo', exact: true }).click()
  await expect.poll(() => uploads).toBe(1)
})

test('unavailable browser camera gives actionable guidance without uploading', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true }))
  await page.goto('/#/nfc-voice')
  await page.getByRole('button', { name: 'Try demo card' }).click()
  await page.getByRole('button', { name: /English English/ }).click()
  await expect(page.getByText(/Browser camera capture requires HTTPS/)).toBeVisible()
})


for (const route of ['overview','assistant','cases','documents','courtroom','agents','sensors','nfc-voice']) {
  test(`page audit: ${route} renders without errors or horizontal overflow`, async ({page}, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`/#/${route}`)
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('.loading-panel')).toHaveCount(0)
    await expect(page.locator('main h1, .court-heading h1').first()).toBeAttached()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({path:testInfo.outputPath(`${route}.png`)})
    expect(errors).toEqual([])
  })
}

test('language preference survives page navigation', async ({page}) => {
  await page.goto('/#/assistant')
  await page.getByRole('button',{name:'Change language by voice',exact:true}).click()
  await page.locator('.language-grid button').filter({hasText:'Hindi'}).click()
  await page.getByRole('link', {name:'Documents', exact:true}).click()
  await page.getByRole('button', {name:'Open document assistant'}).click()
  await expect(page.locator('.language-launch')).toContainText('हिन्दी')
})

test('law search clears stale results on failure and can retry with page references', async ({page}) => {
  let fail = false
  await page.route('**/api/rag/search?*', route => fail ? route.fulfill({status:503,json:{error:'Search temporarily unavailable'}}) : route.fulfill({json:{sources:[{id:'s1',title:'Test Act',text:'Test passage',page:3,url:'https://example.org/test.pdf#page=3',retrievedAt:'2026-11-14'}]}}))
  await page.goto('/#/documents')
  await page.getByRole('textbox',{name:'Search official laws'}).fill('contract')
  await page.getByRole('button',{name:'Search laws'}).click()
  await expect(page.getByRole('link',{name:'Test Act · PDF page 3 ↗'})).toHaveAttribute('href', /#page=3$/)
  fail = true
  await page.getByRole('button',{name:'Search laws'}).click()
  await expect(page.getByRole('alert')).toContainText('Search temporarily unavailable')
  await expect(page.getByText('Test passage',{exact:true})).toHaveCount(0)
  fail = false
  await page.getByRole('button',{name:'Search laws'}).click()
  await expect(page.getByText('Test passage',{exact:true})).toBeVisible()
})

test('scan page uses configured voice and does not wait for audio to open the camera', async ({page}) => {
  const spoken: string[] = []
  await page.route('**/api/voice/speak', async route => {
    spoken.push(route.request().postDataJSON().language)
    await new Promise(resolve=>setTimeout(resolve,1500))
    await route.fulfill({status:503,json:{error:'Speech unavailable'}})
  })
  await page.addInitScript(()=>Object.defineProperty(navigator,'mediaDevices',{value:undefined,configurable:true}))
  await page.goto('/#/nfc-voice')
  await page.getByRole('button',{name:'Try demo card'}).click()
  await page.getByRole('button',{name:/English English/}).click()
  await expect(page.getByText(/Browser camera capture requires HTTPS/)).toBeVisible({timeout:1000})
  await expect.poll(()=>spoken.includes('en-IN')).toBe(true)
  await page.getByRole('button',{name:'Reset',exact:true}).click()
  await expect(page.getByRole('button',{name:'Try demo card'})).toBeVisible()
})

test('Telegram events activate courtroom and show specialist work before completion', async ({page}) => {
  let emit: ((data:string)=>void) | undefined
  await page.routeWebSocket('**/ws', ws => { emit = data=>ws.send(data) })
  await page.goto('/#/agents')
  await expect.poll(()=>!!emit).toBe(true)
  const send = (event:Record<string,unknown>)=>emit?.(JSON.stringify({session_id:'telegram-audit',...event}))
  send({type:'session_start',origin:'telegram',topic:'Legal research'})
  await expect(page).toHaveURL(/courtroom/)
  send({type:'AGENT_START',agentId:'consumer_law_agent',name:'Consumer Law Specialist',category:'legal'})
  await page.getByRole('button',{name:/Live activity/}).first().click()
  await expect(page.locator('.activity-list')).toContainText('Consumer Law Specialist')
  send({type:'AGENT_COMPLETE',agentId:'consumer_law_agent',name:'Consumer Law Specialist',bubble:'Relevant evidence reviewed.'})
  send({type:'session_complete',verdict:'Research complete with sources.'})
  await expect(page.locator('.findings-panel')).toContainText('Research complete with sources.')
})
