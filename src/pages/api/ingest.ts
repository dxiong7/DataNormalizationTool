import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import fs from 'fs';
import { parseInvoice } from '../../lib/parseInvoice';
import { supabase } from '../../lib/supabase';
import { DEFAULT_SET_EXPECTED_FIELDS } from '../../shared/constants';

// Disable Next.js body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const INVOICES_SUPABASE_BUCKET = 'invoices';

// Helper to parse multipart form
function parseForm(req: NextApiRequest): Promise<{ files: File[], fields: Record<string, unknown> }> {
  const form = formidable({ multiples: true });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      const fileArr = Array.isArray(files.file) ? files.file : files.file ? [files.file] : [];
      resolve({ files: fileArr, fields });
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { files, fields } = await parseForm(req);
    if (!files.length) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    // Modularized Supabase upload
    async function uploadToSupabase(fileBuffer: Buffer, fileName: string, fileType: string): Promise<{ path: string | null, error: string | null }> {
      const UPLOADS_DIRECTORY_PREFIX = 'uploads/';
      const storagePath = `${UPLOADS_DIRECTORY_PREFIX}${Date.now()}-${fileName}`;
      console.log(`[Supabase] Uploading file: ${fileName} to ${storagePath}`);
      try {
        const { data, error } = await supabase.storage
          .from(INVOICES_SUPABASE_BUCKET)
          .upload(storagePath, fileBuffer, {
            contentType: fileType || undefined,
            upsert: false,
          });
        if (error) {
          console.error(`[Supabase] Upload failed for ${fileName}: ${error.message}`);
          return { path: null, error: error.message };
        }
        console.log(`[Supabase] Upload successful: ${fileName} → ${data?.path || storagePath}`);
        return { path: data?.path || storagePath, error: null };
      } catch (e: unknown) {
        console.error(`[Supabase] Upload exception for ${fileName}: ${e instanceof Error ? e.message : String(e)}`);
        return { path: null, error: e instanceof Error ? e.message : String(e) };
      }
    }

    // Parse expectedFields from form fields
    let expectedFields;
    try {
      if (fields.expectedFields) {
        const parsed = JSON.parse(Array.isArray(fields.expectedFields) ? fields.expectedFields[0] : fields.expectedFields);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.length <= 15 && parsed.every(f => typeof f.key === 'string' && typeof f.label === 'string' && typeof f.desc === 'string')) {
          expectedFields = parsed;
        }
      }
    } catch {}
    if (!expectedFields) {
      console.log('No expectedFields provided, using default set');
      expectedFields = DEFAULT_SET_EXPECTED_FIELDS;
    }

    const parsedResults = await Promise.all(
      files.map(async (file) => {
        const fileBuffer = fs.readFileSync(file.filepath);
        const fileName = file.originalFilename || file.newFilename;
        // Use modularized upload
        const { path: storageUrl, error: uploadError } = await uploadToSupabase(fileBuffer, fileName, file.mimetype || '');
        // Parse invoice
        let result;
        let missing_fields: string[] = [];
        try {
          result = await parseInvoice(
            fileBuffer,
            fileName,
            file.mimetype || '',
            expectedFields
          );
          // if (result && typeof result === 'object' && Array.isArray(result._missing_fields)) {
          //   console.log('Removing the internal only _missing_fields array from parsed result')
          //   missing_fields = result._missing_fields;
          //   delete result._missing_fields;
          // }
          console.log(`[Parse] Successfully parsed invoice for file: ${fileName}`);
        } catch (err: unknown) {
          console.error(`[Parse] Parsing failed for file: ${fileName}. Error: ${err instanceof Error ? err.message : String(err)}`);
          result = { error: 'Parsing failed', details: err instanceof Error ? err.message : String(err) };
        }
        // Delete temp file
        try {
          fs.unlinkSync(file.filepath);
          console.log(`[Cleanup] Deleted temp file: ${file.filepath}`);
        } catch (err: unknown) {
          console.error(`[Cleanup] Failed to delete temp file: ${file.filepath}. Error: ${err instanceof Error ? err.message : String(err)}`);
        }
        return {
          ...result,
          storage_path: storageUrl,
          storage_error: uploadError,
        };
      })
    );

    return res.status(200).json({ results: parsedResults });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message || 'Internal server error' });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
