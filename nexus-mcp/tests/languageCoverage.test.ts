import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesResponseLanguage} from '../lib/groundedAssistant';
import {spokenLanguages,speechConfiguration} from '../lib/voiceLanguages';
import {parseVoiceRequest} from '../api/voice';
import {indianLanguages} from '../lib/indianLanguages';
const samples:Record<string,string>={'en-IN':'Please ask your question','hi-IN':'कृपया अपना सवाल पूछें','kn-IN':'ದಯವಿಟ್ಟು ಪ್ರಶ್ನೆ ಕೇಳಿ','ta-IN':'உங்கள் கேள்வியைக் கேளுங்கள்','te-IN':'దయచేసి ప్రశ్న అడగండి','ml-IN':'ദയവായി ചോദ്യം ചോദിക്കുക','mr-IN':'कृपया प्रश्न विचारा','bn-IN':'আপনার প্রশ্ন জিজ্ঞাসা করুন','gu-IN':'તમારો પ્રશ્ન પૂછો','pa-IN':'ਆਪਣਾ ਸਵਾਲ ਪੁੱਛੋ','od-IN':'ଦୟାକରି ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ','as-IN':'আপোনাৰ প্ৰশ্ন সোধক','ur-IN':'اپنا سوال پوچھیں','ne-IN':'कृपया प्रश्न सोध्नुहोस्','kok-IN':'तुमचो प्रस्न विचारात','ks-IN':'سوال','sd-IN':'پنهنجو سوال پڇو','sa-IN':'कृपया प्रश्नं पृच्छतु','sat-IN':'ᱡᱚᱦᱟᱨ','mni-IN':'ꯈꯨꯔꯨꯝꯖꯔꯤ','brx-IN':'सोंलु सों','mai-IN':'अपन प्रश्न पूछू','doi-IN':'अपना सवाल पुच्छो'};
test('all 23 languages have script guards; English cannot pass as an Indic response',()=>{
 assert.equal(Object.keys(samples).length,Object.keys(indianLanguages).length);
 for(const [code,text] of Object.entries(samples)){assert.equal(matchesResponseLanguage(text,code),true,code);if(code!=='en-IN')assert.equal(matchesResponseLanguage('This is an English response.',code),false,code)}
});
test('speech availability agrees with validation and every supported voice is configured',()=>{
 for(const code of Object.keys(indianLanguages)){
  if(spokenLanguages.includes(code)){assert.equal(parseVoiceRequest({text:'test',language:code}).language,code);const c=speechConfiguration(code);assert.ok(c.speaker);assert.ok(c.model)}
  else {assert.throws(()=>parseVoiceRequest({text:'test',language:code}));assert.throws(()=>speechConfiguration(code))}
 }
 assert.equal(spokenLanguages.length,11);
 assert.equal(speechConfiguration('kn-IN').speaker,'chaitra_kn_conversation');
 assert.equal(speechConfiguration('ml-IN').model,'bulbul:v3');
});
