import {test,expect} from '@playwright/test'
test('spoken Kannada changes UI and answer language; refresh asks again',async({page})=>{
 await page.routeWebSocket('**/ws',()=>{})
 await page.route('**/api/sessions',r=>r.fulfill({json:[]}))
 await page.route('**/api/voice/speak',r=>r.fulfill({contentType:'audio/wav',body:Buffer.from('audio')}))
 await page.route('**/api/languages/kn-IN',r=>r.fulfill({json:{messages:{'Good questions. Clearer answers.':'ಒಳ್ಳೆಯ ಪ್ರಶ್ನೆಗಳು. ಸ್ಪಷ್ಟ ಉತ್ತರಗಳು.','AI assistant':'ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಸಹಾಯಕ'}}}))
 await page.addInitScript(()=>{
  HTMLMediaElement.prototype.play=function(){queueMicrotask(()=>this.dispatchEvent(new Event('ended')));return Promise.resolve()}
  class Recognition {lang='';continuous=false;interimResults=false;maxAlternatives=1;onstart:(()=>void)|null=null;onend:(()=>void)|null=null;onerror=null;onresult:((e:unknown)=>void)|null=null;start(){this.onstart?.();setTimeout(()=>this.onresult?.({results:[[{transcript:'Kannada'}]]}),100)}abort(){}}
  Object.defineProperty(window,'webkitSpeechRecognition',{value:Recognition})
  Object.defineProperty(window,'SpeechRecognition',{value:Recognition})
 })
 let answerLanguage=''
 await page.route('**/api/assistant/chat',r=>{answerLanguage=r.request().postDataJSON().language;return r.fulfill({json:{reply:'ನಿಮಗೆ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.'}})})
 await page.goto('/#/assistant')
 await expect(page.getByRole('heading',{name:'ಒಳ್ಳೆಯ ಪ್ರಶ್ನೆಗಳು. ಸ್ಪಷ್ಟ ಉತ್ತರಗಳು.'})).toBeVisible()
 await expect(page.locator('html')).toHaveAttribute('lang','kn')
 await expect(page.locator('.language-overlay')).toHaveCount(0)
 await page.getByRole('textbox',{name:'Your legal question'}).fill('What are my rights?')
 await page.getByRole('button',{name:'Send question'}).click()
 await expect.poll(()=>answerLanguage).toBe('kn-IN')
 await page.reload()
 await expect(page.getByRole('heading',{name:'ಒಳ್ಳೆಯ ಪ್ರಶ್ನೆಗಳು. ಸ್ಪಷ್ಟ ಉತ್ತರಗಳು.'})).toBeVisible()
})
test('blocked audio offers language buttons instead of trapping the visitor',async({page})=>{
 await page.route('**/api/voice/speak',r=>r.fulfill({status:503,json:{error:'Unavailable'}}))
 await page.route('**/api/languages/en-IN',r=>r.fulfill({json:{messages:{}}}))
 await page.goto('/#/assistant')
 await expect(page.getByRole('button',{name:'🎙 Start voice setup'})).toBeVisible()
 await page.locator('.language-grid button').filter({hasText:'English'}).click()
 await expect(page.locator('.language-overlay')).toHaveCount(0)
 await expect(page.getByRole('combobox')).toHaveCount(0)
})
