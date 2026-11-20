# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace.spec.ts >> new investigation uses a correlated session and handles live review and completion
- Location: tests\workspace.spec.ts:96:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Human review required · Risk score 7' })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Human review required · Risk score 7' }) with timeout 15000ms
  - waiting for getByRole('heading', { name: 'Human review required · Risk score 7' })

```

```yaml
- link "Skip to content":
  - /url: "#main-content"
- main:
  - region "Interactive 3D courtroom":
    - img "Three-dimensional Indian courtroom. Drag to look around, scroll to zoom, or use the camera and participant controls."
    - link "dharmaraksha THE VIRTUAL COURTROOM":
      - /url: "#/overview"
    - navigation "Courtroom navigation":
      - link "AI assistant":
        - /url: "#/assistant"
      - link "Case workspace":
        - /url: "#/cases"
      - link "Agent network":
        - /url: "#/agents"
    - button "New investigation"
    - text: IMMERSIVE COURTROOM · 01
    - heading "The courtroom" [level=1]
    - paragraph: Drag to explore · Select a participant
    - strong: Research
    - text: Server connected · 51specialist roles
    - button "Live activity"
    - button "Hide interface"
    - button "Participants"
    - button "Follow speaker"
    - button "Take a tour"
    - button "Enter fullscreen": Fullscreen
    - text: YOUR PERSPECTIVE Drag to orbit · Scroll to zoom
    - button "01 The gallery" [pressed]
    - button "02 Judge’s bench"
    - button "03 Counsel tables"
    - button "04 Entire room"
    - button "Reset courtroom camera"
    - text: AI research simulation · Not a court proceeding
  - alert:
    - heading "Human review required · Risk score7" [level=3]
    - paragraph: The investigation is paused. Review the case before continuing.
    - button "Approve and continue"
    - button "Cancel investigation"
- button "Change language": English · 🎙
```

# Test source

```ts
  21  |   await expect(page.getByRole('heading', { name: 'The courtroom' })).toBeVisible()
  22  |   const bounds = await page.locator('.court-experience').boundingBox()
  23  |   expect(bounds?.height).toBe(1000)
  24  |   expect(bounds?.width).toBe(1440)
  25  |   await expect(page.locator('.court-canvas canvas')).toBeVisible()
  26  |   await expect(page.getByText('Opening the courtroom…', { exact: true })).toBeHidden()
  27  |   await page.getByRole('button', { name: '04 Entire room' }).click()
  28  |   await expect(page.getByRole('button', { name: '04 Entire room' })).toHaveAttribute('aria-pressed', 'true')
  29  |   await page.getByRole('button', { name: 'Reset courtroom camera' }).click()
  30  |   await expect(page.getByRole('button', { name: '01 The gallery' })).toHaveAttribute('aria-pressed', 'true')
  31  |   await page.getByRole('button', { name: 'Participants', exact: true }).click()
  32  |   await page.locator('.participant-list button').first().click()
  33  |   await expect(page.locator('.court-participants')).toContainText('PARTICIPANT PROFILE')
  34  |   await page.getByRole('button', { name: 'Close participants' }).click()
  35  |   await page.getByRole('link', { name: 'AI assistant', exact: true }).click()
  36  |   await expect(page.getByRole('heading', { name: 'Good questions. Clearer answers.' })).toBeVisible()
  37  |   await expect(page.getByRole('link', { name: 'AI assistant AI' })).toHaveAttribute('aria-current', 'page')
  38  |   expect(errors).toEqual([])
  39  | })
  40  | 
  41  | test('assistant submits language and history and renders untrusted output safely', async ({ page }) => {
  42  |   let body: Record<string, unknown> = {}
  43  |   await page.route('**/api/assistant/chat', async route => { body = route.request().postDataJSON(); await route.fulfill({ json: { reply: 'Review this carefully. <img src=x onerror=alert(1)>', language: 'kn-IN' } }) })
  44  |   await page.goto('/#/assistant')
  45  |   await page.getByRole('button', {name:'Change language by voice',exact:true}).click()
  46  |   await page.locator('.language-grid button').filter({hasText:'Kannada'}).click()
  47  |   await page.getByRole('button', { name: 'Understand my rights' }).click()
  48  |   await page.getByRole('button', { name: 'Send question' }).click()
  49  |   await expect(page.locator('.message.assistant')).toContainText('<img src=x onerror=alert(1)>')
  50  |   await expect(page.locator('.message img')).toHaveCount(0)
  51  |   expect(body.language).toBe('kn-IN')
  52  |   await page.getByRole('textbox', { name: 'Your legal question' }).fill('What facts would be useful?')
  53  |   await page.getByRole('button', { name: 'Send question' }).click()
  54  |   await expect(page.locator('.message.assistant')).toHaveCount(2)
  55  |   expect(body.history).toHaveLength(2)
  56  | })
  57  | 
  58  | test('assistant preserves drafts after failure and protects an in-flight request from reset', async ({ page }) => {
  59  |   await page.route('**/api/assistant/chat', async route => { await new Promise(resolve => setTimeout(resolve, 400)); await route.fulfill({ status: 503, json: { error: 'AI provider unavailable. Try again.' } }) })
  60  |   await page.goto('/#/assistant')
  61  |   await page.getByRole('textbox', { name: 'Your legal question' }).fill('Please help me understand a contract.')
  62  |   await page.getByRole('button', { name: 'Send question' }).click()
  63  |   await expect(page.getByRole('button', { name: 'New conversation' })).toBeDisabled()
  64  |   await expect(page.getByRole('alert')).toContainText('AI provider unavailable')
  65  |   await expect(page.getByRole('textbox', { name: 'Your legal question' })).toHaveValue('Please help me understand a contract.')
  66  |   await expect(page.locator('.message')).toHaveCount(0)
  67  | })
  68  | 
  69  | test('document upload extracts real text and carries it into the assistant request', async ({ page }) => {
  70  |   let body: Record<string, unknown> = {}
  71  |   await page.route('**/api/assistant/chat', async route => { body = route.request().postDataJSON(); await route.fulfill({ json: { reply: 'The reference document is available for discussion.' } }) })
  72  |   await page.goto('/#/assistant')
  73  |   await page.locator('input[type=file]').setInputFiles({ name: 'example-contract.txt', mimeType: 'text/plain', buffer: Buffer.from('Example agreement: payment is due in thirty days.') })
  74  |   await expect(page.locator('.attachment-chip')).toContainText('example-contract.txt')
  75  |   await page.getByRole('button', { name: 'Send question' }).click()
  76  |   await expect(page.locator('.message.assistant')).toBeVisible()
  77  |   expect(body.context).toBe('Example agreement: payment is due in thirty days.')
  78  | })
  79  | 
  80  | test('case filters, search, details, and report download work', async ({ page }) => {
  81  |   await page.goto('/#/cases')
  82  |   await page.getByRole('button', { name: 'Completed', exact: true }).click()
  83  |   await expect(page.locator('tbody tr')).toHaveCount(1)
  84  |   await page.getByRole('textbox', { name: 'Search investigations' }).fill('missing')
  85  |   await expect(page.getByRole('heading', { name: 'No matching cases' })).toBeVisible()
  86  |   await page.getByRole('button', { name: 'Clear filters' }).click()
  87  |   await page.getByRole('button', { name: 'Review of a rental agreement CASE' }).click()
  88  |   await expect(page.getByRole('dialog')).toContainText('Research findings')
  89  |   const download = page.waitForEvent('download')
  90  |   await page.getByRole('button', { name: 'Download findings' }).click()
  91  |   expect((await download).suggestedFilename()).toBe('Dharmaraksha-test-cas.txt')
  92  |   await page.keyboard.press('Escape')
  93  |   await expect(page.getByRole('dialog')).not.toBeVisible()
  94  | })
  95  | 
  96  | test('new investigation uses a correlated session and handles live review and completion', async ({ page }) => {
  97  |   await page.addInitScript(() => Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true }))
  98  |   let emit: ((data: string) => void) | undefined
  99  |   await page.routeWebSocket('**/ws', ws => { emit = data => ws.send(data); ws.send(JSON.stringify({ type: 'connected' })) })
  100 |   let sessionId = ''
  101 |   await page.route('**/api/pipeline/start', async route => {
  102 |     sessionId = route.request().postDataJSON().session_id
  103 |     emit?.(JSON.stringify({ type: 'session_start', session_id: sessionId, topic: 'Test legal investigation' }))
  104 |     await route.fulfill({ json: { ok: true, session_id: sessionId } })
  105 |   })
  106 |   await page.route('**/api/pipeline/risk-response', async route => {
  107 |     expect(route.request().postDataJSON().session_id).toBe(sessionId)
  108 |     emit?.(JSON.stringify({ type: 'RISK_GATE', session_id: sessionId, status: 'approved' }))
  109 |     emit?.(JSON.stringify({ type: 'session_complete', session_id: sessionId, verdict: 'Test investigation completed.' }))
  110 |     await route.fulfill({ json: { ok: true } })
  111 |   })
  112 |   await page.goto('/#/overview')
  113 |   await expect(page.locator('.court-session').getByText('Server connected', { exact: false })).toBeVisible()
  114 |   await page.getByRole('button', { name: 'New investigation', exact: true }).click()
  115 |   await page.getByRole('textbox', { name: 'Investigation topic' }).fill('Please review this test legal investigation.')
  116 |   await page.getByRole('button', { name: 'Start investigation' }).click()
  117 |   await expect(page.getByRole('heading', { name: 'The courtroom' })).toBeVisible()
  118 |   emit?.(JSON.stringify({ type: 'session_error', session_id: 'another-session', error: 'Unrelated error' }))
  119 |   await expect(page.getByText('Unrelated error')).toHaveCount(0)
  120 |   emit?.(JSON.stringify({ type: 'RISK_GATE', session_id: sessionId, status: 'paused', risk_score: 7 }))
> 121 |   await expect(page.getByRole('heading', { name: 'Human review required · Risk score 7' })).toBeVisible()
      |                                                                                             ^ Error: expect(locator).toBeVisible() failed
  122 |   await page.getByRole('button', { name: 'Approve and continue' }).click()
  123 |   await expect(page.locator('.findings-panel')).toContainText('Test investigation completed.')
  124 | })
  125 | 
  126 | test('mobile navigation, agent search, and layout fit the viewport', async ({ page }) => {
  127 |   await page.setViewportSize({ width: 390, height: 844 })
  128 |   await page.goto('/#/overview')
  129 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  130 |   await page.getByRole('button', { name: 'Open navigation' }).click()
  131 |   await page.getByRole('link', { name: 'Agent network' }).click()
  132 |   await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false')
  133 |   await page.getByRole('textbox', { name: 'Search agents' }).fill('Tax')
  134 |   await expect(page.locator('.agent-card')).toHaveCount(1)
  135 |   await expect(page.locator('.agent-card')).toContainText('Tax Law Specialist')
  136 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  137 | })
  138 | 
  139 | test('assistant has no serious accessibility issues', async ({ page }) => {
  140 |   await page.goto('/#/assistant')
  141 |   const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  142 |   expect(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([])
  143 | })
  144 | 
  145 | test('PDF uploads use the installed PDF parser successfully', async ({ request }) => {
  146 |   const content = 'BT /F1 16 Tf 40 100 Td (Document upload test.) Tj ET'
  147 |   const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`]
  148 |   let pdf = '%PDF-1.4\n'
  149 |   const offsets = [0]
  150 |   objects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${object}\nendobj\n` })
  151 |   const xref = Buffer.byteLength(pdf)
  152 |   pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  153 |   const response = await request.post('/api/chat/parse-document', { multipart: { file: { name: 'test.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf) } } })
  154 |   expect(response.ok()).toBe(true)
  155 |   expect((await response.json()).text).toContain('Document upload test.')
  156 | })
  157 | 
  158 | test('legacy voice page loads without browser errors', async ({ page }) => {
  159 |   const errors: string[] = []
  160 |   page.on('pageerror', error => errors.push(error.message))
  161 |   await page.goto('/#/nfc-voice')
  162 |   await expect(page.getByText('DHARMARAKSHA', { exact: true }).first()).toBeVisible()
  163 |   expect(errors).toEqual([])
  164 | })
  165 | 
  166 | test('Criminal Law selection opens its profile, survives reload, and introduces the correct agent', async ({ page }) => {
  167 |   await page.addInitScript(() => {
  168 |     Object.defineProperty(window, 'speechSynthesis', { value: { cancel() {}, speak(speech: SpeechSynthesisUtterance) { queueMicrotask(() => speech.onstart?.(new Event('start') as SpeechSynthesisEvent)) } } })
  169 |   })
  170 |   await page.goto('/#/agents')
  171 |   await page.getByRole('button', { name: 'Meet Criminal Law (BNS) in the courtroom' }).click()
  172 |   await expect(page).toHaveURL(/courtroom\?agent=criminal_law_agent/)
  173 |   await expect(page.locator('.court-heading h1')).toHaveText('Criminal Law (BNS)')
  174 |   await expect(page.locator('.court-participants')).toContainText('I am the Criminal Law Specialist.')
  175 |   await page.reload()
  176 |   await expect(page.locator('.court-participants')).toContainText('Criminal Law (BNS)')
  177 |   await page.getByRole('button', { name: 'Play introduction Device voice' }).click()
  178 |   await expect(page.getByRole('button', { name: 'Stop introduction Device voice' })).toBeVisible()
  179 |   await page.getByRole('button', { name: 'Stop introduction Device voice' }).click()
  180 |   await page.getByRole('button', { name: 'Ask this specialist' }).click()
  181 |   await expect(page.getByRole('textbox', { name: 'Your legal question' })).toHaveValue('I would like help from Criminal Law (BNS). ')
  182 | })
  183 | 
  184 | test('clear view hides scene text and allows restoring navigation', async ({ page }) => {
  185 |   await page.goto('/#/courtroom?agent=criminal_law_agent')
  186 |   await page.getByRole('button', { name: 'Hide interface' }).click()
  187 |   await expect(page.locator('.court-heading')).toBeHidden()
  188 |   await expect(page.locator('.court-participants')).toBeHidden()
  189 |   await expect(page.locator('.court-camera-bar')).toBeHidden()
  190 |   await expect(page.locator('.court-canvas canvas')).toBeVisible()
  191 |   await page.getByRole('button', { name: 'Show controls' }).click()
  192 |   await page.getByRole('link', { name: 'Case workspace', exact: true }).click()
  193 |   await expect(page.locator('.case-table')).toBeVisible()
  194 | })
  195 | 
  196 | test('assistant conversation survives voice and document navigation', async ({ page }) => {
  197 |   await page.route('**/api/assistant/chat', route => route.fulfill({ json: { reply: 'Your conversation is still here.' } }))
  198 |   await page.goto('/#/assistant')
  199 |   await page.getByRole('textbox', { name: 'Your legal question' }).fill('Help me understand my rental agreement.')
  200 |   await page.getByRole('button', { name: 'Send question' }).click()
  201 |   await expect(page.locator('.message.assistant')).toBeVisible()
  202 |   await page.getByRole('link', { name: 'Voice & document scan' }).click()
  203 |   await expect(page.getByRole('button', { name: 'Try demo card' })).toBeVisible()
  204 |   await page.getByRole('link', { name: 'Documents', exact: true }).click()
  205 |   await page.getByRole('button', { name: 'Open document assistant' }).click()
  206 |   await expect(page.locator('.message.assistant')).toHaveText(/Your conversation is still here/)
  207 | })
  208 | 
  209 | test('Online introduction is requested only on click and can be stopped', async ({ page }) => {
  210 |   let calls = 0
  211 |   await page.route('**/api/voice/status', route => route.fulfill({ json: { configured: true } }))
  212 |   await page.route('**/api/voice/speak', route => {
  213 |     calls++
  214 |     expect(route.request().postDataJSON().text).toContain('Criminal Law Specialist')
  215 |     return route.fulfill({ contentType: 'audio/wav', body: Buffer.from('test-audio') })
  216 |   })
  217 |   await page.addInitScript(() => { HTMLMediaElement.prototype.play = () => Promise.resolve() })
  218 |   await page.goto('/#/courtroom?agent=criminal_law_agent')
  219 |   const play = page.getByRole('button', { name: 'Play introduction Online voice' })
  220 |   await expect(play).toBeVisible()
  221 |   expect(calls).toBe(0)
```