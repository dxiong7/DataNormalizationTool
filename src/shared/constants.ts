// Shared constants for invoice parsing and UI
export const DEFAULT_SET_EXPECTED_FIELDS = [
  { key: 'vendor', label: 'Vendor', desc: 'Name of the invoice issuer/company' },
  { key: 'invoice_number', label: 'Invoice #', desc: 'Unique invoice identifier' },
  { key: 'invoice_date', label: 'Invoice Date', desc: 'Date the invoice was issued' },
  { key: 'due_date', label: 'Due Date', desc: 'Date payment is due' },
  { key: 'tax', label: 'Tax', desc: 'Tax amount on the invoice' },
  { key: 'fees', label: 'Fees', desc: 'Any additional fees' },
  { key: 'total_amount', label: 'Total Amount', desc: 'Total amount due' },
  { key: 'line_items', label: 'Line Items', desc: 'List of billed items/services' },
];
