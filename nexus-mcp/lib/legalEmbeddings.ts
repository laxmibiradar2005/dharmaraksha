import path from 'node:path';
import fs from 'node:fs';

export const EMBEDDING_MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
export const EMBEDDING_REVISION = '2c4055b12046f11709e9df2c122e59ffbdc2f900';
export const EMBEDDING_VERSION = `${EMBEDDING_MODEL}@${EMBEDDING_REVISION}:q8:mean-normalized-512:v1`;
let extractor: Promise<any> | undefined;
let queue: Promise<unknown> = Promise.resolve();
async function model() {
  if (!extractor) extractor = (async () => {
    // Keep native ESM import when this project compiles to CommonJS.
    const { AutoTokenizer, AutoModel, FeatureExtractionPipeline, env } = await new Function('return import("@huggingface/transformers")')();
    env.cacheDir = process.env.RAG_MODEL_CACHE || path.join(process.cwd(), 'data/models');
    env.allowRemoteModels = process.env.RAG_MODEL_OFFLINE !== 'true';
    const snapshot=path.join(env.cacheDir,EMBEDDING_MODEL,EMBEDDING_REVISION);
    const location=fs.existsSync(path.join(snapshot,'tokenizer_config.json'))?snapshot.split('\\').join('/'):EMBEDDING_MODEL;
    const options = {revision: EMBEDDING_REVISION, dtype:'q8', device:'cpu', local_files_only:process.env.RAG_MODEL_OFFLINE==='true', session_options:{intraOpNumThreads:2,interOpNumThreads:1}};
    // Explicit components avoid pipeline file discovery making network metadata calls in offline mode.
    const [tokenizer, model] = await Promise.all([AutoTokenizer.from_pretrained(location, options), AutoModel.from_pretrained(location, options)]);
    return new FeatureExtractionPipeline({task:'feature-extraction',tokenizer,model});
  })().catch(error => { extractor = undefined; throw error; });
  return extractor;
}
export function vectorLiteral(vector: number[]): string {
  if (vector.length !== 384 || vector.some(n => !Number.isFinite(n))) throw Error('Invalid 384-dimensional embedding');
  return `[${vector.join(',')}]`;
}
export function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length || texts.length > 16 || texts.some(t => !t.trim() || t.length > 1800)) return Promise.reject(Error('Invalid embedding batch'));
  const work = queue.then(async () => {
    const pipe = await model();
    const output = await pipe(texts, { pooling: 'mean', normalize: true, truncation: true, max_length: 512 });
    const vectors = output.tolist() as number[][];
    if (vectors.length !== texts.length) throw Error('Incomplete embeddings');
    vectors.forEach(vectorLiteral); return vectors;
  });
  queue = work.catch(() => undefined);
  return work;
}
