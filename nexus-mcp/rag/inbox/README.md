# Add government PDFs

Place public government/legal reference PDFs here, then add entries to `rag/sources.json` with a unique id, title, official HTTPS URL in `urls`, title phrase in `verify`, and `file` relative to this folder. Add `kind` (statute/judgment/notification), `jurisdiction` and `issuedAt` (YYYY-MM-DD) when known. Run `npm run rag:build`, stop the local RAG server, then `npm run rag:index` and `npm run rag:serve`.

Example entry:
```json
{"id":"your-official-act","title":"Exact published title","verify":"Exact title phrase","urls":["https://www.indiacode.nic.in/path/to/original.pdf"],"file":"your-document.pdf","kind":"statute","jurisdiction":"India"}
```
Replace the example URL with the actual public source. This is an operator-maintained catalog, not a public upload endpoint. Visitor case documents must never enter this shared legal corpus. Text-free/scanned PDFs require reviewed OCR before indexing; they are rejected rather than treated as searchable. Ingestion does not establish current validity or later judicial treatment.
