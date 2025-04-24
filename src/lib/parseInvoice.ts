

export type ParsedInvoice = {
  vendor?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  tax?: number;
  fees?: number;
  total_amount?: number;
  file_type: string;
  file_name: string;
  line_items?: Array<{
    description?: string;
    quantity?: number;
    unit_price?: number;
    line_total?: number;
  }>;
  [key: string]: unknown;
};

import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import { OpenAI } from 'openai';
import { parse as csvParse } from 'csv-parse/sync';
import { EXPECTED_FIELDS } from '../shared/constants';

export async function parseInvoice(
  fileBuffer: Buffer,
  fileName: string,
  fileType: string
): Promise<ParsedInvoice> {
  console.time('parseInvoice:total');
  let extractedText = '';
  let rawData: Record<string, unknown> | null = null;
  let extractionMethod: string = "";

  // 1. Extract text depending on file type
  console.time('parseInvoice:extract');
  console.log('Detected filetype: ' + fileType);
  if (fileType === 'application/pdf') {
    try {
      // Try to extract text from PDF
      console.log('Extracting text from PDF with pdf-parse...');
      const pdfData = await pdfParse(fileBuffer);
      extractedText = pdfData.text.trim();
      extractionMethod = 'pdf-parse';
      // If text is empty, fallback to OCR
      if (!extractedText) {
        const image = Buffer.from(fileBuffer);
        const { data: { text: ocrText } } = await Tesseract.recognize(image, 'eng');
        extractedText = ocrText.trim();
        extractionMethod = 'tesseract-ocr';
      }
    } catch (err: unknown) {
      console.error('Error extracting text from PDF: ' + (err instanceof Error ? err.message : String(err)));
      // On error, fallback to OCR
      const image = Buffer.from(fileBuffer);
      const { data: { text: ocrText } } = await Tesseract.recognize(image, 'eng');
      extractedText = ocrText.trim();
      extractionMethod = 'tesseract-ocr';
    }
  } else if (fileType === 'text/csv') {
    // Parse CSV and convert to JSON string for LLM
    try {
      const csvText = fileBuffer.toString('utf8');
      rawData = csvParse(csvText, { columns: true });
      extractedText = JSON.stringify(rawData, null, 2);
      extractionMethod = 'csv-parse';
    } catch (err: unknown) {
      console.error('Error parsing CSV: ' + (err instanceof Error ? err.message : String(err)));
      extractedText = fileBuffer.toString('utf8');
      extractionMethod = 'csv-fallback';
    }
  } else {
    throw new Error('Unsupported file type');
  }
  console.timeEnd('parseInvoice:extract');

  // 2. Prepare prompt for LLM
  const prompt = `You are an invoice parsing assistant. Extract the following fields from the provided invoice text and return them as a JSON object with this structure:\n\n{
  "vendor": string | null,
  "invoice_number": string | null,
  "invoice_date": string | null,
  "due_date": string | null,
  "tax": number | null,
  "fees": number | null,
  "total_amount": number | null,
  "line_items": [
    {
      "description": string,
      "quantity": number,
      "unit_price": number,
      "line_total": number
    },
    ...
  ]
}\n
If a field is not present in the invoice, set its value to null or an empty array for line_items. Only return valid JSON.\n\nInvoice text:\n${extractedText}`;

  // 3. Call OpenAI LLM
  const openaiClient = new OpenAI(); // gets API Key from environment variable OPENAI_API_KEY
  let llmResult: Record<string, unknown> = {};
  const chatgptConfig = {
    // max_completion_tokens: 512,
    store: true
  };
  console.time('parseInvoice:llm');
  try {
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'You are a helpful data parsing assistant.' },
        { role: 'user', content: prompt },
      ],
      ...chatgptConfig
    });
    // Extract JSON from LLM response
    console.log(completion.choices[0]);
    let content = completion.choices[0].message?.content || '';
    console.log('content: ' + content);
    // cleanup/trim output from chatGPT
    if (content.startsWith('```json') && content.endsWith('```')) {
      console.log('Removing code block markers');
      content = content.slice(7, -3).trim();
    } else {
      content = content.trim();
    }

    try {
      llmResult = JSON.parse(content);
    } catch (err) {
      console.error('Error parsing LLM response as JSON: ' + String(err));
      llmResult = { error: 'LLM parsing as JSON failed', details: String(err) };
    }
  } catch (err) {
    console.error('Error getting LLM response: ' + String(err));
    llmResult = { error: 'LLM parsing failed', details: String(err) };
  }
  console.timeEnd('parseInvoice:llm');

  // 4. Field diagnostics
  const expectedFields = EXPECTED_FIELDS.map((f: { key: string }) => f.key);
  const presentFields = llmResult && typeof llmResult === 'object' ? Object.keys(llmResult) : [];
  const missing_fields = expectedFields.filter(
    (key: string) => !(presentFields.includes(key) && llmResult[key] !== null && llmResult[key] !== undefined && llmResult[key] !== '')
  );
  const unmatched_fields = presentFields.filter((key: string) => !expectedFields.includes(key));

  // 5. Return parsed invoice with diagnostics
  console.timeEnd('parseInvoice:total');
  return {
    file_type: fileType,
    file_name: fileName,
    ...llmResult,
    extraction_method: extractionMethod,
    missing_fields,
    unmatched_fields,
  };
}
