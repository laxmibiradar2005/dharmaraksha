# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace.spec.ts >> Criminal Law selection opens its profile, survives reload, and introduces the correct agent
- Location: tests\workspace.spec.ts:166:1

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.click: Test timeout of 45000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Play introduction Device voice' })
    - locator resolved to <button class="court-text-button">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is inert
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is inert
    - retrying click action
      - waiting 100ms
    72 × waiting for element to be visible, enabled and stable
       - element is inert
     - retrying click action
       - waiting 500ms
    - waiting for element to be visible, enabled and stable

```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - generic [ref=f1e4]:
    - link "Skip to content" [ref=f1e5] [cursor=pointer]:
      - /url: "#main-content"
    - main [ref=f1e7]:
      - region "Interactive 3D courtroom" [ref=f1e8]:
        - img "Three-dimensional Indian courtroom. Drag to look around, scroll to zoom, or use the camera and participant controls." [ref=f1e9]
        - generic [ref=f1e13]:
          - link "dharmaraksha THE VIRTUAL COURTROOM" [ref=f1e14] [cursor=pointer]:
            - /url: "#/overview"
            - generic [ref=f1e19]:
              - text: dharmaraksha
              - generic [ref=f1e20]: THE VIRTUAL COURTROOM
          - navigation "Courtroom navigation" [ref=f1e21]:
            - link "AI assistant" [ref=f1e22] [cursor=pointer]:
              - /url: "#/assistant"
            - link "Case workspace" [ref=f1e25] [cursor=pointer]:
              - /url: "#/cases"
            - link "Agent network" [ref=f1e26] [cursor=pointer]:
              - /url: "#/agents"
          - button "New investigation" [ref=f1e27] [cursor=pointer]
        - generic:
          - generic: IMMERSIVE COURTROOM · 01
          - heading "Criminal Law (BNS)" [level=1]
          - paragraph: Selected specialist · Explore their perspective
        - button "Hide interface" [ref=f1e31] [cursor=pointer]
        - generic [ref=f1e34]:
          - button "Participants" [ref=f1e35] [cursor=pointer]
          - button "Follow speaker" [ref=f1e39] [cursor=pointer]
          - button "Take a tour" [ref=f1e42] [cursor=pointer]
          - button "Enter fullscreen" [ref=f1e45] [cursor=pointer]:
            - generic: Fullscreen
        - complementary "Court participants" [ref=f1e48]:
          - button "Close participants" [ref=f1e49] [cursor=pointer]
          - generic [ref=f1e52]: PARTICIPANT PROFILE
          - heading "Criminal Law (BNS)" [level=2] [ref=f1e53]
          - paragraph [ref=f1e54]: legal
          - generic [ref=f1e55]: Awaiting an investigation
          - paragraph [ref=f1e56]: I am the Criminal Law Specialist. I help organize criminal-law questions, identify relevant facts, and prepare questions about procedures and rights for a qualified lawyer.
          - button "Ask this specialist" [ref=f1e57] [cursor=pointer]
          - button "Play introduction Device voice" [ref=f1e60] [cursor=pointer]:
            - text: Play introduction
            - generic [ref=f1e63]: Device voice
          - button "View all participants →" [ref=f1e64] [cursor=pointer]
        - generic [ref=f1e65]:
          - generic [ref=f1e69]:
            - text: YOUR PERSPECTIVE
            - generic [ref=f1e70]: Drag to orbit · Scroll to zoom
          - generic "Camera views" [ref=f1e71]:
            - button "01 The gallery" [pressed] [ref=f1e72] [cursor=pointer]:
              - generic [ref=f1e73]: "01"
              - text: The gallery
            - button "02 Judge’s bench" [ref=f1e74] [cursor=pointer]:
              - generic [ref=f1e75]: "02"
              - text: Judge’s bench
            - button "03 Counsel tables" [ref=f1e76] [cursor=pointer]:
              - generic [ref=f1e77]: "03"
              - text: Counsel tables
            - button "04 Entire room" [ref=f1e78] [cursor=pointer]:
              - generic [ref=f1e79]: "04"
              - text: Entire room
          - button "Reset courtroom camera" [ref=f1e80] [cursor=pointer]
        - generic [ref=f1e84]: AI research simulation · Not a court proceeding
  - button "Change language" [ref=f1e85] [cursor=pointer]: English · 🎙
  - dialog "Which language do you want to use?" [ref=f1e86]:
    - generic [ref=f1e87]:
      - text: धर्मरक्षा · ಧರ್ಮರಕ್ಷಾ · Dharmaraksha
      - heading "Which language do you want to use?" [level=1] [ref=f1e88]
      - status [ref=f1e89]: Press Start voice setup to enable the greeting and microphone, or choose your language below.
      - button "🎙 Start voice setup" [ref=f1e90] [cursor=pointer]
      - generic [ref=f1e91]:
        - button "English English" [ref=f1e92] [cursor=pointer]:
          - strong [ref=f1e93]: English
          - generic [ref=f1e94]: English
        - button "हिन्दी Hindi" [ref=f1e95] [cursor=pointer]:
          - strong [ref=f1e96]: हिन्दी
          - generic [ref=f1e97]: Hindi
        - button "ಕನ್ನಡ Kannada" [ref=f1e98] [cursor=pointer]:
          - strong [ref=f1e99]: ಕನ್ನಡ
          - generic [ref=f1e100]: Kannada
        - button "தமிழ் Tamil" [ref=f1e101] [cursor=pointer]:
          - strong [ref=f1e102]: தமிழ்
          - generic [ref=f1e103]: Tamil
        - button "తెలుగు Telugu" [ref=f1e104] [cursor=pointer]:
          - strong [ref=f1e105]: తెలుగు
          - generic [ref=f1e106]: Telugu
        - button "മലയാളം Malayalam" [ref=f1e107] [cursor=pointer]:
          - strong [ref=f1e108]: മലയാളം
          - generic [ref=f1e109]: Malayalam
        - button "मराठी Marathi" [ref=f1e110] [cursor=pointer]:
          - strong [ref=f1e111]: मराठी
          - generic [ref=f1e112]: Marathi
        - button "বাংলা Bengali" [ref=f1e113] [cursor=pointer]:
          - strong [ref=f1e114]: বাংলা
          - generic [ref=f1e115]: Bengali
        - button "ગુજરાતી Gujarati" [ref=f1e116] [cursor=pointer]:
          - strong [ref=f1e117]: ગુજરાતી
          - generic [ref=f1e118]: Gujarati
        - button "ਪੰਜਾਬੀ Punjabi" [ref=f1e119] [cursor=pointer]:
          - strong [ref=f1e120]: ਪੰਜਾਬੀ
          - generic [ref=f1e121]: Punjabi
        - button "ଓଡ଼ିଆ Odia" [ref=f1e122] [cursor=pointer]:
          - strong [ref=f1e123]: ଓଡ଼ିଆ
          - generic [ref=f1e124]: Odia
        - button "অসমীয়া Assamese · Text responses" [ref=f1e125] [cursor=pointer]:
          - strong [ref=f1e126]: অসমীয়া
          - generic [ref=f1e127]: Assamese · Text responses
        - button "اردو Urdu · Text responses" [ref=f1e128] [cursor=pointer]:
          - strong [ref=f1e129]: اردو
          - generic [ref=f1e130]: Urdu · Text responses
        - button "नेपाली Nepali · Text responses" [ref=f1e131] [cursor=pointer]:
          - strong [ref=f1e132]: नेपाली
          - generic [ref=f1e133]: Nepali · Text responses
        - button "कोंकणी Konkani · Text responses" [ref=f1e134] [cursor=pointer]:
          - strong [ref=f1e135]: कोंकणी
          - generic [ref=f1e136]: Konkani · Text responses
        - button "کٲشُر Kashmiri · Text responses" [ref=f1e137] [cursor=pointer]:
          - strong [ref=f1e138]: کٲشُر
          - generic [ref=f1e139]: Kashmiri · Text responses
        - button "سنڌي Sindhi · Text responses" [ref=f1e140] [cursor=pointer]:
          - strong [ref=f1e141]: سنڌي
          - generic [ref=f1e142]: Sindhi · Text responses
        - button "संस्कृतम् Sanskrit · Text responses" [ref=f1e143] [cursor=pointer]:
          - strong [ref=f1e144]: संस्कृतम्
          - generic [ref=f1e145]: Sanskrit · Text responses
        - button "ᱥᱟᱱᱛᱟᱲᱤ Santali · Text responses" [ref=f1e146] [cursor=pointer]:
          - strong [ref=f1e147]: ᱥᱟᱱᱛᱟᱲᱤ
          - generic [ref=f1e148]: Santali · Text responses
        - button "ꯃꯤꯇꯩꯂꯣꯟ Manipuri · Text responses" [ref=f1e149] [cursor=pointer]:
          - strong [ref=f1e150]: ꯃꯤꯇꯩꯂꯣꯟ
          - generic [ref=f1e151]: Manipuri · Text responses
        - button "बड़ो Bodo · Text responses" [ref=f1e152] [cursor=pointer]:
          - strong [ref=f1e153]: बड़ो
          - generic [ref=f1e154]: Bodo · Text responses
        - button "मैथिली Maithili · Text responses" [ref=f1e155] [cursor=pointer]:
          - strong [ref=f1e156]: मैथिली
          - generic [ref=f1e157]: Maithili · Text responses
        - button "डोगरी Dogri · Text responses" [ref=f1e158] [cursor=pointer]:
          - strong [ref=f1e159]: डोगरी
          - generic [ref=f1e160]: Dogri · Text responses
      - paragraph [ref=f1e161]: Voice-first setup. Buttons remain available if the microphone is blocked. Translations are AI-assisted; legal documents keep their original wording. Regional language and dialect accuracy varies.
```

# Test source

```ts
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
  121 |   await expect(page.getByRole('heading', { name: 'Human review required · Risk score 7' })).toBeVisible()
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
> 177 |   await page.getByRole('button', { name: 'Play introduction Device voice' }).click()
      |                                                                              ^ Error: locator.click: Test timeout of 45000ms exceeded.
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
  222 |   await play.click()
  223 |   await expect.poll(() => calls).toBe(1)
  224 |   await page.getByRole('button', { name: 'Stop introduction Online voice' }).click()
  225 |   await expect(play).toBeVisible()
  226 | })
  227 | 
  228 | test('fullscreen hides overlays and restores usable navigation', async ({ page }) => {
  229 |   await page.goto('/#/courtroom')
  230 |   await page.getByRole('button', { name: 'Enter fullscreen' }).click()
  231 |   await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
  232 |   await expect(page.locator('.court-heading')).toBeHidden()
  233 |   await page.getByRole('button', { name: 'Show controls' }).click()
  234 |   await page.getByRole('button', { name: 'Exit fullscreen' }).click()
  235 |   await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false)
  236 |   await expect(page.locator('.court-header')).toBeVisible()
  237 |   await page.getByRole('button', { name: 'Hide interface' }).click()
  238 |   await page.goto('/#/courtroom?agent=criminal_law_agent')
  239 |   await expect(page.locator('.court-participants')).toBeVisible()
  240 | })
  241 | 
  242 | test('photo capture requires review and supports retake before sending', async ({ page }) => {
  243 |   const base = process.env.PLAYWRIGHT_BASE_URL
  244 |   test.skip(!!base && new URL(base).protocol === 'http:' && !['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Physical LAN HTTP cannot expose browser getUserMedia; tested separately as unavailable.')
  245 |   let uploads = 0
  246 |   await page.routeWebSocket('**/ws', () => {})
  247 |   await page.route('**/api/document-vision', route => {
  248 |     uploads++
  249 |     expect(route.request().postDataJSON().image_base64.length).toBeGreaterThan(20)
  250 |     return route.fulfill({ json: { sessionId: 'test-case-1', extractedText: 'Example document' } })
  251 |   })
  252 |   await page.addInitScript(() => {
  253 |     Object.defineProperty(window, 'speechSynthesis', { value: { cancel() {}, getVoices() { return [] }, speak(speech: SpeechSynthesisUtterance) { queueMicrotask(() => speech.onend?.(new Event('end') as SpeechSynthesisEvent)) } } })
  254 |     navigator.mediaDevices.getUserMedia = async () => {
  255 |       const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480
  256 |       const ctx = canvas.getContext('2d')!
  257 |       const timer = setInterval(() => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 640, 480); ctx.fillStyle = '#000'; ctx.fillText('Test document', 40, 40) }, 30)
  258 |       const stream = canvas.captureStream(30)
  259 |       stream.getTracks().forEach(track => track.addEventListener('ended', () => clearInterval(timer)))
  260 |       return stream
  261 |     }
  262 |   })
  263 |   await page.goto('/#/nfc-voice')
  264 |   await page.getByRole('button', { name: 'Try demo card' }).click()
  265 |   await page.getByRole('button', { name: /English English/ }).click()
  266 |   await page.waitForFunction(() => (document.querySelector('video')?.readyState ?? 0) >= 2)
  267 |   await page.getByRole('button', { name: 'Capture photo' }).click()
  268 |   await expect(page.getByRole('img', { name: 'Captured document preview' })).toBeVisible()
  269 |   expect(uploads).toBe(0)
  270 |   await page.getByRole('button', { name: 'Retake', exact: true }).click()
  271 |   await page.waitForFunction(() => (document.querySelector('video')?.readyState ?? 0) >= 2)
  272 |   await page.getByRole('button', { name: 'Capture photo' }).click()
  273 |   expect(uploads).toBe(0)
  274 |   await page.getByRole('button', { name: 'Use photo', exact: true }).click()
  275 |   await expect.poll(() => uploads).toBe(1)
  276 | })
  277 | 
```