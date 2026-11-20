# Cleanup audit — 13 November 2026

Automatic approval review blocked the requested deletion commands. The items below were audited but have NOT been deleted. No alternate deletion method was attempted.

## Duplicate project

The workspace sibling `../darma rakshak ksit/` contains the old project and `Legal_Analysis_Report_Final.pdf`. Keep that report in the maintained project's `nexus-mcp/reports/` before manually removing the old folder in Explorer. All 161 old sessions are present among 162 current sessions; all agent outputs and security events match. All old event payloads exist in the maintained database (42 event row IDs were renumbered during the prior merge). Old Git branches were fetched into the maintained `.git` under `refs/remotes/legacy/`.

Unique old source files are superseded UI components and generated bundles. The working application, private credentials, hardware code, legal corpus and actual reports remain required.

## Audited obsolete files in nexus-mcp

- `_inspect.js`, `_inspect_drive.js`, `_inspect_drive2.js`, `check_composio.js`, `check_oauth.js`, `composio_test.js`, `composio_test_app.js`, `get_schema.js`: standalone obsolete inspection scripts, not referenced by active runtime or package scripts.
- Empty `test_composio.ts`, `test_docgen.ts`, `test_drive.ts`, `test_drive2.ts`, `test_email.ts`, `test_pipeline.ts`, `test_supabase.ts`, `test_upload_db.ts`, `test_wa.ts`, `test_wa_send.ts`: zero-byte old tests. Keep the real tests in `tests/` and `dashboard-react/tests/`.
- Generated fixtures `test_font.pdf`, `test_nirmala.pdf`, `test_output.pdf`, `test_output.pdf.temp.pdf`, `test.pdf`, `test.pdf.temp.pdf`, `test_document.pdf`. These are not saved case reports.
- Training notebooks `Day_2_Agentic_AI_MCP_MEGA.ipynb`, `Transformers_Workshop_Notebook.ipynb`: not application dependencies.

Do not delete `.env`, `serviceAccountKey.json`, `nexus.db` or its active WAL files, `data/`, `reports/`, package lockfiles, installed dependencies needed to run, or `hardware/DharmarakshaReader/config.h`.
