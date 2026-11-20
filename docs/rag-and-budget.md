# Local legal RAG and economy mode

Implemented 13 November 2026. 15 official PDFs, 3248 searchable passages. Source-only search uses SQLite FTS5/BM25: no paid embeddings or hosted vector database. This is a selected central-law snapshot corpus, not all Indian laws or current legal verification.

## Configuration and costs

Keys are in ignored backend .env only. Live Gemini RAG and Sarvam TTS checks succeeded. Gemini 2.5 Flash-Lite: free tier where the account qualifies; paid text input $0.10/M tokens and output $0.40/M tokens. Bulbul v4 Flash: ₹1/1,000 characters before GST. Sources: https://aistudio.google.com/docs/pricing and https://docs.sarvam.ai/api/getting-started/pricing . Free-tier Gemini content may be used to improve Google products; use synthetic prototype data when that is unsuitable.

Local ledger: ₹400 total per configured cycle, ₹20/day (UTC), 12 requests/minute. Conservative reservations include a tax buffer; they are not actual bills or provider balances. Failures remain reserved. Other apps, external RAG servers and disabling economy mode bypass these limits. Set provider billing limits too. Text output is capped at 768 tokens, history is bounded, and thinking is disabled. Speech cache is bounded in memory. No automatic retry or upgrade to expensive models.

Economy mode uses one source-grounded research pass for investigations and document scans, and blocks sensor-triggered AI. It does not run 51 agents. OCR has a bounded output and can truncate long documents. Existing historical cases remain intact. Voice input on the legacy page remains browser recognition; USB capture, Sarvam STT and UNO Q Bluetooth routing are separate unfinished integrations.

## Use

Open Documents → Official law library to search without a model call. Assistant answers retrieve up to five passages, ask Gemini once, and show source links with PDF page numbers. Unsupported questions return a corpus-gap message. Invalid/missing citation labels fall back to excerpts. Valid labels alone do not prove semantic correctness; inspect sources. Non-English keyword expansion covers selected topics, not full multilingual semantic retrieval.

Run `npm run rag:build` to download missing sources and rebuild. Use `node scripts/build-legal-index.cjs --refresh` to refresh snapshots. Original PDFs, SHA-256 hashes and dates are under `data/legal`; private documents never enter this public index. Dataset files and the spending ledger are ignored by Git.

## Sources

- Constitution of India — 402 pages — https://www.legislative.gov.in/static/uploads/2025/08/b9a933fb88c0a5afba254256bc55a3f0.pdf
- BNS — Bharatiya Nyaya Sanhita, 2023 — 102 pages — https://cdtihyd.gov.in/static/download/LatestLaws/THE_BHARATIYA_NYAYA_SANHITA_2023.pdf
- BNSS — Bharatiya Nagarik Suraksha Sanhita, 2023 — 249 pages — https://citizen.goapolice.gov.in/documents/10184/4342826/THE%2BBHARATIYA%2BNAGARIK%2BSURAKSHA%2BSANHITA%2C%2B2023.pdf/703f3eb9-7e5a-4d35-b770-c5283e653696
- BSA — Bharatiya Sakshya Adhiniyam, 2023 — 47 pages — https://www.cdtschd.gov.in/pdf/Gazette-of-The-Bharatiya-Sakshya-Adhiniyam-2023.pdf
- Indian Contract Act, 1872 — 45 pages — https://wbconsumers.gov.in/writereaddata/ACT%20%26%20RULES/Relevant%20Act%20%26%20Rules/the-indian-contract-act-1872.pdf
- Consumer Protection Act, 2019 — 40 pages — https://wbconsumers.gov.in/writereaddata/ACT%20%26%20RULES/Act%20%26%20Rules/Consumer%20Protection%20Act%202019.pdf
- Protection of Women from Domestic Violence Act, 2005 — 12 pages — https://cdnbbsr.s3waas.gov.in/s3f78ab8a5341dac088339408e8783c726/uploads/2025/06/20250623612188605.pdf
- Legal Services Authorities Act, 1987 — 19 pages — https://cdnbbsr.s3waas.gov.in/s32e45f93088c7db59767efef516b306aa/uploads/2025/04/202504081796627129.pdf
- Right to Information Act, 2005 — 27 pages — https://cdnbbsr.s3waas.gov.in/s3e58aea67b01fa747687f038dfde066f6/uploads/2023/11/202311221804498216.pdf
- Transfer of Property Act, 1882 — 45 pages — https://igrsup.gov.in/prernadoc/Adhiniyam/pdf7/index.pdf
- Hindu Marriage Act, 1955 — 13 pages — https://cdnbbsr.s3waas.gov.in/s3f78ab8a5341dac088339408e8783c726/uploads/2025/06/20250625324458562.pdf
- Protection of Children from Sexual Offences Act, 2012 — 17 pages — https://cdnbbsr.s3waas.gov.in/s3f78ab8a5341dac088339408e8783c726/uploads/2025/06/20250623494233552.pdf
- Hindu Succession Act, 1956 — 11 pages — https://cdnbbsr.s3waas.gov.in/s3f78ab8a5341dac088339408e8783c726/uploads/2025/06/20250625290614384.pdf
- Prohibition of Child Marriage Act, 2006 — 7 pages — https://cdnbbsr.s3waas.gov.in/s3f78ab8a5341dac088339408e8783c726/uploads/2025/06/202506251912948753.pdf
- Right of Children to Free and Compulsory Education Act, 2009 — 16 pages — https://cdnbbsr.s3waas.gov.in/s3f78ab8a5341dac088339408e8783c726/uploads/2025/06/202506231511334382.pdf

## Missing downloads

- cpc: Official download unavailable
- bns-commencement: Official download unavailable
- bnss-commencement: Official download unavailable

State laws, full amendment/commencement coverage, case-law judgments, IT law and many specialist domains still need curated additions. A court-hosted draft BNSS was rejected and replaced with the enacted Gazette copy; downloading from an official domain alone is insufficient validation.
