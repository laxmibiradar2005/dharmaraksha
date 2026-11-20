import languageList from '../locales/languages.json'
import { useLanguage } from '../context/languageState'
import { useState, useEffect, useRef, useCallback } from 'react'
import { browserCapabilities, errorMessage, type SpeechRecognitionLike, type VerdictEvent } from '../lib/browserCapabilities'

interface TranscriptEntry { speaker: 'user' | 'nexus' | 'system'; text: string; time: string }

type AppPhase = 'waiting_uid' | 'language_ask' | 'scan_document' | 'review_document' | 'processing' | 'explaining' | 'voice_chat' | 'session_end'
type Language = string

const API = `${location.protocol}//${location.host}`

const LANGUAGES=languageList.map(item=>({id:item.code,label:item.name,native:item.native,flag:'🇮🇳',prompt:'Language selected. Opening camera now.'}))

export default function NFCVoicePage({ onSessionStarted }: { onSessionStarted?: (id: string) => void }) {
  const {t, language: interfaceLanguage, loadLanguage} = useLanguage()

  const mounted = useRef(false)
  const generation = useRef(0)
  const [phase, setPhase] = useState<AppPhase>('waiting_uid')
  const [judgeCode, setJudgeCode] = useState<string | null>(null)
  const language:Language=interfaceLanguage
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [docContext, setDocContext] = useState('')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [, setVerdictText] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)

  const speechRequest = useRef<AbortController | null>(null)
  const chatHistory = useRef<Array<{role: 'user' | 'assistant'; text: string}>>([])
  const questionBusy = useRef(false)
  const speechPlayer = useRef<HTMLAudioElement | null>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const phaseRef = useRef(phase)
  const isProcessingUidRef = useRef(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const verdictReceivedRef = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      streamRef.current?.getTracks().forEach(track => track.stop())
      recognitionRef.current?.abort()
      speechRequest.current?.abort()
      speechPlayer.current?.pause()
    }
  }, [])

  useEffect(() => { phaseRef.current = phase }, [phase])

  const addT = useCallback((speaker: TranscriptEntry['speaker'], text: string) => {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    setTranscript(prev => [...prev, { speaker, text, time }])
  }, [])

  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [transcript])

  const [explanationSummary, setExplanationSummary] = useState<string>('')

  const languageRef = useRef<Language>(language)
  const sessionIdRef = useRef<string | null>(sessionId)
  useEffect(() => { languageRef.current = language }, [language])
  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])

  const stopSpeech = useCallback(() => {
    speechRequest.current?.abort()
    speechPlayer.current?.pause()
    setIsSpeaking(false)
  }, [])

  // Use the same configured voice as the kiosk. Failure must never block the camera.
  const speak = useCallback(async (text: string, lang?: string): Promise<void> => {
    stopSpeech()
    if(languageList.find(item=>item.code===(lang||languageRef.current))?.voice===false){addT('system',t('Spoken replies are unavailable in this language. Your replies and guidance appear on screen. You can speak or type.'));return}
    const controller = new AbortController()
    speechRequest.current = controller
    let url = ''
    const timeout = setTimeout(() => controller.abort(), 90000)
    try {
      const response = await fetch('/api/voice/speak', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text: t(text).slice(0, 2500), language: lang || languageRef.current}),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error('Speech unavailable. You can continue using the on-screen controls.')
      url = URL.createObjectURL(await response.blob())
      if (controller.signal.aborted) return
      const player = new Audio(url)
      speechPlayer.current = player
      setIsSpeaking(true)
      await new Promise<void>((resolve, reject) => {
        player.onended = () => resolve()
        player.onerror = () => reject(new Error('Audio could not play. Check the laptop sound output.'))
        controller.signal.addEventListener('abort', () => { player.pause(); resolve() }, {once:true})
        void player.play().catch(reject)
      })
    } catch (error) {
      if (!controller.signal.aborted && mounted.current) addT('system', error instanceof Error ? error.message : 'Speech unavailable. Continue with the on-screen controls.')
    } finally {
      clearTimeout(timeout)
      if (url) URL.revokeObjectURL(url)
      if (speechRequest.current === controller) { speechPlayer.current = null; setIsSpeaking(false) }
    }
  }, [stopSpeech, addT, t])

  // ─── Speech Recognition ────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch { /* Optional browser operation may already have stopped. */ }
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  const listen = useCallback((lang?: string, timeoutMs: number = 8000): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!navigator.onLine) { reject('Voice is available online only. Use text chat while offline.'); return }
      const SR = browserCapabilities.SpeechRecognition || browserCapabilities.webkitSpeechRecognition
      if (!SR) { reject('Speech recognition not supported in this browser'); return }

      stopListening()

      const r = new SR()
      recognitionRef.current = r
      r.continuous = false
      r.interimResults = false
      r.lang = lang || language
      r.maxAlternatives = 1

      let finished = false
      const timer = setTimeout(() => {
        if (!finished) {
          finished = true
          stopListening()
          reject('listen_timeout')
        }
      }, timeoutMs)

      r.onstart = () => setIsListening(true)
      r.onend = () => {
        setIsListening(false)
        if (!finished) {
          finished = true
          clearTimeout(timer)
          reject('ended_early')
        }
      }
      r.onerror = (e) => {
        setIsListening(false)
        if (!finished) {
          finished = true
          clearTimeout(timer)
          reject(e.error || 'speech_error')
        }
      }
      r.onresult = (e) => {
        if (!finished) {
          finished = true
          clearTimeout(timer)
          setIsListening(false)
          const result = e.results[0][0].transcript as string
          resolve(result)
        }
      }

      try {
        r.start()
      } catch (err) {
        clearTimeout(timer)
        setIsListening(false)
        reject(errorMessage(err))
      }
    })
  }, [language, stopListening])

  const [activeAgent, setActiveAgent] = useState<{ name: string; category?: string; bubble?: string } | null>(null)
  const [completedAgentCount, setCompletedAgentCount] = useState<number>(0)
  const [totalAgentCount, setTotalAgentCount] = useState<number>(50)

  // ─── Step 3: Camera & Document Capture ────────────────────────────


  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }, [])

  const openLiveCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      addT('system', 'Browser camera capture requires HTTPS. This page does not yet capture the USB camera connected to UNO Q. Use document upload in the AI assistant for now.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      if (!mounted.current) { stream.getTracks().forEach(track => track.stop()); return }
      streamRef.current = stream
      setCameraActive(true)
      addT('system', 'Camera ready. Position the document and choose Capture photo.')
    } catch (err) {
      addT('system', `❌ Camera permission error: ${errorMessage(err)}. Please allow camera access.`)
    }
  }, [addT])

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [cameraActive])

  // ─── Explicit Language Selection (Touch or Voice) ─────────────────
  const selectLanguage = useCallback(async (selectedLang: Language) => {
    stopListening()
    stopSpeech()

    const translated=await loadLanguage(selectedLang)
    if(!translated)return
    languageRef.current = selectedLang
    const langObj = LANGUAGES.find(l => l.id === selectedLang) || LANGUAGES[0]
    addT('system', `Language Selected: ${langObj.label} (${langObj.native})`)

    void speak(translated[langObj.prompt]||langObj.prompt, selectedLang)
    if (!mounted.current) return

    setPhase('scan_document')
    openLiveCamera()
  }, [speak, stopSpeech, stopListening, addT, openLiveCamera, loadLanguage])

  const captureFrame = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    if (video.readyState < 2 || !video.videoWidth) { addT('system', 'The camera is still starting. Please try Capture photo again.'); return }

    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    stopCamera()

    setCapturedPhoto(canvas.toDataURL('image/jpeg', .85))
    setPhase('review_document')
    addT('system', 'Photo captured. Review it before sending it for analysis.')
  }, [addT, stopCamera])

  const analyzeCapturedPhoto = useCallback(async () => {
    if (!capturedPhoto) return
    if (!navigator.onLine) { addT('system', 'Document analysis requires an internet connection. Your photo has not been sent.'); return }
    const currentGeneration = generation.current
    const curLang = languageRef.current || language || 'en-IN'
    addT('system', '📄 Document captured. Starting source-grounded research...')
    setPhase('processing')

    const processingMsgs: Record<Language, string> = {
      'en-IN': 'Document captured. The tribunal is analyzing your document. Please wait.',
      'kn-IN': 'ದಾಖಲೆ ಸೆರೆಹಿಡಿಯಲಾಗಿದೆ. ನ್ಯಾಯಾಲಯ ವಿಶ್ಲೇಷಿಸುತ್ತಿದೆ. ದಯವಿಟ್ಟು ನಿರೀಕ್ಷಿಸಿ.',
      'hi-IN': 'दस्तावेज़ कैप्चर हुआ। न्यायालय विश्लेषण कर रहा है। कृपया प्रतीक्षा करें।',
      'ta-IN': 'ஆவணம் பிடிக்கப்பட்டது. நீதிமன்றம் ஆய்வு செய்கிறது. தயவுசெய்து காத்திருங்கள்.',
    }
    void speak(processingMsgs[curLang] || t('Document captured. Your document is being analyzed. Please wait.'), curLang)
    if (!mounted.current) return

    const b64 = capturedPhoto.split(',')[1]

    try {
      const res = await fetch(`${API}/api/document-vision`, {
        method: 'POST',
        signal: AbortSignal.timeout(60000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: b64, language: curLang, timestamp: new Date().toISOString() }),
      })
      if (res.ok) {
        const data = await res.json()
        if (!mounted.current || generation.current !== currentGeneration) return
        setSessionId(data.sessionId)
        sessionIdRef.current = data.sessionId
        onSessionStarted?.(data.sessionId)
        setDocContext(data.extractedText?.substring(0, 20000) || '')
        addT('system', `✅ OCR Complete (${data.extractedText?.length || 0} chars). Research is running; review the cited sources when ready.`)
      } else {
        if (!mounted.current || generation.current !== currentGeneration) return
        addT('system', 'Analysis failed. Your photo is preserved. Try Use photo again or retake it.')
        setPhase('review_document')
      }
    } catch (err) {
      if (!mounted.current || generation.current !== currentGeneration) return
      addT('system', `❌ Error: ${errorMessage(err)}`)
      setPhase('review_document')
    }
  }, [capturedPhoto, language, speak, addT, onSessionStarted, t])



  // ─── Step 4: Handle Verdict Received ──────────────────────────────
  const handleVerdictReceived = useCallback(async (d: VerdictEvent) => {
    if (verdictReceivedRef.current) return
    verdictReceivedRef.current = true

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current ?? undefined)

    const currentLang = languageRef.current || d.language || language || 'en-IN'
    const curSessionId = sessionIdRef.current || d.session_id || sessionId

    let vText = ''
    if (typeof d.verdict === 'string') {
      vText = d.verdict
    } else if (d.verdict && typeof d.verdict === 'object') {
      const v = d.verdict
      vText = [v.verdict, v.summary, v.text, v.analysis, v.conclusion, v.bubble].find((value): value is string => typeof value === 'string' && !!value) || ''
      if (!vText) vText = Object.values(v).filter((x) => typeof x === 'string' && x.length > 10).join('. ')
    }
    vText = vText.replaceAll('{', '').replaceAll('}', '').replaceAll('[', '').replaceAll(']', '').replace(/"\w+"\s*:/g, '').replace(/\\"/g, '"').replace(/\\n/g, '\n').trim()

    setVerdictText(vText)
    if (d.documentUrl) setPdfUrl(d.documentUrl)

    addT('nexus', `⚖️ Tribunal Verdict Delivered (Confidence: ${d.confidence || 0}%, Risk: ${d.risk_level || 'Medium'})`)
    setPhase('explaining')

    // Call Gemini to generate simplified explanation in user's language
    let explanationToSpeak = ''
    try {
      const res = await fetch(`${API}/api/explain-verdict`, {
        method: 'POST',
        signal: AbortSignal.timeout(60000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verdict: vText, language: currentLang, sessionId: curSessionId, documentContext: docContext }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.explanation && data.explanation.length > 5) {
          explanationToSpeak = data.explanation
        }
      }
    } catch (err) {
      console.error('Explain verdict failed:', err)
    }

    if (!explanationToSpeak) {
      const fallbackMsgs: Record<Language, string> = {
        'en-IN': `The legal analysis is complete. The confidence score is ${d.confidence || 0} percent. Risk level is ${d.risk_level || 'medium'}. Please review the detailed report.`,
        'kn-IN': `ಕಾನೂನು ವಿಶ್ಲೇಷಣೆ ಪೂರ್ಣಗೊಂಡಿದೆ. ವಿಶ್ವಾಸಾರ್ಹತೆ ${d.confidence || 0} ಶೇಕಡಾ. ಅಪಾಯದ ಮಟ್ಟ ${d.risk_level || 'ಮಧ್ಯಮ'}. ವರದಿಯನ್ನು ಪರಿಶೀಲಿಸಿ.`,
        'hi-IN': `कानूनी विश्लेषण पूरा हुआ। विश्वास स्तर ${d.confidence || 0} प्रतिशत है। जोखिम स्तर ${d.risk_level || 'मध्यम'} है। कृपया विस्तृत रिपोर्ट देखें।`,
        'ta-IN': `சட்ட பகுப்பாய்வு முடிந்தது. நம்பிக்கை ${d.confidence || 0} சதவீதம். ஆபத்து ${d.risk_level || 'நடுத்தரம்'}. அறிக்கையை பார்க்கவும்.`,
      }
      explanationToSpeak = fallbackMsgs[currentLang] || t('The analysis is complete. Please review the report on screen.')
    }

    setExplanationSummary(explanationToSpeak)
    addT('nexus', `📢 [${currentLang.substring(0, 2).toUpperCase()}]: ${explanationToSpeak}`)
    await speak(explanationToSpeak, currentLang)

    const askMsgs: Record<Language, string> = {
      'en-IN': 'Do you have any legal questions? Tap the microphone and speak.',
      'kn-IN': 'ನಿಮಗೆ ಯಾವುದೇ ಕಾನೂನು ಪ್ರಶ್ನೆಗಳಿವೆಯೇ? ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿ ಮಾತನಾಡಿ.',
      'hi-IN': 'क्या आपके पास कोई कानूनी सवाल है? माइक दबाएं और बोलें।',
      'ta-IN': 'உங்களுக்கு ஏதேனும் கேள்விகள் உள்ளதா? மைக் அழுத்தி பேசுங்கள்.',
    }
    await speak(askMsgs[currentLang] || t('Do you have any legal questions? Tap the microphone and speak.'), currentLang)
    setPhase('voice_chat')
  }, [speak, docContext, addT, language, sessionId, t])

  // ─── Step 2: Handle UID Detected ──────────────────────────────────
  const handleUIDDetected = useCallback(async (tag: string) => {
    if (isProcessingUidRef.current) return
    isProcessingUidRef.current = true

    setJudgeCode(tag)
    addT('system', `✅ Demo card detected: ${tag}`)
    setPhase('language_ask')

    // Voice announcement
    await speak('Welcome. Please choose your language on screen or speak now.', 'en-IN')
    if (!mounted.current || phaseRef.current !== 'language_ask') return

    // Start background voice listener (non-blocking)
    try {
      const spoken = await listen('en-IN', 10000)
      if (phaseRef.current === 'language_ask') {
        addT('user', spoken)
        addT('system', 'Detecting spoken language...')
        const normalized=spoken.normalize('NFKC').toLowerCase().replace(/[.!?,]/g,'').trim()
        const detected=languageList.find(item=>item.aliases.includes(normalized)||item.code===normalized)?.code
        if(!detected){addT('system',t('Choose language'));return}
        selectLanguage(detected)
      }
    } catch {
      console.log('Voice language listen ended — awaiting touch selection')
    }
  }, [speak, listen, addT, selectLanguage, t])

  // ─── Step 1: UID Scan (Web NFC + Tap Fallback) ─────────────────────
  const startUIDScan = useCallback(async () => {
    if (!browserCapabilities.NDEFReader) {
      addT('system', 'Web NFC not detected in browser. Tap the card on screen to start.')
      return
    }
    addT('system', 'Waiting for Identification Card / Tag...')
    try {
      const ndef = new browserCapabilities.NDEFReader()
      await ndef.scan()
      ndef.onreading = (event) => {
        if (isProcessingUidRef.current) return
        let tag = ''
        try {
          const dec = new TextDecoder()
          for (const rec of event.message.records) {
            if (rec.recordType === 'text') {
              tag = dec.decode(rec.data)
              break
            }
          }
        } catch { /* Optional browser operation may already have stopped. */ }

        if (tag.startsWith('JUDGE_NEXUS') || tag.length > 0) {
          handleUIDDetected(tag || 'JUDGE_NEXUS_NFC_01')
        } else {
          addT('system', 'Card recognized. Initializing session.')
          handleUIDDetected('JUDGE_NEXUS_01')
        }
      }
      ndef.onreadingerror = () => addT('system', 'NFC read error — hold card steady and tap again.')
    } catch {
      addT('system', `NFC status: Tap the card icon on screen to begin.`)
    }
  }, [addT, handleUIDDetected])


  // ─── WebSocket Connection ─────────────────────────────────────────
  useEffect(() => {
    let ws: WebSocket | null = null
    let stopped = false
    let retry: ReturnType<typeof setTimeout> | undefined
    function connect() {
      if (stopped) return
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
      ws = new WebSocket(`${proto}//${location.host}/ws`)
      wsRef.current = ws
      ws.onopen = () => console.log('📱 [MOBILE POS] WebSocket connected')
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data)
          if (phaseRef.current === 'session_end') return
          if (d.session_id && d.session_id !== sessionIdRef.current) return
          console.log('📱 [MOBILE POS] WS event:', d.type)

          if (d.type === 'AGENT_ROSTER') {
            if (d.totalAgents) setTotalAgentCount(d.totalAgents)
          }

          if (d.type === 'AGENT_START') {
            setActiveAgent({ name: d.name || d.agentId, category: d.category })
            addT('system', `⏳ [${d.name || d.agentId}] testifying...`)
          }

          if (d.type === 'AGENT_COMPLETE' || d.type === 'agent_complete') {
            const name = d.name || d.agent || d.agentId || 'Agent'
            const bubble = d.bubble || d.output || ''
            setActiveAgent({ name, bubble })
            setCompletedAgentCount(prev => prev + 1)
            if (bubble) {
              addT('nexus', `[${name}]: ${bubble}`)
            }
          }

          if (d.type === 'phase') {
            if (d.message) addT('system', `⚡ ${d.message}`)
          }

          if (d.type === 'session_complete' && !verdictReceivedRef.current && phaseRef.current !== 'waiting_uid') {
            handleVerdictReceived(d)
          }
        } catch { /* Optional browser operation may already have stopped. */ }
      }
      ws.onclose = () => {
        console.log('📱 [MOBILE POS] WS reconnecting in 2s...')
        if (!stopped) retry = setTimeout(connect, 2000)
      }
      ws.onerror = () => ws?.close()
    }
    connect()
    return () => { stopped = true; clearTimeout(retry); ws?.close() }
  }, [addT, handleVerdictReceived])

  // ─── Polling Fallback during 'processing' ──────────────────────────
  useEffect(() => {
    if (phase === 'processing' && sessionId) {
      verdictReceivedRef.current = false
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current ?? undefined)

      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${API}/api/session-status/${sessionId}`)
          if (res.ok) {
            const data = await res.json()
            if (data.status === 'done' && data.verdict && !verdictReceivedRef.current) {
              console.log('📱 [POLL] Session complete via HTTP polling fallback')
              clearInterval(pollIntervalRef.current ?? undefined)
              handleVerdictReceived(data)
            }
          }
        } catch (err) {
          console.warn('📱 [POLL] Polling check failed:', err)
        }
      }, 2000)

      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current ?? undefined)
      }
    }
  }, [phase, sessionId, handleVerdictReceived])

  const endSession = useCallback(async () => {
    stopListening()
    stopSpeech()
    generation.current++
    chatHistory.current = []
    phaseRef.current = 'session_end'
    setPhase('session_end')
    isProcessingUidRef.current = false
    const msgs: Record<Language, string> = {
      'en-IN': 'Thank you for using DHARMARAKSHA. Your report has been dispatched and is on screen. Have a great day.',
      'kn-IN': 'ಧರ್ಮರಕ್ಷ ಬಳಸಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮ ವರದಿ ಸಿದ್ಧವಾಗಿದೆ. ಶುಭ ದಿನ.',
      'hi-IN': 'धर्मरक्ष का उपयोग करने के लिए धन्यवाद। आपकी रिपोर्ट तैयार है। शुभ दिन।',
      'ta-IN': 'தர்மரக்ஷா பயன்படுத்தியதற்கு நன்றி. உங்கள் அறிக்கை தயாராக உள்ளது. நல்ல நாள்.',
    }
    const msg = msgs[language] || t('Thank you for using Dharmaraksha. This session has ended.')
    addT('nexus', msg)
    await speak(msg)
  }, [speak, stopListening, stopSpeech, addT, language, t])

  // ─── Step 5: Voice Chat Interaction ───────────────────────────────
  const askVoiceQuestion = useCallback(async () => {
    if (questionBusy.current) return
    questionBusy.current = true
    const currentGeneration = generation.current
    stopSpeech()
    try {
      addT('system', '🎙️ Listening to your question...')
      const q = await listen(language, 35000)
      if (!mounted.current || generation.current !== currentGeneration) return
      addT('user', q)

      const exitWords = ['no more', "that's all", 'no question', 'thank you', 'exit', 'bye', 'nahi', 'bas', 'saku', 'illa', 'vendaam', 'podhum']
      if (exitWords.some(w => q.toLowerCase().trim().replace(/[.!?]+$/, '') === w)) {
        await endSession()
        return
      }

      addT('system', '⚖️ DHARMARAKSHA Advisor thinking...')
      const res = await fetch(`${API}/api/assistant/chat`, {
        method: 'POST',
        signal: AbortSignal.timeout(60000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, language, history: chatHistory.current.slice(-12), context: docContext, voice: true }),
      })
      if (res.ok) {
        const data = await res.json()
        if (!mounted.current || generation.current !== currentGeneration) return
        chatHistory.current = [...chatHistory.current.slice(-10), {role:'user', text:q}, {role:'assistant', text:data.reply}]
        addT('nexus', data.reply)
        await speak(data.reply)
      } else {
        await speak('Please try asking your question again.')
      }
    } catch {
      addT('system', 'Tap the microphone whenever you want to ask a question.')
    } finally { questionBusy.current = false }
  }, [listen, speak, stopSpeech, addT, language, docContext, endSession])

  const resetAll = useCallback(() => {
    generation.current++
    stopSpeech()
    chatHistory.current = []
    sessionIdRef.current = null
    phaseRef.current = 'waiting_uid'
    setTranscript([])
    setActiveAgent(null)
    setCompletedAgentCount(0)
    setExplanationSummary('')
    isProcessingUidRef.current = false
    verdictReceivedRef.current = false
    setPhase('waiting_uid')
    setJudgeCode(null)
    setSessionId(null)
    setDocContext('')
    setCapturedPhoto(null)
    setPdfUrl(null)
    setVerdictText('')
    stopCamera()
    stopListening()
  }, [stopCamera, stopListening, stopSpeech])

  const accent = judgeCode ? '#bad0a7' : '#d8bd8d'

  return (
    <div className="voice-kiosk" style={{ minHeight: '620px', height: '75dvh', width: '100%', display: 'flex', flexDirection: 'column', background: '#141d1b', fontFamily: '"Inter", -apple-system, sans-serif', color: '#eee9dd', overflow: 'hidden' }}>
      {/* Hidden canvas for snapshot capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header */}
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#101916' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#d8bd8d', fontSize: 18 }}>⚖️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 0.5, color: '#d8bd8d' }}>{t("DHARMARAKSHA")}</div>
            <div style={{ fontSize: 9, color: '#b9c2b5', letterSpacing: 1 }}>{t("MOBILE LEGAL TRIBUNAL")}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: judgeCode ? '#bad0a7' : '#aeb9aa', display: 'inline-block' }} />
          <span style={{ color: '#b9c2b5' }}>{judgeCode ? t("Demo session") : t("Standby")}</span>
          {phase !== 'waiting_uid' && (
            <button onClick={resetAll} style={{ marginLeft: 6, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.08)', color: '#aaa', border: 'none', fontSize: 10 }}>{t("Reset")}</button>
          )}
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '12px 20px', overflowY: 'auto' }}>
        {(isSpeaking || isListening) && (
          <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', border: `2px solid ${isListening ? '#dbc394' : accent}`, opacity: 0.25, animation: 'pulse 1.5s infinite', pointerEvents: 'none' }} />
        )}

        {/* Phase 1: Tap Card / Simulate */}
        {phase === 'waiting_uid' && (
          <button type="button" aria-label={t("Try demo card")}
            onClick={() => handleUIDDetected('JUDGE_NEXUS_MOBILE_01')}
            style={{ textAlign: 'center', cursor: 'pointer', padding: '24px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(245,158,11,0.2)', width: '100%', maxWidth: 360 }}
          >
            <div style={{ fontSize: 56, marginBottom: 14, animation: 'pulse 2s infinite' }}>🪪</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#d8bd8d', letterSpacing: 1.5 }}>{t("TRY DEMO CARD")}</div>
            <div style={{ fontSize: 12, color: '#8c8da6', marginTop: 8 }}>{t("Demo only. Secure RFID sign-in is not configured.")}</div>
            <div style={{ marginTop: 16, display: 'inline-block', fontSize: 11, padding: '6px 14px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', color: '#d8bd8d', fontWeight: 600 }}>{t("Preview document capture")}</div>
          </button>
        )}

        {phase === 'waiting_uid' && browserCapabilities.NDEFReader && <button className="secondary-button" onClick={() => void startUIDScan()}>{t("Scan compatible phone NFC card")}</button>}
        {/* Phase 2: Select Language (Touch & Voice) */}
        {phase === 'language_ask' && (
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 380 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎙️</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#dbc394', letterSpacing: 0.5 }}>{t("CHOOSE YOUR LANGUAGE")}</div>
            <div style={{ fontSize: 12, color: '#b9c2b5', marginBottom: 20 }}>{t("Tap a language or speak your choice")}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {LANGUAGES.map(lang => (
                <button
                  key={lang.id}
                  onClick={() => selectLanguage(lang.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px 12px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(216,189,141,0.2)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontSize: 24, marginBottom: 6 }}>{lang.flag}</span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{lang.native}</span>
                  <span style={{ fontSize: 11, color: '#b9c2b5', marginTop: 2 }}>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Phase 3: Camera Capture */}
        {phase === 'scan_document' && (
          <div style={{ textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{
              width: '100%', maxWidth: 380, borderRadius: 12,
              border: cameraActive ? '3px solid #bad0a7' : '3px solid #333',
              boxShadow: cameraActive ? '0 0 30px rgba(34,197,94,0.3)' : 'none',
              background: '#111',
            }} />

            {cameraActive ? (
              <div style={{ marginTop: 12 }}>

                <div style={{ fontSize: 12, fontWeight: 700, color: '#bad0a7' }}>{t("HOLD DOCUMENT STEADY")}</div>
                <button onClick={captureFrame} style={{ marginTop: 8, padding: '8px 18px', borderRadius: 8, background: '#bad0a7', color: '#000', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{t("Capture photo")}</button>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#b9c2b5', marginTop: 12 }}>{t("Camera unavailable.")}<button className="secondary-button" onClick={openLiveCamera}>{t("Retry camera")}</button></div>
            )}
          </div>
        )}

        {phase === 'review_document' && capturedPhoto && <section className="capture-review"><h2>{t("Review your document")}</h2><img src={capturedPhoto} alt={t("Captured document preview")}/><p>{t("Check that the whole page is readable. Choosing Use photo sends this image to the online document processing service and starts the existing investigation workflow.")}</p><div><button className="secondary-button" onClick={() => { setCapturedPhoto(null); setPhase('scan_document'); void openLiveCamera() }}>{t("Retake")}</button><button className="primary-button" onClick={() => void analyzeCapturedPhoto()}>{t("Use photo")}</button></div></section>}
        {/* Phase 4: Processing / 50 Agents Deliberating */}
        {phase === 'processing' && (
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 380 }}>
            <div style={{ fontSize: 44, marginBottom: 8, animation: 'pulse 1.5s infinite' }}>🏛️</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#d8bd8d', letterSpacing: 0.5 }}>{t("LEGAL RESEARCH IN PROGRESS")}</div>
            <div style={{ fontSize: 12, color: '#b9c2b5', marginTop: 4 }}>{t("Searching sources and preparing a concise answer...")}</div>

            {/* Live Progress Bar & Counter */}
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#bad0a7', fontWeight: 700 }}>
              <span>{t("Research steps complete")}</span>
              <span>{completedAgentCount} / {totalAgentCount}{t("Agents")}</span>
            </div>
            <div style={{ marginTop: 6, width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                borderRadius: 3,
                background: 'linear-gradient(90deg, #d8bd8d, #bad0a7)',
                width: `${Math.max(10, Math.min(100, (completedAgentCount / (totalAgentCount || 50)) * 100))}%`,
                transition: 'width 0.4s ease'
              }} />
            </div>

            {/* Active Agent Live Spotlight Card */}
            {activeAgent && (
              <div style={{
                marginTop: 16,
                padding: '12px 14px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(245,158,11,0.25)',
                textAlign: 'left',
                animation: 'fadeIn 0.3s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#d8bd8d' }}>
                    ⚖️ {activeAgent.name}
                  </span>
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(216,189,141,0.15)', color: '#dbc394', fontWeight: 700, textTransform: 'uppercase' }}>
                    {activeAgent.category || 'Testifying'}
                  </span>
                </div>
                {activeAgent.bubble && (
                  <div style={{ fontSize: 11, color: '#d0d1e6', lineHeight: 1.4, marginTop: 4 }}>
                    "{activeAgent.bubble.length > 120 ? activeAgent.bubble.substring(0, 120) + '...' : activeAgent.bubble}"
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Phase 5: Explaining Verdict */}
        {phase === 'explaining' && (
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 380 }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>⚖️</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#bad0a7', letterSpacing: 0.5 }}>{t("EXPLAINING AUDIT VERDICT")}</div>
            <div style={{ fontSize: 12, color: '#b9c2b5', marginTop: 4 }}>{t("Speaking in")}{LANGUAGES.find(l => l.id === language)?.native || 'selected language'}...
            </div>

            {/* Multilingual Explanation Card */}
            {explanationSummary && (
              <div style={{
                width: '100%',
                marginTop: 14,
                padding: '14px 16px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(216,189,141,0.12), rgba(216,189,141,0.08))',
                border: '1.5px solid rgba(216,189,141,0.4)',
                textAlign: 'left',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#dbc394', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t("📢 Audit Summary (")}{LANGUAGES.find(l => l.id === language)?.native})
                  </span>
                  <button
                    onClick={() => speak(explanationSummary, language)}
                    style={{
                      background: 'rgba(216,189,141,0.2)',
                      border: '1px solid rgba(216,189,141,0.4)',
                      borderRadius: 6,
                      color: '#dbc394',
                      padding: '3px 8px',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >{t("🔊 Replay Audio")}</button>
                </div>
                <div style={{ fontSize: 13, color: '#f8fafc', lineHeight: 1.6, fontWeight: 500 }}>
                  {explanationSummary}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Phase 6: Interactive Voice Chat & Report */}
        {phase === 'voice_chat' && (
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 380 }}>
            {/* Multilingual Explanation Card */}
            {explanationSummary && (
              <div style={{
                width: '100%',
                marginBottom: 16,
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(216,189,141,0.3)',
                textAlign: 'left',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#dbc394', textTransform: 'uppercase' }}>{t("📢 Audit Summary (")}{LANGUAGES.find(l => l.id === language)?.native})
                  </span>
                  <button
                    onClick={() => speak(explanationSummary, language)}
                    style={{
                      background: 'rgba(216,189,141,0.15)',
                      border: '1px solid rgba(216,189,141,0.3)',
                      borderRadius: 6,
                      color: '#dbc394',
                      padding: '2px 6px',
                      fontSize: 9,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >{t("🔊 Replay")}</button>
                </div>
                <div style={{ fontSize: 12, color: '#f8fafc', lineHeight: 1.5 }}>
                  {explanationSummary}
                </div>
              </div>
            )}

            <button
              onClick={askVoiceQuestion}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: isListening ? '#dbc394' : '#bad0a7',
                color: '#000000', border: 'none', fontSize: 28,
                cursor: 'pointer', boxShadow: '0 0 24px rgba(34,197,94,0.4)',
                marginBottom: 10
              }}
            >
              {isListening ? '🎙️' : '🎤'}
            </button>
            <div style={{ fontSize: 15, fontWeight: 800, color: isListening ? '#dbc394' : '#bad0a7' }}>
              {isListening ? t("LISTENING...") : t("TAP TO ASK QUESTION")}
            </div>
            <div style={{ fontSize: 11, color: '#b9c2b5', marginTop: 2 }}>{t("Ask questions in")}{LANGUAGES.find(l => l.id === language)?.native}{t("or English")}</div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(34,197,94,0.15)', color: '#bad0a7',
                    border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8,
                    textDecoration: 'none', fontWeight: 700, fontSize: 12
                  }}
                >{t("📄 PDF Report")}</a>
              )}
              <button
                onClick={resetAll}
                style={{
                  padding: '8px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >{t("🔄 Scan Next Document")}</button>
            </div>
          </div>
        )}

        {/* Phase 7: Session Complete */}
        {phase === 'session_end' && (
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 380 }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>🙏</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#bad0a7' }}>{t("SESSION COMPLETE")}</div>
            <div style={{ fontSize: 12, color: '#b9c2b5', marginTop: 4 }}>{t("Report has been emailed and is ready for download.")}</div>

            {explanationSummary && (
              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', fontSize: 12, color: '#e2e8f0', lineHeight: 1.5 }}>
                {explanationSummary}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(34,197,94,0.15)', color: '#bad0a7',
                    border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8,
                    textDecoration: 'none', fontWeight: 700, fontSize: 12
                  }}
                >{t("📄 PDF Report")}</a>
              )}
              <button
                onClick={resetAll}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #dbc394, #d8bd8d)',
                  color: '#000000',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >{t("🔄 Scan New Document")}</button>
            </div>
          </div>
        )}

        {/* Bottom Audio Indicator */}
        <div style={{ position: 'absolute', bottom: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, background: 'rgba(255,255,255,0.04)', border: `1px solid ${isListening ? 'rgba(216,189,141,0.4)' : isSpeaking ? `${accent}40` : 'rgba(255,255,255,0.06)'}`, fontSize: 11, color: isListening ? '#dbc394' : isSpeaking ? accent : '#b9c2b5' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: isListening ? '#dbc394' : isSpeaking ? accent : '#aeb9aa', animation: (isListening || isSpeaking) ? 'pulse 0.8s infinite' : 'none' }} />
          {isListening ? '🎙️ Listening...' : isSpeaking ? '🔊 Speaking...' : t("Idle")}
        </div>
      </div>

      {/* Real-Time Transcript Panel */}
      <div style={{ height: '26vh', borderTop: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', padding: '10px 16px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ fontSize: 9, color: '#aeb9aa', letterSpacing: 1.5, marginBottom: 6, textTransform: 'uppercase' }}>{t("Live Transcript")}</div>
        {transcript.map((entry, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.02)', animation: 'fadeIn 0.2s ease' }}>
            <span style={{ fontSize: 10, color: '#aeb9aa', fontFamily: '"JetBrains Mono", monospace', minWidth: 52, flexShrink: 0 }}>{entry.time}</span>
            <span style={{ fontSize: 9, fontWeight: 700, minWidth: 42, flexShrink: 0, textTransform: 'uppercase', color: entry.speaker === 'user' ? '#dbc394' : entry.speaker === 'nexus' ? '#d8bd8d' : '#aeb9aa' }}>
              {entry.speaker === 'user' ? t("USER") : entry.speaker === 'nexus' ? t("NEXUS") : t("SYS")}
            </span>
            <span style={{ fontSize: 12, color: '#dcded1', lineHeight: 1.4 }}>{entry.text}</span>
          </div>
        ))}
        <div ref={transcriptEndRef} />
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.05)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(3px)} to{opacity:1;transform:translateY(0)} }
        @keyframes loading { 0%{width:10%;margin-left:0} 50%{width:60%;margin-left:20%} 100%{width:10%;margin-left:90%} }
      `}</style>
    </div>
  )
}
