CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS legal_documents (
  id text PRIMARY KEY,
  title text NOT NULL,
  url text NOT NULL CHECK (url LIKE 'https://%'),
  sha256 text NOT NULL CHECK (length(sha256)=64),
  kind text NOT NULL CHECK (kind IN ('statute','judgment','notification')),
  jurisdiction text NOT NULL DEFAULT 'India',
  issued_at date,
  retrieved_at timestamptz NOT NULL,
  indexed_at timestamptz NOT NULL DEFAULT now(),
  embedding_model text NOT NULL,
  snapshot boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS legal_chunks (
  id text PRIMARY KEY,
  document_id text NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  page integer NOT NULL CHECK (page>0),
  ordinal integer NOT NULL CHECK (ordinal>=0),
  text text NOT NULL,
  embedding vector(384) NOT NULL,
  search_text tsvector GENERATED ALWAYS AS (to_tsvector('english',text)) STORED,
  UNIQUE (document_id,page,ordinal)
);
CREATE INDEX IF NOT EXISTS legal_chunks_keywords ON legal_chunks USING gin(search_text);
CREATE INDEX IF NOT EXISTS legal_chunks_vectors ON legal_chunks USING hnsw(embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS legal_chunks_document ON legal_chunks(document_id,page);
CREATE TABLE IF NOT EXISTS legal_ingestions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  completed_at timestamptz NOT NULL DEFAULT now(),
  documents integer NOT NULL,
  chunks integer NOT NULL,
  embedding_model text NOT NULL
);
