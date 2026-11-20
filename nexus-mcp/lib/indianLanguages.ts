import fs from 'node:fs';
import path from 'node:path';
export const indianLanguages: Record<string,string> = {
'en-IN':'English','hi-IN':'Hindi','kn-IN':'Kannada','ta-IN':'Tamil','te-IN':'Telugu','ml-IN':'Malayalam','mr-IN':'Marathi','bn-IN':'Bengali','gu-IN':'Gujarati','pa-IN':'Punjabi','od-IN':'Odia','as-IN':'Assamese','ur-IN':'Urdu','ne-IN':'Nepali','kok-IN':'Konkani','ks-IN':'Kashmiri','sd-IN':'Sindhi','sa-IN':'Sanskrit','sat-IN':'Santali','mni-IN':'Manipuri','brx-IN':'Bodo','mai-IN':'Maithili','doi-IN':'Dogri'
};
export function isConversationEnd(text:string, language='en-IN') {
 const normalize=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[.!?,।؟]/g,'').trim();
 const normalized=normalize(text);
 if(['Thank you','End session'].some(key=>normalized===normalize(localizedMessage(language,key))))return true;
 return /^(?:thank you(?: very much)?|thanks(?: a lot)?|thanks goodbye|thank you goodbye|that['’]?s all(?: thank you)?|no more questions|end session|stop session|goodbye|bye|exit|cancel session|ಧನ್ಯವಾದ(?:ಗಳು)?|ಸಾಕು|ಮುಗಿಸಿ|धन्यवाद|शुक्रिया|अलविदा|நன்றி|வணக்கம் விடைபெறுகிறேன்|முடிக்கவும்|ధన్యవాదాలు|നന്ദി|ধন্যবাদ|આભાર|ਧੰਨਵਾਦ|شکریہ)$/u.test(normalized);
}
export const goodbyes:Record<string,string>={
'en-IN':'You’re welcome. This conversation has ended. Start a new conversation whenever you need help.',
'kn-IN':'ಧನ್ಯವಾದಗಳು. ಈ ಸಂಭಾಷಣೆ ಮುಗಿದಿದೆ. ಸಹಾಯ ಬೇಕಾದಾಗ ಹೊಸ ಸಂಭಾಷಣೆಯನ್ನು ಪ್ರಾರಂಭಿಸಿ.',
'hi-IN':'धन्यवाद। यह बातचीत समाप्त हो गई है। सहायता चाहिए तो नई बातचीत शुरू करें।',
 'ta-IN':'நன்றி. இந்த உரையாடல் முடிந்தது. உதவி தேவைப்படும்போது புதிய உரையாடலைத் தொடங்குங்கள்.'
};

const translationCache=new Map<string,{mtime:number;messages:Record<string,string>}>();
export function localizedMessage(language:string,text:string):string {
 if(language==='en-IN'||!Object.prototype.hasOwnProperty.call(indianLanguages,language))return text;
 for(const directory of ['data/translations','kiosk/locales']){
  const file=path.resolve(__dirname,'../..',directory,language+'.json');
  try{const mtime=fs.statSync(file).mtimeMs;let cached=translationCache.get(file);if(!cached||cached.mtime!==mtime){cached={mtime,messages:JSON.parse(fs.readFileSync(file,'utf8'))};translationCache.set(file,cached)}if(cached.messages[text])return cached.messages[text];}catch{/* A missing language pack must not crash a legal request. */}
 }
 return text;
}
export function goodbyeFor(language:string){return goodbyes[language]||localizedMessage(language,goodbyes['en-IN']);}
