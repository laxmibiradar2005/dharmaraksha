// Fixed fallback workflow phrases: no cloud translation charge for navigation.
const KIOSK_PHRASES={
 'hi-IN':{
 welcome:'नमस्ते। मैं धर्मरक्षा हूँ, आपकी कानूनी सहायता की साथी। अतिथि के रूप में शुरू करने के लिए स्टार्ट ऐज़ गेस्ट कहें, या स्क्रीन पर बटन दबाएँ।',
 choose:'दस्तावेज़ स्कैन करें या सवाल पूछें। आप स्क्रीन पर भी चुन सकते हैं।',
 scan:'पन्ने को कैमरे के नीचे समतल रखें। चारों कोने और साफ़ अक्षर दिखाई देने पर आप खुद फोटो लेने का बटन दबाएँ। फोटो अपने आप नहीं ली जाएगी।',
 captured:'पन्ने की फोटो ले ली गई है। अगला पन्ना, दोबारा फोटो, या स्कैन पूरा हुआ चुनें।',
 consent:'क्या मैं इन पन्नों को पढ़ने के लिए ऑनलाइन विश्लेषण के लिए भेज सकती हूँ? हाँ विश्लेषण करें या नहीं कहें।',
 reading:'अब मैं आपकी अनुमति वाले पन्ने पढ़ रही हूँ।',
 ready:'पन्ने पढ़ लिए गए हैं। अब अपना सवाल पूछें।',
 unclear:'कुछ शब्द साफ़ नहीं हैं या अधूरे हैं। कृपया मूल दस्तावेज़ से जाँचें। आप आखिरी पन्ने की फोटो दोबारा ले सकते हैं।',
 ask:'कृपया अपना सवाल पूछें।',
 confirm:'क्या मैंने आपका सवाल सही समझा? हाँ कहें, या दोबारा पूछने के लिए नहीं कहें।',
 again:'कृपया अपना सवाल दोबारा पूछें।',
 next:'आप एक और सवाल पूछ सकते हैं, जवाब दोहराने को कह सकते हैं, दस्तावेज़ स्कैन कर सकते हैं, या सत्र समाप्त कर सकते हैं।',
 silent:'मुझे साफ़ आवाज़ नहीं सुनाई दी। मेरे बोलने के बाद यूएसबी माइक्रोफोन के पास बोलें।',
 end:'आपका अतिथि सत्र समाप्त हो गया है। पन्ने और बातचीत हटा दिए गए हैं। धन्यवाद।',
 no:'कोई पन्ना नहीं भेजा गया। अगला पन्ना, दोबारा फोटो, या स्कैन पूरा हुआ चुनें।',
 language:'हिन्दी चुनी गई है। दस्तावेज़ स्कैन करें या सवाल पूछें।'
 },
 'kn-IN':{
 welcome:'ನಮಸ್ಕಾರ. ನಾನು ಧರ್ಮರಕ್ಷಾ, ನಿಮ್ಮ ಕಾನೂನು ಸಹಾಯಕಿ. ಅತಿಥಿಯಾಗಿ ಪ್ರಾರಂಭಿಸಲು ಸ್ಟಾರ್ಟ್ ಆಸ್ ಗೆಸ್ಟ್ ಎಂದು ಹೇಳಿ ಅಥವಾ ಪರದೆಯ ಬಟನ್ ಒತ್ತಿ.',
 choose:'ದಾಖಲೆಗಳನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ಅಥವಾ ಪ್ರಶ್ನೆ ಕೇಳಿ. ಪರದೆಯಲ್ಲಿಯೂ ಆಯ್ಕೆ ಮಾಡಬಹುದು.',
 scan:'ಹಾಳೆಯನ್ನು ಕ್ಯಾಮೆರಾದ ಕೆಳಗೆ ಸಮತಟ್ಟಾಗಿ ಇಡಿ. ನಾಲ್ಕೂ ಮೂಲೆಗಳು ಮತ್ತು ಅಕ್ಷರಗಳು ಸ್ಪಷ್ಟವಾಗಿ ಕಾಣಿಸಿದಾಗ ನೀವೇ ಫೋಟೋ ತೆಗೆಯುವ ಬಟನ್ ಒತ್ತಿ. ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಫೋಟೋ ತೆಗೆಯುವುದಿಲ್ಲ.',
 captured:'ಹಾಳೆಯ ಫೋಟೋ ತೆಗೆಯಲಾಗಿದೆ. ಮುಂದಿನ ಪುಟ, ಮತ್ತೆ ಫೋಟೋ, ಅಥವಾ ಸ್ಕ್ಯಾನ್ ಮುಗಿದಿದೆ ಎಂದು ಆಯ್ಕೆ ಮಾಡಿ.',
 consent:'ಈ ಪುಟಗಳನ್ನು ಓದಲು ಆನ್‌ಲೈನ್ ವಿಶ್ಲೇಷಣೆಗೆ ಕಳುಹಿಸಲು ಅನುಮತಿ ನೀಡುತ್ತೀರಾ? ಹೌದು ವಿಶ್ಲೇಷಿಸಿ ಅಥವಾ ಇಲ್ಲ ಎಂದು ಹೇಳಿ.',
 reading:'ನೀವು ಅನುಮತಿಸಿದ ಪುಟಗಳನ್ನು ಈಗ ಓದುತ್ತಿದ್ದೇನೆ.',
 ready:'ಪುಟಗಳನ್ನು ಓದಲಾಗಿದೆ. ಈಗ ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ.',
 unclear:'ಕೆಲವು ಪದಗಳು ಸ್ಪಷ್ಟವಾಗಿಲ್ಲ ಅಥವಾ ಅಪೂರ್ಣವಾಗಿವೆ. ಮೂಲ ದಾಖಲೆಯೊಂದಿಗೆ ಪರಿಶೀಲಿಸಿ. ಕೊನೆಯ ಪುಟದ ಫೋಟೋ ಮತ್ತೆ ತೆಗೆಯಬಹುದು.',
 ask:'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ.',
 confirm:'ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಸರಿಯಾಗಿ ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದೇನೆಯೇ? ಹೌದು ಎಂದು ಹೇಳಿ ಅಥವಾ ಮತ್ತೆ ಕೇಳಲು ಇಲ್ಲ ಎಂದು ಹೇಳಿ.',
 again:'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಮತ್ತೊಮ್ಮೆ ಕೇಳಿ.',
 next:'ಇನ್ನೊಂದು ಪ್ರಶ್ನೆ ಕೇಳಬಹುದು, ಉತ್ತರವನ್ನು ಪುನಃ ಕೇಳಬಹುದು, ದಾಖಲೆಗಳನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಬಹುದು ಅಥವಾ ಅಧಿವೇಶನವನ್ನು ಮುಗಿಸಬಹುದು.',
 silent:'ನಿಮ್ಮ ಮಾತು ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ನಾನು ಮಾತನಾಡಿದ ನಂತರ ಯುಎಸ್‌ಬಿ ಮೈಕ್ರೋಫೋನಿನ ಹತ್ತಿರ ಮಾತನಾಡಿ.',
 end:'ನಿಮ್ಮ ಅತಿಥಿ ಅಧಿವೇಶನ ಮುಗಿದಿದೆ. ಪುಟಗಳು ಮತ್ತು ಸಂಭಾಷಣೆಯನ್ನು ತೆಗೆದುಹಾಕಲಾಗಿದೆ. ಧನ್ಯವಾದಗಳು.',
 no:'ಯಾವುದೇ ಪುಟ ಕಳುಹಿಸಿಲ್ಲ. ಮುಂದಿನ ಪುಟ, ಮತ್ತೆ ಫೋಟೋ ಅಥವಾ ಸ್ಕ್ಯಾನ್ ಮುಗಿದಿದೆ ಎಂದು ಆಯ್ಕೆ ಮಾಡಿ.',
 language:'ಕನ್ನಡ ಆಯ್ಕೆ ಮಾಡಲಾಗಿದೆ. ದಾಖಲೆಗಳನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ಅಥವಾ ಪ್ರಶ್ನೆ ಕೇಳಿ.'
 },
 'ta-IN':{
 welcome:'வணக்கம். நான் தர்மரக்ஷா, உங்கள் சட்ட உதவியாளர். விருந்தினராகத் தொடங்க ஸ்டார்ட் ஆஸ் கெஸ்ட் என்று சொல்லுங்கள் அல்லது திரையில் உள்ள பொத்தானை அழுத்துங்கள்.',
 choose:'ஆவணங்களை ஸ்கேன் செய்யுங்கள் அல்லது கேள்வி கேளுங்கள். திரையிலும் தேர்வு செய்யலாம்.',
 scan:'காகிதத்தை கேமராவின் கீழ் தட்டையாக வையுங்கள். நான்கு மூலைகளும் எழுத்துகளும் தெளிவாகத் தெரிந்ததும் நீங்களே படம் எடுக்கும் பொத்தானை அழுத்துங்கள். தானாகப் படம் எடுக்கப்படாது.',
 captured:'பக்கத்தின் படம் எடுக்கப்பட்டது. அடுத்த பக்கம், மீண்டும் படம், அல்லது ஸ்கேன் முடிந்தது என்பதைத் தேர்வு செய்யுங்கள்.',
 consent:'இந்தப் பக்கங்களைப் படிக்க ஆன்லைன் ஆய்வுக்கு அனுப்பலாமா? ஆம் ஆய்வு செய்யுங்கள் அல்லது வேண்டாம் என்று சொல்லுங்கள்.',
 reading:'நீங்கள் அனுமதித்த பக்கங்களை இப்போது படிக்கிறேன்.',
 ready:'பக்கங்கள் படிக்கப்பட்டன. இப்போது உங்கள் கேள்வியைக் கேளுங்கள்.',
 unclear:'சில சொற்கள் தெளிவாக இல்லை அல்லது முழுமையாக இல்லை. அசல் ஆவணத்துடன் சரிபாருங்கள். கடைசிப் பக்கத்தை மீண்டும் படம் எடுக்கலாம்.',
 ask:'உங்கள் கேள்வியைக் கேளுங்கள்.',
 confirm:'உங்கள் கேள்வியைச் சரியாகப் புரிந்துகொண்டேனா? ஆம் என்று சொல்லுங்கள் அல்லது மீண்டும் கேட்க வேண்டாம் என்று சொல்லுங்கள்.',
 again:'உங்கள் கேள்வியை மீண்டும் கேளுங்கள்.',
 next:'மற்றொரு கேள்வி கேட்கலாம், பதிலை மீண்டும் கேட்கலாம், ஆவணங்களை ஸ்கேன் செய்யலாம் அல்லது அமர்வை முடிக்கலாம்.',
 silent:'உங்கள் குரல் தெளிவாகக் கேட்கவில்லை. நான் பேசி முடித்ததும் யுஎஸ்பி மைக்ரோஃபோனுக்கு அருகில் பேசுங்கள்.',
 end:'உங்கள் விருந்தினர் அமர்வு முடிந்தது. பக்கங்களும் உரையாடலும் நீக்கப்பட்டன. நன்றி.',
 no:'எந்தப் பக்கமும் அனுப்பப்படவில்லை. அடுத்த பக்கம், மீண்டும் படம் அல்லது ஸ்கேன் முடிந்தது என்பதைத் தேர்வு செய்யுங்கள்.',
 language:'தமிழ் தேர்வு செய்யப்பட்டது. ஆவணங்களை ஸ்கேன் செய்யுங்கள் அல்லது கேள்வி கேளுங்கள்.'
 }
};
function localPrompt(text,language){
 const d=KIOSK_PHRASES[language];if(!d)return text;
 let key=null;
 if(text.startsWith('Namaste'))key='welcome';
 else if(text.startsWith('Language selected'))key='language';
 else if(text.startsWith('Please place'))key='scan';
 else if(/^Page \d+ captured/.test(text)||text.startsWith('Say next page'))key='captured';
 else if(text.startsWith('You have'))key='consent';
 else if(text.startsWith('I will now'))key='reading';
 else if(text.startsWith('Your pages'))key='ready';
 else if(text.startsWith('Some text'))key='unclear';
 else if(text.startsWith('Please ask your question again'))key='again';
 else if(text.startsWith('Please ask'))key='ask';
 else if(text.startsWith('I heard:'))key='confirm';
 else if(text.startsWith('You can ask'))key='next';
 else if(text.startsWith('I did not hear'))key='silent';
 else if(text.startsWith('Your guest'))key='end';
 else if(text.startsWith('No pages'))key='no';
 return key ? d[key] : text;
}

const KIOSK_LANGUAGES=[{"code": "en-IN", "name": "English", "native": "English", "aliases": ["english"], "voice": true}, {"code": "hi-IN", "name": "Hindi", "native": "हिन्दी", "aliases": ["hindi", "हिंदी", "हिन्दी"], "voice": true}, {"code": "kn-IN", "name": "Kannada", "native": "ಕನ್ನಡ", "aliases": ["kannada", "ಕನ್ನಡ", "canada", "kannad"], "voice": true}, {"code": "ta-IN", "name": "Tamil", "native": "தமிழ்", "aliases": ["tamil", "தமிழ்"], "voice": true}, {"code": "te-IN", "name": "Telugu", "native": "తెలుగు", "aliases": ["telugu", "తెలుగు"], "voice": true}, {"code": "ml-IN", "name": "Malayalam", "native": "മലയാളം", "aliases": ["malayalam", "മലയാളം"], "voice": true}, {"code": "mr-IN", "name": "Marathi", "native": "मराठी", "aliases": ["marathi", "मराठी"], "voice": true}, {"code": "bn-IN", "name": "Bengali", "native": "বাংলা", "aliases": ["bengali", "bangla", "বাংলা"], "voice": true}, {"code": "gu-IN", "name": "Gujarati", "native": "ગુજરાતી", "aliases": ["gujarati", "ગુજરાતી"], "voice": true}, {"code": "pa-IN", "name": "Punjabi", "native": "ਪੰਜਾਬੀ", "aliases": ["punjabi", "ਪੰਜਾਬੀ"], "voice": true}, {"code": "od-IN", "name": "Odia", "native": "ଓଡ଼ିଆ", "aliases": ["odia", "oriya", "ଓଡ଼ିଆ"], "voice": true}, {"code": "as-IN", "name": "Assamese", "native": "অসমীয়া", "aliases": ["assamese", "অসমীয়া"], "voice": false}, {"code": "ur-IN", "name": "Urdu", "native": "اردو", "aliases": ["urdu", "اردو"], "voice": false}, {"code": "ne-IN", "name": "Nepali", "native": "नेपाली", "aliases": ["nepali", "नेपाली"], "voice": false}, {"code": "kok-IN", "name": "Konkani", "native": "कोंकणी", "aliases": ["konkani", "कोंकणी"], "voice": false}, {"code": "ks-IN", "name": "Kashmiri", "native": "کٲشُر", "aliases": ["kashmiri", "کٲشُر"], "voice": false}, {"code": "sd-IN", "name": "Sindhi", "native": "سنڌي", "aliases": ["sindhi", "سنڌي"], "voice": false}, {"code": "sa-IN", "name": "Sanskrit", "native": "संस्कृतम्", "aliases": ["sanskrit", "संस्कृत", "संस्कृतम्"], "voice": false}, {"code": "sat-IN", "name": "Santali", "native": "ᱥᱟᱱᱛᱟᱲᱤ", "aliases": ["santali", "santhali", "ᱥᱟᱱᱛᱟᱲᱤ"], "voice": false}, {"code": "mni-IN", "name": "Manipuri", "native": "ꯃꯤꯇꯩꯂꯣꯟ", "aliases": ["manipuri", "meitei", "ꯃꯤꯇꯩꯂꯣꯟ"], "voice": false}, {"code": "brx-IN", "name": "Bodo", "native": "बड़ो", "aliases": ["bodo", "बड़ो"], "voice": false}, {"code": "mai-IN", "name": "Maithili", "native": "मैथिली", "aliases": ["maithili", "मैथिली"], "voice": false}, {"code": "doi-IN", "name": "Dogri", "native": "डोगरी", "aliases": ["dogri", "डोगरी"], "voice": false}];
