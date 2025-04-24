# Invoice Extractor MVP (datanormalizationtool)

A lightweight web tool to extract structured data from unstructured financial documents (PDF/CSV invoices) using LLMs and OCR.

## Features (MVP)
- Drag-and-drop upload for PDF/CSV (max 10 files)
- Backend ingestion & storage (Supabase)
- Extraction pipeline (pdfplumber, Tesseract/Textract, OpenAI GPT-4)
- Table preview & export (CSV/XLSX/JSON)

## Tech Stack
- Frontend: Next.js + Tailwind CSS
- Backend: Next.js API routes (Node.js)
- Database/Storage: Supabase

## Setup
1. Install dependencies: `npm install`
2. Add your API keys to `.env.local` (see `.env.example`)
3. Run dev server: `npm run dev`

## Roadmap
- [ ] File upload UI
- [ ] Ingestion API
- [ ] Extraction pipeline
- [ ] Table preview/export
- [ ] Error/confidence handling
- [ ] User authentication (future)
