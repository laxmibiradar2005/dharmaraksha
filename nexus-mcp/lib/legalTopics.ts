export { indianLanguages as languages } from './indianLanguages';

export function detectLanguage(text: string): string | undefined {
  if (/[\u0c80-\u0cff]/.test(text)) return 'kn-IN';
  if (/[\u0900-\u097f]/.test(text)) return 'hi-IN';
  if (/[\u0b80-\u0bff]/.test(text)) return 'ta-IN';
}

export const specialties = [
  {id:'consumer_law_agent', name:'Consumer Protection', docs:['consumer'], match:/consumer|refund|replacement|defective|warranty|उपभोक्ता|रिफंड|ಗ್ರಾಹಕ|ಮರುಪಾವತಿ|நுகர்வோர்|பணத்தைத் திரும்ப/iu},
  {id:'family_law_agent', name:'Family Law', docs:['domestic-violence','hindu-marriage','child-marriage','hindu-succession'], match:/divorce|marriage|custody|maintenance|domestic violence|तलाक|विवाह|ವಿವಾಹ|விவாகரத்து|திருமண/iu},
  {id:'property_law_agent', name:'Property Law', docs:['property','hindu-succession','cpc'], match:/tenant|tenancy|lease|landlord|evict|property|inheritance|किराय|संपत्ति|ಬಾಡಿಗೆ|ಆಸ್ತಿ|வாடகை|சொத்து/iu},
  {id:'corporate_law_agent', name:'Contracts and Business', docs:['contract','cpc'], match:/contract|agreement|breach|supplier|company|अनुबंध|करार|ಒಪ್ಪಂದ|ஒப்பந்த/iu},
  {id:'constitutional_law_agent', name:'Constitutional Law', docs:['constitution','rti','right-education'], match:/constitution|fundamental rights|right to information|\brti\b|संविधान|ಸಂವಿಧಾನ|அரசியலமைப்பு/iu},
  {id:'criminal_law_agent', name:'Criminal Law', docs:['bns','bnss','bsa','pocso','satender-antil-2022'], match:/\b(?:bns|bnss|bsa|ipc|crpc|fir|bail|arrest|criminal|theft|police|assault|pocso|cheating)\b|जमानत|गिरफ्तार|ಪೊಲೀಸ್|ಜಾಮೀನು|காவல்|ஜாமீன்/iu},
  {id:'labour_law_agent', name:'Labour Law', docs:['labour'], match:/unpaid wages|salary|termination|employment|worker|मजदूरी|ವೇತನ|ஊதியம்/iu},
  {id:'tax_law_agent', name:'Tax Law', docs:['tax'], match:/\b(?:tax|gst)\b|आयकर|ತೆರಿಗೆ|வருமான வரி/iu},
  {id:'human_rights_agent', name:'Legal Aid', docs:['legal-aid'], match:/legal aid|free lawyer|free legal|विधिक सहायता|मुफ्त वकील|ಕಾನೂನು ನೆರವು|இலவச சட்ட/iu},
];

export function relevantSpecialties(question: string) {
  return specialties.filter(item => item.match.test(question));
}

export function isDocumentReading(question: string) {
  return /\b(?:summari[sz]e|transcribe|translate|extract)\b|what(?:'s| is| does| and all).{0,30}(?:inside|document|say|contain|there)|(?:analy[sz]e|read|explain)\s+(?:this|the|my)\s+(?:document|file|pdf|page)|सारांश|दस्तावेज़.{0,25}(?:क्या|बताएं)|ದಾಖಲೆ.{0,25}(?:ಏನು|ಸಾರಾಂಶ)|ஆவணத்தில்.{0,25}(?:என்ன|சொல்)/iu.test(question)
    && !/\b(?:legal options|legally|valid|enforceable|can i sue|which law)\b/i.test(question);
}
