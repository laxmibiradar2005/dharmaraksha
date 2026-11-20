require('dotenv').config({quiet:true});
const fs=require('fs');const {languageMessages}=require('../dist/api/languages');
const languages=require('../dashboard-react/src/locales/languages.json');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{fs.mkdirSync('kiosk/locales',{recursive:true});for(const lang of languages.filter(l=>l.code!=='en-IN')){let ready=false;for(let retry=0;retry<5&&!ready;retry++){try{const messages=await languageMessages(lang.code);fs.writeFileSync(`kiosk/locales/${lang.code}.json`,JSON.stringify(messages));console.log(`${lang.code}: ${Object.keys(messages).length} labels ready`);ready=true;}catch(e){console.log(`${lang.code}: retry ${retry+1}: ${e.message}`);await sleep(15000)}}if(!ready)console.log(`${lang.code}: INCOMPLETE`);await sleep(6100)}console.log('Translation generation finished')})().catch(e=>{console.error(e.message);process.exitCode=1});
