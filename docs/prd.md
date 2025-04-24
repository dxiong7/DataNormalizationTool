# 📄 Project Requirements Document: Invoice Extractor MVP

## 🔧 Objective

**Build a lightweight web tool that transforms unstructured financial documents into structured, exportable tables.**

Primary user: Accountants or finance professionals drowning in poorly formatted invoices.

---

## 🧭 Success Criteria

1. **Accurate Field Extraction:** >90% accuracy across common invoice fields in varied formats.  
2. **Fast Time-to-Insight:** User can go from file upload → preview table → download structured data in <3 minutes.  
3. **No-code Simplicity:** UX should require zero configuration or training to use.

---

## 🧱 MVP Scope (Phase 1)

### ✅ Inputs

- Upload interface (drag-and-drop)
  - Support for: `.pdf` and `.csv` files
  - Max 10 files per upload session
- Backend ingestion and storage
  - Store original files in database

### 🧠 Processing Pipeline

**Goal:** Extract the fields (key-value pairs) from each file and match them to the appropriate fields and finally export the data in the desired structured format.
1. Raw Extraction
- Parse/extract text and run LLM to extract visible key-value pairs
- Store raw JSON
2. User Review & Export
- Let user define field mappings with auto-suggested options
- Dropdown to reassign fields or define new ones
- Output saved config as a user template for future docs
- Show preview table with option to export as file
<!-- - `Vendor Name`
- `Invoice Number`
- `Invoice Date`
- `Due Date`
- `Line Items`:
  - `Description`
  - `Quantity`
  - `Unit Cost`
  - `Line Total`
- `Tax` / `Fees`
- `Total Amount` -->




**Tech:**
- LLM prompt template + pdfplumber / PyMuPDF extraction
- If layout is image-based → fallback to OCR via Tesseract or Textract
- Each document processed independently
- Abstracted as `/src/pages/api/ingest.ts` API endpoint (Next.js API Route)

**Edge Considerations:**
- Warn user for non-parseable or low-confidence files
- Log model confidence score per field (if accessible via LLM response)

### 📤 Output

- In-app table preview (editable cells optional for now)
- Download as `.csv` or `.xlsx`
- Optional: JSON export per document (dev/debug mode)
- Include `File Name` in output for traceability

---

## 🧪 Tech Stack

**Frontend**
- Next.js (App Router) + Tailwind — fast dev cycle, easily extendable
- Main UI in `/src/app/page.tsx`
- Features:
  - File upload dropzone (styled, drag-and-drop)
  - List of parsed files
  - Table preview for each
  - Export/download buttons (CSV, JSON, XLSX planned)

**Backend**
- Node.js (Next.js API routes)
- Main ingestion endpoint: `/src/pages/api/ingest.ts`
- Invoice parsing pipeline:
  - PDF text extraction (pdf-parse in code; not pdfplumber)
  - Tesseract for OCR fallback (for image-based or low-quality PDFs)
  - OpenAI GPT-4 via API (for semantic field extraction from text)
  - Extraction logic in `/src/lib/parseInvoice.ts`
- Supabase (storage, basic metadata DB; auth planned)

---

## 🔄 Non-Goals (Out of Scope, Defer to v2+)
- Support for more file types: `.jpg/.png` (scanned invoices)
- Email parsing / inbox sync  
- Entity resolution across documents (vendor matching, deduplication)  
- GL tagging rules  
- User-defined field mappings  
- Bulk edits in preview table  
- Real-time collaboration / user management  

---

## 📊 Metrics to Track

- Document parse success rate  
- Average time from upload → export  
- % of files that fall back to OCR  
- User satisfaction score (1-click feedback at export)  
- Drop-off rate between upload and export  

---

## 🧱 Sample API Contract

```http
POST /parse_invoice
Request:
{
  "file_url": "<supabase/fb-storage-path>",
  "file_type": "pdf"
}

Response:
{
  "vendor": "Acme Corp",
  "invoice_number": "INV-10023",
  ...
  "line_items": [
    {"description": "Widget A", "quantity": 10, "unit_price": 5.00, "line_total": 50.00},
    ...
  ]
}
```
---

### Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| **LLM hallucinations** | Validate via regex / fuzzy rules (e.g. date format, totals sum check) |
| **OCR errors** | Allow user manual correction in table view (v2), show confidence flag |
| **Cost creep from LLM/API calls** | Limit file count, cache results, add usage metering early |
| **Format variability** | Use prompt engineering + test against diverse doc samples |
