# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace.spec.ts >> law search clears stale results on failure and can retry with page references
- Location: tests\workspace.spec.ts:310:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByRole('link', { name: 'Test Act · PDF page 3 ↗' })
Expected pattern: /#page=3$/
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" getByRole('link', { name: 'Test Act · PDF page 3 ↗' }) with timeout 15000ms
  - waiting for getByRole('link', { name: 'Test Act · PDF page 3 ↗' })

```

```yaml
- link "Skip to content":
  - /url: "#main-content"
- complementary:
  - link "dharmaraksha CLARITY. BALANCE. JUSTICE.":
    - /url: "#/overview"
  - button "New investigation"
  - text: WORKSPACE
  - navigation "Main navigation":
    - link "Overview":
      - /url: "#/overview"
    - link "AI assistant AI":
      - /url: "#/assistant"
    - link "Case workspace":
      - /url: "#/cases"
    - link "Documents":
      - /url: "#/documents"
    - link "Virtual courtroom 3D":
      - /url: "#/courtroom"
    - link "Agent network":
      - /url: "#/agents"
  - text: ✧
  - strong: Justice, within reach.
  - paragraph: Built for better questions. Designed for informed decisions.
  - button "Meet your AI assistant"
  - link "Voice & document scan":
    - /url: "#/nfc-voice"
  - button "Connected devices"
  - button "Help & getting started"
  - text: DR
  - strong: Dharmaraksha workspace
  - text: Legal research platform
- banner:
  - text: Workspace
  - strong: Documents
  - text: Server connected DR
- main:
  - text: DHARMARAKSHA WORKSPACE
  - heading "Clarity, beyond the fine print." [level=1]
  - paragraph: Bring your documents into the conversation.
  - region "Official law library":
    - text: OFFICIAL LAW LIBRARY
    - heading "Start with the source." [level=2]
    - paragraph: 16 documents · 3,471 searchable passages · Local search is free.
    - paragraph: "Economy mode · One research model · ₹250/day local cap · ₹400total local cap Reserved estimate: ₹16.43. This is not your provider balance."
    - text: Search official laws
    - textbox "Search official laws":
      - /placeholder: Try bail, consumer refunds, or contract consent
      - text: contract
    - button "Search laws"
    - paragraph: Selected verified public-law snapshots and judgments; not exhaustive. Current validity and later treatment require verification. Multilingual semantic and keyword search.
    - article:
      - link "Test Act· PDF page3 ↗":
        - /url: https://example.org/test.pdf#page=3
      - text: Downloaded2026-11-14
      - paragraph: Test passage
  - text: YOUR DOCUMENT, MADE CLEARER
  - heading "From complex clauses to clearer understanding." [level=2]:
    - text: From complex clauses
    - emphasis: to clearer understanding.
  - paragraph: Attach a contract, notice, or agreement in the assistant. Ask for a summary, key obligations, or questions to take to a lawyer.
  - button "Open document assistant"
  - text: PDF, DOCX, TXT, or Markdown · Up to 10 MB HOW IT WORKS
  - article:
    - text: "01"
    - heading "Bring your document" [level=3]
    - paragraph: Upload a readable document through the assistant.
  - article:
    - text: "02"
    - heading "Ask what matters" [level=3]
    - paragraph: Explore terms, obligations, and potential concerns.
  - article:
    - text: "03"
    - heading "Make an informed next step" [level=3]
    - paragraph: Use the findings to prepare for professional legal advice.
  - paragraph: Document text is shared with the configured AI provider when you send a question. Only upload documents you are authorized to share.
- button "Change language": English · 🎙
```

# Test source

```ts
  216 |     return route.fulfill({ contentType: 'audio/wav', body: Buffer.from('test-audio') })
  217 |   })
  218 |   await page.addInitScript(() => { HTMLMediaElement.prototype.play = () => Promise.resolve() })
  219 |   await page.goto('/#/courtroom?agent=criminal_law_agent')
  220 |   const play = page.getByRole('button', { name: 'Play introduction Online voice' })
  221 |   await expect(play).toBeVisible()
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
> 316 |   await page.getByRole('button',{name:'Search laws'}).click()
      |                                                                         ^ Error: expect(locator).toHaveAttribute(expected) failed
  317 |   await expect(page.getByRole('link',{name:'Test Act · PDF page 3 ↗'})).toHaveAttribute('href', /#page=3$/)
  318 |   fail = true
  319 |   await page.getByRole('button',{name:'Search laws'}).click()
  320 |   await expect(page.getByRole('alert')).toContainText('Search temporarily unavailable')
  321 |   await expect(page.getByText('Test passage',{exact:true})).toHaveCount(0)
  322 |   fail = false
  323 |   await page.getByRole('button',{name:'Search laws'}).click()
  324 |   await expect(page.getByText('Test passage',{exact:true})).toBeVisible()
  325 | })
  326 | 
  327 | test('scan page uses configured voice and does not wait for audio to open the camera', async ({page}) => {
  328 |   const spoken: string[] = []
  329 |   await page.route('**/api/voice/speak', async route => {
  330 |     spoken.push(route.request().postDataJSON().language)
  331 |     await new Promise(resolve=>setTimeout(resolve,1500))
  332 |     await route.fulfill({status:503,json:{error:'Speech unavailable'}})
  333 |   })
  334 |   await page.addInitScript(()=>Object.defineProperty(navigator,'mediaDevices',{value:undefined,configurable:true}))
  335 |   await page.goto('/#/nfc-voice')
  336 |   await page.getByRole('button',{name:'Try demo card'}).click()
  337 |   await page.getByRole('button',{name:/English English/}).click()
  338 |   await expect(page.getByText(/Browser camera capture requires HTTPS/)).toBeVisible({timeout:1000})
  339 |   await expect.poll(()=>spoken.includes('en-IN')).toBe(true)
  340 |   await page.getByRole('button',{name:'Reset',exact:true}).click()
  341 |   await expect(page.getByRole('button',{name:'Try demo card'})).toBeVisible()
  342 | })
  343 | 
  344 | test('Telegram events activate courtroom and show specialist work before completion', async ({page}) => {
  345 |   let emit: ((data:string)=>void) | undefined
  346 |   await page.routeWebSocket('**/ws', ws => { emit = data=>ws.send(data) })
  347 |   await page.goto('/#/agents')
  348 |   await expect.poll(()=>!!emit).toBe(true)
  349 |   const send = (event:Record<string,unknown>)=>emit?.(JSON.stringify({session_id:'telegram-audit',...event}))
  350 |   send({type:'session_start',origin:'telegram',topic:'Legal research'})
  351 |   await expect(page).toHaveURL(/courtroom/)
  352 |   send({type:'AGENT_START',agentId:'consumer_law_agent',name:'Consumer Law Specialist',category:'legal'})
  353 |   await page.getByRole('button',{name:/Live activity/}).first().click()
  354 |   await expect(page.locator('.activity-list')).toContainText('Consumer Law Specialist')
  355 |   send({type:'AGENT_COMPLETE',agentId:'consumer_law_agent',name:'Consumer Law Specialist',bubble:'Relevant evidence reviewed.'})
  356 |   send({type:'session_complete',verdict:'Research complete with sources.'})
  357 |   await expect(page.locator('.findings-panel')).toContainText('Research complete with sources.')
  358 | })
  359 | 
```