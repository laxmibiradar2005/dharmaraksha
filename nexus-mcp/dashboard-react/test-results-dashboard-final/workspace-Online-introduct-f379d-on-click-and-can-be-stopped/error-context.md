# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace.spec.ts >> Online introduction is requested only on click and can be stopped
- Location: tests\workspace.spec.ts:210:1

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "Criminal Law Specialist"
Received string:    "Namaste. Which language do you want to use? Please say the name of your language after this greeting."
```

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Play introduction Online voice' })
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('button', { name: 'Play introduction Online voice' }) with timeout 15000ms
  - waiting for getByRole('button', { name: 'Play introduction Online voice' })
    - found getByRole('heading', { name: 'Which language do you want to use?' }), intercepting action to run the handler
    - locator handler has finished, waiting for getByRole('heading', { name: 'Which language do you want to use?' }) to be hidden
    - interception handler has finished, continuing
  - Test ended.

```

```yaml
- link "Skip to content":
  - /url: "#main-content"
- main: Preparing the courtroom…
- button "Change language": English · 🎙
```

# Test source

```ts
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
  176 |   await page.locator('.language-grid button').filter({hasText:'English'}).click()
  177 |   await expect(page.locator('.court-participants')).toContainText('Criminal Law (BNS)')
  178 |   await page.getByRole('button', { name: 'Play introduction Device voice' }).click()
  179 |   await expect(page.getByRole('button', { name: 'Stop introduction Device voice' })).toBeVisible()
  180 |   await page.getByRole('button', { name: 'Stop introduction Device voice' }).click()
  181 |   await page.getByRole('button', { name: 'Ask this specialist' }).click()
  182 |   await expect(page.getByRole('textbox', { name: 'Your legal question' })).toHaveValue('I would like help from Criminal Law (BNS). ')
  183 | })
  184 | 
  185 | test('clear view hides scene text and allows restoring navigation', async ({ page }) => {
  186 |   await page.goto('/#/courtroom?agent=criminal_law_agent')
  187 |   await page.getByRole('button', { name: 'Hide interface' }).click()
  188 |   await expect(page.locator('.court-heading')).toBeHidden()
  189 |   await expect(page.locator('.court-participants')).toBeHidden()
  190 |   await expect(page.locator('.court-camera-bar')).toBeHidden()
  191 |   await expect(page.locator('.court-canvas canvas')).toBeVisible()
  192 |   await page.getByRole('button', { name: 'Show controls' }).click()
  193 |   await page.getByRole('link', { name: 'Case workspace', exact: true }).click()
  194 |   await expect(page.locator('.case-table')).toBeVisible()
  195 | })
  196 | 
  197 | test('assistant conversation survives voice and document navigation', async ({ page }) => {
  198 |   await page.route('**/api/assistant/chat', route => route.fulfill({ json: { reply: 'Your conversation is still here.' } }))
  199 |   await page.goto('/#/assistant')
  200 |   await page.getByRole('textbox', { name: 'Your legal question' }).fill('Help me understand my rental agreement.')
  201 |   await page.getByRole('button', { name: 'Send question' }).click()
  202 |   await expect(page.locator('.message.assistant')).toBeVisible()
  203 |   await page.getByRole('link', { name: 'Voice & document scan' }).click()
  204 |   await expect(page.getByRole('button', { name: 'Try demo card' })).toBeVisible()
  205 |   await page.getByRole('link', { name: 'Documents', exact: true }).click()
  206 |   await page.getByRole('button', { name: 'Open document assistant' }).click()
  207 |   await expect(page.locator('.message.assistant')).toHaveText(/Your conversation is still here/)
  208 | })
  209 | 
  210 | test('Online introduction is requested only on click and can be stopped', async ({ page }) => {
  211 |   let calls = 0
  212 |   await page.route('**/api/voice/status', route => route.fulfill({ json: { configured: true } }))
  213 |   await page.route('**/api/voice/speak', route => {
  214 |     calls++
  215 |     expect(route.request().postDataJSON().text).toContain('Criminal Law Specialist')
  216 |     return route.fulfill({ contentType: 'audio/wav', body: Buffer.from('test-audio') })
  217 |   })
  218 |   await page.addInitScript(() => { HTMLMediaElement.prototype.play = () => Promise.resolve() })
  219 |   await page.goto('/#/courtroom?agent=criminal_law_agent')
  220 |   const play = page.getByRole('button', { name: 'Play introduction Online voice' })
> 221 |   await expect(play).toBeVisible()
      |                      ^ Error: expect(locator).toBeVisible() failed
  222 |   expect(calls).toBe(0)
  223 |   await play.click()
  224 |   await expect.poll(() => calls).toBe(1)
  225 |   await page.getByRole('button', { name: 'Stop introduction Online voice' }).click()
  226 |   await expect(play).toBeVisible()
  227 | })
  228 | 
  229 | test('fullscreen hides overlays and restores usable navigation', async ({ page }) => {
  230 |   await page.goto('/#/courtroom')
  231 |   await page.getByRole('button', { name: 'Enter fullscreen' }).click()
  232 |   await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
  233 |   await expect(page.locator('.court-heading')).toBeHidden()
  234 |   await page.getByRole('button', { name: 'Show controls' }).click()
  235 |   await page.getByRole('button', { name: 'Exit fullscreen' }).click()
  236 |   await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false)
  237 |   await expect(page.locator('.court-header')).toBeVisible()
  238 |   await page.getByRole('button', { name: 'Hide interface' }).click()
  239 |   await page.goto('/#/courtroom?agent=criminal_law_agent')
  240 |   await expect(page.locator('.court-participants')).toBeVisible()
  241 | })
  242 | 
  243 | test('photo capture requires review and supports retake before sending', async ({ page }) => {
  244 |   const base = process.env.PLAYWRIGHT_BASE_URL
  245 |   test.skip(!!base && new URL(base).protocol === 'http:' && !['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Physical LAN HTTP cannot expose browser getUserMedia; tested separately as unavailable.')
  246 |   let uploads = 0
  247 |   await page.routeWebSocket('**/ws', () => {})
  248 |   await page.route('**/api/document-vision', route => {
  249 |     uploads++
  250 |     expect(route.request().postDataJSON().image_base64.length).toBeGreaterThan(20)
  251 |     return route.fulfill({ json: { sessionId: 'test-case-1', extractedText: 'Example document' } })
  252 |   })
  253 |   await page.addInitScript(() => {
  254 |     Object.defineProperty(window, 'speechSynthesis', { value: { cancel() {}, getVoices() { return [] }, speak(speech: SpeechSynthesisUtterance) { queueMicrotask(() => speech.onend?.(new Event('end') as SpeechSynthesisEvent)) } } })
  255 |     navigator.mediaDevices.getUserMedia = async () => {
  256 |       const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480
  257 |       const ctx = canvas.getContext('2d')!
  258 |       const timer = setInterval(() => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 640, 480); ctx.fillStyle = '#000'; ctx.fillText('Test document', 40, 40) }, 30)
  259 |       const stream = canvas.captureStream(30)
  260 |       stream.getTracks().forEach(track => track.addEventListener('ended', () => clearInterval(timer)))
  261 |       return stream
  262 |     }
  263 |   })
  264 |   await page.goto('/#/nfc-voice')
  265 |   await page.getByRole('button', { name: 'Try demo card' }).click()
  266 |   await page.getByRole('button', { name: /English English/ }).click()
  267 |   await page.waitForFunction(() => (document.querySelector('video')?.readyState ?? 0) >= 2)
  268 |   await page.getByRole('button', { name: 'Capture photo' }).click()
  269 |   await expect(page.getByRole('img', { name: 'Captured document preview' })).toBeVisible()
  270 |   expect(uploads).toBe(0)
  271 |   await page.getByRole('button', { name: 'Retake', exact: true }).click()
  272 |   await page.waitForFunction(() => (document.querySelector('video')?.readyState ?? 0) >= 2)
  273 |   await page.getByRole('button', { name: 'Capture photo' }).click()
  274 |   expect(uploads).toBe(0)
  275 |   await page.getByRole('button', { name: 'Use photo', exact: true }).click()
  276 |   await expect.poll(() => uploads).toBe(1)
  277 | })
  278 | 
  279 | test('unavailable browser camera gives actionable guidance without uploading', async ({ page }) => {
  280 |   await page.addInitScript(() => Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true }))
  281 |   await page.goto('/#/nfc-voice')
  282 |   await page.getByRole('button', { name: 'Try demo card' }).click()
  283 |   await page.getByRole('button', { name: /English English/ }).click()
  284 |   await expect(page.getByText(/Browser camera capture requires HTTPS/)).toBeVisible()
  285 | })
  286 | 
  287 | 
  288 | for (const route of ['overview','assistant','cases','documents','courtroom','agents','sensors','nfc-voice']) {
  289 |   test(`page audit: ${route} renders without errors or horizontal overflow`, async ({page}, testInfo) => {
  290 |     const errors: string[] = []
  291 |     page.on('pageerror', error => errors.push(error.message))
  292 |     await page.goto(`/#/${route}`)
  293 |     await expect(page.locator('main')).toBeVisible()
  294 |     await expect(page.locator('.loading-panel')).toHaveCount(0)
  295 |     await expect(page.locator('main h1, .court-heading h1').first()).toBeAttached()
  296 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  297 |     await page.screenshot({path:testInfo.outputPath(`${route}.png`)})
  298 |     expect(errors).toEqual([])
  299 |   })
  300 | }
  301 | 
  302 | test('language preference survives page navigation', async ({page}) => {
  303 |   await page.goto('/#/assistant')
  304 |   await page.getByRole('button',{name:'Change language by voice',exact:true}).click()
  305 |   await page.locator('.language-grid button').filter({hasText:'Hindi'}).click()
  306 |   await page.getByRole('link', {name:'Documents', exact:true}).click()
  307 |   await page.getByRole('button', {name:'Open document assistant'}).click()
  308 |   await expect(page.locator('.language-launch')).toContainText('हिन्दी')
  309 | })
  310 | 
  311 | test('law search clears stale results on failure and can retry with page references', async ({page}) => {
  312 |   let fail = false
  313 |   await page.route('**/api/rag/search?*', route => fail ? route.fulfill({status:503,json:{error:'Search temporarily unavailable'}}) : route.fulfill({json:{sources:[{id:'s1',title:'Test Act',text:'Test passage',page:3,url:'https://example.org/test.pdf#page=3',retrievedAt:'2026-11-14'}]}}))
  314 |   await page.goto('/#/documents')
  315 |   await page.getByRole('textbox',{name:'Search official laws'}).fill('contract')
  316 |   await page.getByRole('button',{name:'Search laws'}).click()
  317 |   await expect(page.getByRole('link',{name:'Test Act · PDF page 3 ↗'})).toHaveAttribute('href', /#page=3$/)
  318 |   fail = true
  319 |   await page.getByRole('button',{name:'Search laws'}).click()
  320 |   await expect(page.getByRole('alert')).toContainText('Search temporarily unavailable')
  321 |   await expect(page.getByText('Test passage',{exact:true})).toHaveCount(0)
```