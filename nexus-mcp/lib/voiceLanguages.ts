export const spokenLanguages = ['en-IN','hi-IN','kn-IN','ta-IN','te-IN','bn-IN','gu-IN','mr-IN','pa-IN','ml-IN','od-IN'];
export function speechConfiguration(language:string){
 if(!spokenLanguages.includes(language))throw Error('Spoken replies are not available in this language. Please read the on-screen response.');
 // Keep the approved Hindi persona; the stable multilingual voice supports all other listed languages.
 const native:Record<string,string>={'en-IN':'sanchita_en_companion','kn-IN':'chaitra_kn_conversation','te-IN':'kavitha_te_conversation','gu-IN':'pooja_gu_conversational','bn-IN':'roopa_bn_conversational'};
 if(native[language])return {model:'bulbul:v4-flash',speaker:native[language]};
 const model=language==='hi-IN'?(process.env.SARVAM_TTS_MODEL||'bulbul:v4-flash'):'bulbul:v3';
 if(!['bulbul:v3','bulbul:v4-flash'].includes(model))throw Error('Unsupported speech model');
 return {model,speaker:model==='bulbul:v3'?'roopa':process.env.SARVAM_SPEAKER||'roopa_hi_companion'};
}
