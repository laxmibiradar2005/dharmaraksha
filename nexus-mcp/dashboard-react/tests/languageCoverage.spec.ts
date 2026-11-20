import {test,expect} from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
const languages=JSON.parse(fs.readFileSync('src/locales/languages.json','utf8')) as Array<{code:string;name:string;voice:boolean}>
const root=path.resolve('..')
for(const lang of languages){
 test(`kiosk ${lang.name}: voice selection, native controls, page templates and ending`,async({page})=>{
  const dictionary=lang.code==='en-IN'?{}:JSON.parse(fs.readFileSync(path.join(root,'kiosk/locales',lang.code+'.json'),'utf8')) as Record<string,string>
  const tr=(s:string)=>dictionary[s]||s
  const commands=[lang.name,tr('Continue as guest'),tr('Scan documents')]
  const speech:string[]=[]
  await page.setViewportSize({width:1024,height:768})
  await page.route('**/api/kiosk/**',async route=>{
   const url=route.request().url()
   if(url.includes('/language/'))return route.fulfill({json:dictionary})
   if(url.endsWith('/status'))return route.fulfill({json:{camera:true,reader:{connected:true}}})
   if(url.endsWith('/session'))return route.fulfill({json:{token:'test'}})
   if(url.endsWith('/speak')){speech.push(route.request().postDataJSON().language);return route.fulfill({json:{played:true}})}
   if(url.endsWith('/listen')){await new Promise(r=>setTimeout(r,100));return route.fulfill({json:{text:commands.shift()||''}})}
   if(url.endsWith('/frame'))return route.fulfill({json:{ready:false,issues:[]}})
   if(url.includes('/preview'))return route.abort()
   return route.fulfill({json:{}})
  })
  await page.goto('/kiosk/')
  await expect(page.locator('html')).toHaveAttribute('lang',lang.code.split('-')[0])
  await expect(page.locator('#capture-page')).toBeEnabled()
  await expect(page.locator('.kiosk-stage>.eyebrow')).toHaveText(tr('PAGE {page} · MANUAL DOCUMENT SCANNER').replace('{page}','1'))
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  expect(speech.includes(lang.code)).toBe(lang.voice)
  // Check the same native end command outside the scanner's manual capture wait.
  await page.evaluate(()=>{window.eval("step='chat';render();queueTouch(tr('Thank you'))")})
  await expect(page.locator('#screen')).toHaveAttribute('data-step','ended')
  if(['ur-IN','sat-IN','mni-IN','kn-IN'].includes(lang.code))await page.screenshot({path:`test-results-coverage/${lang.code}.png`,fullPage:true})
 })
 test(`dashboard ${lang.name}: native headings, direction and question language`,async({page})=>{
  const dictionary=lang.code==='en-IN'?{}:JSON.parse(fs.readFileSync(path.join(root,'kiosk/locales',lang.code+'.json'),'utf8')) as Record<string,string>
  const tr=(s:string)=>dictionary[s]||s
  await page.routeWebSocket('**/ws',()=>{})
  await page.route('**/api/sessions',r=>r.fulfill({json:[]}))
  await page.route('**/api/voice/speak',r=>r.fulfill({status:503,json:{error:'Test silent setup'}}))
  await page.route('**/api/languages/*',r=>r.fulfill({json:{messages:dictionary}}))
  let requested=''
  await page.route('**/api/assistant/chat',r=>{requested=r.request().postDataJSON().language;return r.fulfill({json:{reply:tr('Please ask your question.')}})})
  await page.goto('/dashboard/#/assistant')
  await page.locator('.language-grid button').filter({hasText:lang.name}).first().click()
  await expect(page.getByRole('heading',{name:tr('Good questions. Clearer answers.')})).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('dir',['ur-IN','ks-IN','sd-IN'].includes(lang.code)?'rtl':'ltr')
  await page.locator('textarea').fill(tr('Please ask your question.'))
  await page.getByRole('button',{name:tr('Send question'),exact:true}).click()
  await expect.poll(()=>requested).toBe(lang.code)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 })
}
