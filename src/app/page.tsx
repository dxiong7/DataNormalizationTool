"use client";
import React, { useRef, useState } from "react";
import { DEFAULT_SET_EXPECTED_FIELDS } from "../shared/constants";
import type { ParsedInvoice } from "../lib/parseInvoice";

const MAX_FILES = 10;
const ACCEPTED_TYPES = ["application/pdf", "text/csv"];

type ExpectedField = { key: string; label: string; desc: string };

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [results, setResults] = useState<ParsedInvoice[] | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [expectedFields, setExpectedFields] = useState<ExpectedField[]>([...DEFAULT_SET_EXPECTED_FIELDS]);
  const [newField, setNewField] = useState<{ label: string; desc: string }>({ label: '', desc: '' });
  const MAX_FIELDS = 15;

  const handleAddField = () => {
    const label = newField.label.trim();
    const desc = newField.desc.trim();
    if (label && desc && expectedFields.length < MAX_FIELDS) {
      let key = slugify(label);
      let uniqueKey = key;
      let suffix = 2;
      while (expectedFields.some(f => f.key === uniqueKey)) {
        uniqueKey = `${key}_${suffix++}`;
      }
      setExpectedFields(prev => [...prev, { key: uniqueKey, label, desc }]);
      setNewField({ label: '', desc: '' });
    }
  };

  const handleRemoveField = (idx: number) => {
    setExpectedFields(prev => prev.filter((_, i) => i !== idx));
  };

  const handleResetFields = () => {
    setExpectedFields([...DEFAULT_SET_EXPECTED_FIELDS]);
  };


  async function handleUpload() {
    setUploadError(null);
    setUploading(true);
    setResults(null);
    const formData = new FormData();
    files.forEach(f => formData.append('file', f));
    formData.append('expectedFields', JSON.stringify(expectedFields));
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2).slice(0, 100) + '...');
      // Always set results as an array for table rendering
      if (Array.isArray(data.results)) {
        setResults(data.results);
      } else if (data.results) {
        setResults([data.results]);
      } else {
        setResults([]);
      }
      console.log("From the frontend: " + JSON.stringify(data, null, 2).slice(0, 100) + '...');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setUploadError(err.message || 'Upload failed');
      } else {
        setUploadError('Upload failed');
      }
    } finally {
      setUploading(false);
    }
  }

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setError(null);
    const dropped = Array.from(event.dataTransfer.files);
    if (files.length + dropped.length > MAX_FILES) {
      setError(`You can upload up to ${MAX_FILES} files.`);
      return;
    }
    const valid = dropped.filter(f => ACCEPTED_TYPES.includes(f.type));
    setFiles(prev => [...prev, ...valid].slice(0, MAX_FILES));
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files ? Array.from(e.target.files) : [];
    if (files.length + selected.length > MAX_FILES) {
      setError(`You can upload up to ${MAX_FILES} files.`);
      return;
    }
    const valid = selected.filter(f => ACCEPTED_TYPES.includes(f.type));
    setFiles(prev => [...prev, ...valid].slice(0, MAX_FILES));
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col items-center min-h-screen justify-center p-8">
      <div className="w-full max-w-2xl mb-6 bg-blue-50 border border-blue-200 rounded p-4">
        <h3 className="font-semibold text-blue-900 mb-3 text-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h2a4 4 0 014 4v2"></path><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          Customize Fields to Extract
        </h3>
        <div className="flex flex-col gap-2 mb-2">
          {expectedFields.map((f, i) => (
            <div
              key={f.key}
              className="flex items-center justify-between bg-white rounded border border-blue-100 px-3 py-2 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
                <span className="font-semibold text-blue-900">{f.label}</span>
                <span className="text-blue-900 text-xs hidden sm:inline">|</span>
                <span className="text-blue-900 text-xs">{f.desc}</span>
              </div>
              {expectedFields.length > 1 && (
                <button
                  type="button"
                  className="ml-4 text-xs text-red-600 hover:underline hover:text-red-800 transition"
                  onClick={() => handleRemoveField(i)}
                  aria-label={`Remove field ${f.label}`}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <input
            type="text"
            placeholder="Label (The field label that will show up on the results table, e.g. Vendor)"
            className="border px-2 py-1 rounded text-xs text-blue-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={newField.label}
            maxLength={32}
            onChange={e => setNewField(f => ({ ...f, label: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Description (Describe what the field represents)"
            className="border px-2 py-1 rounded text-xs text-blue-900 bg-white flex-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={newField.desc}
            maxLength={64}
            onChange={e => setNewField(f => ({ ...f, desc: e.target.value }))}
          />
          <button
            type="button"
            className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-60"
            onClick={handleAddField}
            disabled={
              !newField.label.trim() ||
              !newField.desc.trim() ||
              expectedFields.length >= MAX_FIELDS
            }
          >
            Add
          </button>
          <button
            type="button"
            className="bg-gray-200 text-gray-700 px-2 py-1 rounded border ml-2"
            onClick={handleResetFields}
            disabled={expectedFields.length === DEFAULT_SET_EXPECTED_FIELDS.length && expectedFields.every((f, i) => f.key === DEFAULT_SET_EXPECTED_FIELDS[i].key)}
          >
            Reset to Default
          </button>
        </div>
        <p className="text-blue-800 mt-2 text-xs">
          The AI will attempt to extract these fields from your invoice. If a field is missing or cannot be matched, you will see a warning in the results table below.
        </p>
        <p className="text-xs text-blue-700 mt-1">Max {MAX_FIELDS} fields. Field keys must be unique.</p>
      </div>
      <div className="flex items-center justify-center w-full mb-4">
        <label
          htmlFor="dropzone-file"
          className="flex flex-col items-center justify-center w-full max-w-md h-64 border-4 border-gray-400 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600 shadow-lg transition"
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
            </svg>
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">PDF or CSV files only (max {MAX_FILES} files)</p>
          </div>
          <input
            id="dropzone-file"
            ref={inputRef}
            type="file"
            accept=".pdf,.csv"
            multiple
            className="hidden"
            onChange={onFileChange}
          />
        </label>
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <ul className="w-full max-w-md mb-4">
        {files.map((file, idx) => (
          <li key={file.name + idx} className="flex justify-between items-center py-1 px-2 border-b text-white bg-gray-800">
            <span>{file.name}</span>
            <button className="text-xs text-red-500 hover:underline" onClick={e => { e.stopPropagation(); removeFile(idx); }}>Remove</button>
          </li>
        ))}
      </ul>
      <button
        className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50 mb-4"
        disabled={files.length === 0 || uploading}
        onClick={handleUpload}
      >
        {uploading ? 'Uploading...' : 'Upload & Parse'}
      </button>
      {uploadError && <div className="text-red-500 mb-2">{uploadError}</div>}
      {results && (
        <div className="w-full max-w-2xl mt-6 p-4 bg-white rounded border">
          <h2 className="text-lg font-semibold mb-2 text-black">Parsed Results</h2>
          {results.length > 0 && (
            <div className="mb-4">
              {results.some(r => Array.isArray((r as any).missing_fields) && (r as any).missing_fields.length > 0) && (
                <div className="bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 p-3 mb-3 rounded">
                  <strong>Warning:</strong> Some fields present in the expected fields could not be found in the invoice:
                  <ul className="list-disc list-inside ml-4">
                    {results.map((r, i) =>
                      Array.isArray((r as any).missing_fields) && (r as any).missing_fields.length > 0 ? (
                        <li key={i}>
                          {(r as any).missing_fields.join(', ')}
                        </li>
                      ) : null
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
          {Array.isArray(results) ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left border border-gray-300 rounded bg-gray-50">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-black">Vendor</th>
                    <th className="px-3 py-2 text-black">Invoice #</th>
                    <th className="px-3 py-2 text-black">Invoice Date</th>
                    <th className="px-3 py-2 text-black">Due Date</th>
                    <th className="px-3 py-2 text-black">Total</th>
                    <th className="px-3 py-2 text-black">Line Items</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((inv, i) => (
                    <React.Fragment key={i}>
                      {(Array.isArray(inv.missing_fields) && inv.missing_fields.length > 0) && (
                        <tr>
                          <td colSpan={6} className="bg-yellow-100 text-yellow-900 px-3 py-2 border-t border-b border-yellow-300">
                            <strong>Missing fields:</strong> {inv.missing_fields.join(', ')}
                          </td>
                        </tr>
                      )}
                      {(Array.isArray(inv.unmatched_fields) && inv.unmatched_fields.length > 0) && (
                        <tr>
                          <td colSpan={6} className="bg-blue-100 text-blue-900 px-3 py-2 border-t border-b border-blue-300">
                            <strong>Unmatched fields:</strong> {inv.unmatched_fields.join(', ')}
                          </td>
                        </tr>
                      )}
                      <tr className="border-t border-gray-200 hover:bg-gray-100">
                        <td className="px-3 py-2 text-black">{inv.vendor ?? '-'}</td>
                        <td className="px-3 py-2 text-black">{inv.invoice_number ?? '-'}</td>
                        <td className="px-3 py-2 text-black">{inv.invoice_date ?? '-'}</td>
                        <td className="px-3 py-2 text-black">{inv.due_date ?? '-'}</td>
                        <td className="px-3 py-2 text-black">{inv.total_amount ?? '-'}</td>
                        <td className="px-3 py-2 text-black">
                          {Array.isArray(inv.line_items) && inv.line_items.length > 0 ? (
                            <details>
                              <summary className="cursor-pointer text-blue-700 hover:underline">View</summary>
                              <table className="mt-2 min-w-max bg-white border border-gray-200 rounded">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-2 py-1 text-black">Description</th>
                                    <th className="px-2 py-1 text-black">Qty</th>
                                    <th className="px-2 py-1 text-black">Unit Price</th>
                                    <th className="px-2 py-1 text-black">Line Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inv.line_items.map((li: { description?: string; quantity?: number; unit_price?: number; line_total?: number }, j: number) => (
                                    <tr key={j} className="border-t">
                                      <td className="px-2 py-1 text-black">{li.description ?? '-'}</td>
                                      <td className="px-2 py-1 text-black">{li.quantity ?? '-'}</td>
                                      <td className="px-2 py-1 text-black">{li.unit_price ?? '-'}</td>
                                      <td className="px-2 py-1 text-black">{li.line_total ?? '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </details>
                          ) : (
                            <span className="text-gray-400 text-black">None</span>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <pre className="overflow-x-auto text-xs bg-gray-100 p-2 rounded text-black">
              {JSON.stringify(results, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
