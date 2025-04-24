# Architecture Overview

## High-Level Design
- **Frontend:** Next.js app with Tailwind CSS for UI
- **Backend:** Next.js API routes for ingestion and parsing
- **Extraction Logic:** Decoupled from API handlers
- **Storage:** Supabase for file storage & metadata

## Data Flow
1. User uploads PDF/CSV via drag-and-drop UI
2. File sent to `/api/ingest` API route
3. API route stores file, triggers extraction pipeline
4. Extraction pipeline parses file, calls LLM/OCR, returns structured data
5. Data previewed in frontend, user can export as CSV/XLSX/JSON

## File Structure (Planned)
```
/ (root)
  /pages
    index.tsx         # Upload UI
    /api
      ingest.ts       # File ingestion API
  /lib
    parseInvoice.ts   # Extraction/parsing logic (decoupled)
  /styles
    ...               # Tailwind config
  /docs
    prd.mdB
    architecture.md
  README.md
```

## Database Schema (Supabase)
- `files`: id, user_id (future), file_name, file_type, upload_date, storage_url, status, metadata
- `extractions`: id, file_id, raw_json, structured_json, confidence, created_at

## .env Example
```
OPENAI_API_KEY=your-openai-key
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-key
```
