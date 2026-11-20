export interface SpeechRecognitionLike {
  continuous: boolean; interimResults: boolean; lang: string; maxAlternatives: number;
  onstart: (() => void) | null; onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start(): void; abort(): void;
}
interface NfcReaderLike {
  scan(): Promise<void>;
  onreading: ((event: { message: { records: Array<{ recordType: string; data: DataView }> } }) => void) | null;
  onreadingerror: (() => void) | null;
}
export const browserCapabilities = window as Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  NDEFReader?: new () => NfcReaderLike;
}
export interface VerdictEvent { verdict?: string | Record<string, unknown>; language?: 'en-IN' | 'kn-IN' | 'hi-IN' | 'ta-IN'; session_id?: string; documentUrl?: string; confidence?: number; risk_level?: string }
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : String(error) }
