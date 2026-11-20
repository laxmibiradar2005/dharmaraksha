import { test, expect } from '@playwright/test'

const image='AA=='
async function mock(page: import('@playwright/test').Page, commands:string[], quality=true){
 let captures=0,reads=0; const spoken:string[]=[], languages:string[]=[]
 await page.route('**/api/kiosk/language/*',r=>r.fulfill({json:{}}))
 await page.route('**/api/kiosk/status',r=>r.fulfill({json:{camera:true}}))
 await page.route('**/api/kiosk/session',r=>r.fulfill({json:{token:'test'}}))
 await page.route('**/api/kiosk/speak',r=>{spoken.push(r.request().postDataJSON().text);languages.push(r.request().postDataJSON().language);return r.fulfill({json:{played:true}})})
 await page.route('**/api/kiosk/listen',async r=>{await new Promise(resolve=>setTimeout(resolve,80));return r.fulfill({json:{text:commands.shift()||''}})})
 await page.route('**/api/kiosk/preview?*',r=>r.abort())
 await page.route('**/api/kiosk/frame',r=>r.fulfill({json:{ready:quality,preview:image,issues:[quality?'Ready':'The text is blurry. Hold still.'],fingerprint:Buffer.alloc(1024,50+captures*80).toString('base64')}}))
 await page.route('**/api/kiosk/capture',r=>{const fingerprint=Buffer.alloc(1024,50+captures*80).toString('base64');captures++;return r.fulfill({json:{ready:true,image,fingerprint}})})
 await page.route('**/api/kiosk/read-document',r=>{reads++;return r.fulfill({json:{text:'Text from page '+reads}})})
 await page.route('**/api/assistant/chat',r=>{expect(r.request().postDataJSON().context).toContain('[Page 2]');return r.fulfill({json:{reply:'Keep your original documents.',sources:[]}})})
 return {captures:()=>captures,reads:()=>reads,spoken,languages}
}

test('manual two-page capture never takes a photo without a click',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 const m=await mock(page,['start as guest','scan documents','next page','finished scanning','yes analyze','What should I keep?','end session'])
 await page.goto('/kiosk/')
 const capture=page.getByRole('button',{name:'Capture this page'})
 await expect(capture).toBeEnabled()
 await page.waitForTimeout(1800)
 expect(m.captures()).toBe(0)
 await capture.click()
 await expect(capture).toBeEnabled()
 await capture.click()
 await expect.poll(m.reads).toBe(2)
 await expect(page.getByText('Session ended',{exact:true})).toBeVisible()
 expect(m.captures()).toBe(2)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

for(const [name,code,script] of [['Hindi','hi-IN',/[\u0900-\u097f]/],['Kannada','kn-IN',/[\u0c80-\u0cff]/],['Tamil','ta-IN',/[\u0b80-\u0bff]/]] as const) test(`selected ${name} speaks translated instructions`,async({page})=>{
 const m=await mock(page,[name,'scan documents'])
 await page.goto('/kiosk/')
 await expect.poll(()=>m.languages.includes(code)).toBe(true)
 expect(m.spoken.some(s=>script.test(s))).toBe(true)
 expect(m.captures()).toBe(0)
})

test('blurry page never triggers capture or paid OCR',async({page})=>{
 const m=await mock(page,['start as guest','scan documents'],false)
 await page.goto('/kiosk/')
 await expect(page.getByText('The text is blurry. Hold still.',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Pause microphone'}).click()
 expect(m.captures()).toBe(0);expect(m.reads()).toBe(0)
})

test('occupied kiosk does not speak or record from another phone',async({page})=>{
 const m=await mock(page,[])
 await page.route('**/api/kiosk/session',r=>r.fulfill({status:409,json:{error:'Another phone is controlling this kiosk.'}}))
 await page.goto('/kiosk/')
 await expect(page.getByRole('alert')).toContainText('Another phone')
 expect(m.spoken).toHaveLength(0)
})


test('manual retake replaces the last page and denied consent never runs OCR',async({page})=>{
 const m=await mock(page,['start as guest','scan documents','retake','finished scanning','no','end session'])
 await page.goto('/kiosk/')
 const capture=page.getByRole('button',{name:'Capture this page'})
 await expect(capture).toBeEnabled();await capture.click()
 await expect(capture).toBeEnabled();await capture.click()
 await expect(page.getByText('Session ended',{exact:true})).toBeVisible()
 expect(m.captures()).toBe(2);expect(m.reads()).toBe(0)
 expect(m.spoken.filter(s=>s.includes('Page 1 captured'))).toHaveLength(2)
 await expect(page.getByLabel('Captured pages')).toHaveCount(0)
})


test('spoken question answers directly without another confirmation recording',async({page})=>{
 const m=await mock(page,['start as guest','ask a question','What should I keep?','end session'])
 let payload: {voice?: boolean} = {}
 await page.route('**/api/assistant/chat',r=>{payload=r.request().postDataJSON();return r.fulfill({json:{reply:'Keep the receipt. [S1]',sources:[]}})})
 await page.goto('/kiosk/')
 await expect(page.getByText('Session ended',{exact:true})).toBeVisible()
 expect(payload.voice).toBe(true)
 expect(m.spoken.some(s=>s.includes('Is that correct'))).toBe(false)
 expect(m.spoken).toContain('Keep the receipt.')
})

test('speaker failure falls back to phone audio and exposes Chrome play control',async({page})=>{
 await mock(page,[])
 await page.addInitScript(()=>{window.Audio=class extends EventTarget {
  onended: (()=>void)|null=null;onerror: (()=>void)|null=null;attempts=0;
  pause(){} play(){if(++this.attempts===1)return Promise.reject(new DOMException('Gesture required','NotAllowedError'));setTimeout(()=>this.onended?.(),10);return Promise.resolve();}
 } as unknown as typeof Audio;})
 await page.route('**/api/kiosk/speak',r=>r.fulfill({status:503,json:{error:'Speaker unavailable'}}))
 await page.route('**/api/voice/speak',r=>r.fulfill({contentType:'audio/wav',body:Buffer.from('test audio')}))
 await page.goto('/kiosk/')
 const play=page.getByRole('button',{name:'Play answer on this phone'})
 await expect(play).toBeVisible()
 await expect(page.locator('#audio-output')).toHaveValue('phone')
 await play.click()
 await expect(play).not.toBeVisible()
 await expect(page.locator('.error')).toHaveCount(0)
})

test('Continue as guest interrupts blocked phone playback',async({page})=>{
 await mock(page,[])
 await page.addInitScript(()=>{sessionStorage.setItem('kiosk-phone-audio','true');window.Audio=class extends EventTarget {
  onended: (()=>void)|null=null;onerror: (()=>void)|null=null;
  constructor(){super();this.addEventListener('ended',()=>this.onended?.());}
  pause(){} play(){return Promise.reject(new DOMException('Gesture required','NotAllowedError'));}
 } as unknown as typeof Audio;})
 await page.route('**/api/voice/speak',r=>r.fulfill({contentType:'audio/wav',body:Buffer.from('test audio')}))
 await page.route('**/api/kiosk/stop-voice',r=>r.fulfill({json:{stopped:true}}))
 await page.goto('/kiosk/')
 await expect(page.getByRole('button',{name:'Play answer on this phone'})).toBeVisible()
 await page.getByRole('button',{name:'Continue as guest'}).click()
 await expect(page.getByRole('button',{name:'Scan documents'})).toBeVisible({timeout:3000})
})

test('scanner checks clarity while spoken instructions are still pending',async({page})=>{
 await mock(page,['start as guest','scan documents'])
 let release: (()=>void)|undefined
 await page.route('**/api/kiosk/speak',async r=>{if(r.request().postDataJSON().text.includes('Please place page'))await new Promise<void>(resolve=>{release=resolve});await r.fulfill({json:{played:true}}).catch(()=>{})})
 await page.goto('/kiosk/')
 await expect(page.getByRole('button',{name:'Capture this page'})).toBeEnabled({timeout:3000})
 release?.()
})

test('recognized card opens PIN entry and resumes spoken guidance after verification',async({page})=>{
 const m=await mock(page,[])
 await page.route('**/api/kiosk/stop-voice',r=>r.fulfill({json:{stopped:true}}))
 await page.route('**/api/kiosk/status',r=>r.fulfill({json:{camera:true,reader:{connected:true,event:{sequence:41,recognized:true,cardSuffix:'1234'}}}}))
 await page.route('**/api/kiosk/unlock',r=>{expect(r.request().postDataJSON()).toEqual({pin:'1234',sequence:41});return r.fulfill({json:{authenticated:true,privateCases:false}})})
 await page.goto('/kiosk/')
 await expect(page.locator('#card-pin')).toBeVisible()
 await page.locator('#card-pin').fill('1234')
 await page.getByRole('button',{name:'Unlock this card'}).click()
 await expect(page.getByRole('button',{name:'Scan documents'})).toBeVisible()
 await expect(page.getByText(/Card verified/)).toBeVisible()
 await expect.poll(()=>m.spoken.some(text=>text==='Welcome. Say scan documents, or ask a question.')).toBe(true)
})

test('low contrast is advisory and manual capture remains available',async({page})=>{
 const m=await mock(page,['start as guest','scan documents'],false)
 await page.goto('/kiosk/')
 const capture=page.getByRole('button',{name:'Capture this page'})
 await expect(capture).toBeEnabled()
 await capture.click()
 await expect.poll(m.captures).toBe(1)
 await expect(page.getByText('PAGE 1 CAPTURED',{exact:true})).toBeVisible()
 expect(m.reads()).toBe(0)
})


test('thank you ends once without replaying an answer or restarting the microphone',async({page})=>{
 const m=await mock(page,['start as guest','ask a question','What is in my document?','thank you','repeat'])
 let answers=0
 await page.route('**/api/assistant/chat',r=>{answers++;return r.fulfill({json:{reply:'Keep the original receipt.',sources:[]}})})
 await page.goto('/kiosk/')
 await expect(page.getByText('Session ended',{exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Start a new session'})).toBeVisible()
 await page.waitForTimeout(800)
 expect(answers).toBe(1)
 expect(m.spoken.filter(text=>text.includes('Keep the original receipt'))).toHaveLength(1)
 expect(m.spoken.filter(text=>text.includes('session is finished'))).toHaveLength(1)
})

test('tablet kiosk switches visible text by voice and keeps controls within the screen',async({page})=>{
 await page.setViewportSize({width:1280,height:800})
 await mock(page,['Kannada'])
 await page.route('**/api/kiosk/language/kn-IN',r=>r.fulfill({json:{'Your rights.':'ನಿಮ್ಮ ಹಕ್ಕುಗಳು.','Continue as guest →':'ಅತಿಥಿಯಾಗಿ ಮುಂದುವರಿಸಿ →','A clearer path.':'ಸ್ಪಷ್ಟವಾದ ದಾರಿ.'}}))
 await page.goto('/kiosk/')
 await expect(page.locator('html')).toHaveAttribute('lang','kn')
 await expect(page.getByRole('button',{name:'ಅತಿಥಿಯಾಗಿ ಮುಂದುವರಿಸಿ'})).toBeVisible()
 await expect(page.getByText('ನಿಮ್ಮ ಹಕ್ಕುಗಳು.')).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:'test-results-kiosk-tablet/tablet-kannada.png',fullPage:true})
})
