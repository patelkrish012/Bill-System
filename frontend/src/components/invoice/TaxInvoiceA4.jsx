import React from 'react';
import { formatINR, numberToIndianWords } from '../../utils/formatters';

export default function TaxInvoiceA4({ bill, isPreview = false }) {
  if (!bill) return null;

  // Snapshot or fallback data
  const businessName = bill.business_name_snap || 'KRISH AGRICULTURE';
  const tagline = bill.tagline_snap || 'SALES | SERVICE | SPARE PARTS';
  const businessGSTIN = bill.gstin_snap || '24AVCPP4549E1ZN';
  const mobile = bill.mobile_snap || '94297 62695';
  const email = bill.email_snap || 'krishagriculturehmt@gmail.com';
  const address = bill.address_snap || 'Gelexy Plaza, Idar himatnagar Highway Road, Daramali -383110. S.K. (Guj.)';
  const logoPath = bill.logo_path_snap || '/krish_logo.png';

  // Bank Details (Parsed from snapshot JSON or object)
  let bankDetails = null;
  try {
    bankDetails = typeof bill.bank_details_snap === 'string' 
      ? JSON.parse(bill.bank_details_snap) 
      : (bill.bank_details_snap || bill.parsed_bank);
  } catch (e) {
    bankDetails = bill.parsed_bank || null;
  }

  // Terms & Conditions (Parsed from snapshot JSON or array)
  let termsList = [];
  try {
    termsList = typeof bill.terms_snap === 'string'
      ? JSON.parse(bill.terms_snap)
      : (bill.terms_snap || bill.parsed_terms || []);
  } catch (e) {
    termsList = bill.parsed_terms || [];
  }

  if (!termsList || termsList.length === 0) {
    termsList = [
      'Payment : 50% Advance with Purchase Order.',
      'Delivery : With 10-15 days',
      'Taxes : Inclusive of all the taxes.',
      'Quot : Validity 30 Days',
      'Payment Mode type cheque/dd..',
      'All Disputes Subject to Himatnagar Juridiction'
    ];
  }

  const items = bill.items || [];
  const words = bill.amount_in_words || numberToIndianWords(bill.net_total);

  return (
    <div
      id="printable-invoice-area"
      className={`bg-white text-black text-sm mx-auto shadow-2xl print:shadow-none print:m-0 print:border-none border-2 border-black font-sans leading-tight ${
        isPreview ? 'max-w-[794px] p-4 scale-95 origin-top' : 'w-full max-w-[820px] p-6'
      }`}
      style={{ minHeight: '1120px' }}
    >
      {/* 1. TOP BAR: Mobile (left) & TAX INVOICE (center) */}
      <div className="flex justify-between items-center pb-1 border-b border-black">
        <div className="text-xs font-bold tracking-wider">
          Mo. {mobile}
        </div>
        <div className="text-base font-extrabold uppercase tracking-widest text-center flex-1 pr-16">
          TAX INVOICE
        </div>
      </div>

      {/* 2. HEADER: LOGO, BUSINESS NAME, TAGLINE, GSTIN */}
      <div className="py-2 flex flex-col items-center justify-center relative">
        <div className="flex items-center justify-center gap-4">
          <img
            src={logoPath}
            alt="KRISH AGRICULTURE LOGO"
            className="h-16 w-auto object-contain"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/krish_logo.png';
            }}
          />
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-neutral-900 font-serif">
              {businessName}
            </h1>
            <p className="text-xs md:text-sm font-bold tracking-widest text-neutral-800 mt-0.5">
              {tagline}
            </p>
          </div>
        </div>

        {/* Business GSTIN positioned clearly at top/header */}
        <div className="w-full flex justify-start mt-2">
          <span className="text-xs font-extrabold uppercase tracking-wider">
            GSTIN : <span className="font-mono">{businessGSTIN}</span>
          </span>
        </div>
      </div>

      {/* 3. BUSINESS ADDRESS & CONTACT BANNER (In bordered box) */}
      <div className="border border-black py-1 px-2 text-center text-[11px] font-semibold tracking-wide bg-neutral-50 print:bg-transparent">
        {address} E- {email}
      </div>

      {/* 4. CUSTOMER & BILL INFO (2 Columns) */}
      <div className="grid grid-cols-12 border-x border-b border-black">
        {/* Left Column: Customer Details (7 cols) */}
        <div className="col-span-7 p-2 border-r border-black flex flex-col justify-start">
          <div className="font-bold text-xs uppercase mb-1">To,</div>
          <div className="font-bold text-sm text-neutral-950 font-serif">
            {bill.customer_name}
          </div>
          {bill.customer_address && (
            <div className="text-xs text-neutral-800 mt-0.5 whitespace-pre-line">
              {bill.customer_address}
            </div>
          )}
          {(bill.customer_village || bill.customer_taluka || bill.customer_district) && (
            <div className="text-xs text-neutral-700 mt-0.5">
              {[
                bill.customer_village ? `ગામ:-${bill.customer_village}` : '',
                bill.customer_taluka ? `તા:-${bill.customer_taluka}` : '',
                bill.customer_district ? `જી:-${bill.customer_district}` : ''
              ].filter(Boolean).join(' ')}
            </div>
          )}
          {bill.customer_mobile && (
            <div className="text-xs text-neutral-800 mt-0.5">
              <span className="font-semibold">Mo.:</span> {bill.customer_mobile}
            </div>
          )}
          {bill.customer_gstin && (
            <div className="text-xs font-bold text-neutral-900 mt-1">
              Customer GSTIN: <span className="font-mono">{bill.customer_gstin}</span>
            </div>
          )}
        </div>

        {/* Right Column: Bill No & Date (5 cols) */}
        <div className="col-span-5 p-2 flex flex-col justify-between">
          <div className="flex justify-between items-center py-1">
            <span className="font-bold text-xs uppercase">Bill No. :</span>
            <span className="font-black text-sm font-mono tracking-wider">
              {bill.bill_number}
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-t border-neutral-300">
            <span className="font-bold text-xs uppercase">Date :</span>
            <span className="font-bold text-xs font-mono">
              {bill.bill_date}
            </span>
          </div>
        </div>
      </div>

      {/* 5. MAIN INVOICE ITEMS TABLE */}
      <div className="border-x border-b border-black">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-black bg-neutral-100 print:bg-transparent font-bold text-center">
              <th className="py-1 px-1 border-r border-black w-8">No.</th>
              <th className="py-1 px-2 border-r border-black text-left">Description</th>
              <th className="py-1 px-1 border-r border-black w-12">Qty.</th>
              <th className="py-1 px-2 border-r border-black w-24">Rate</th>
              <th className="py-1 px-1 border-r border-black w-14">SGST</th>
              <th className="py-1 px-1 border-r border-black w-14">CGST</th>
              <th className="py-1 px-2 text-right w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const lines = item.description_text ? item.description_text.split('\n') : [];
              return (
                <tr key={idx} className="align-top border-b border-neutral-200 last:border-b-0">
                  <td className="py-2 px-1 border-r border-black text-center font-bold">
                    {String(idx + 1).padStart(2, '0')}
                  </td>
                  <td className="py-2 px-2 border-r border-black">
                    <div className="font-bold text-neutral-900 text-sm">
                      {item.item_name}
                    </div>
                    {lines.length > 0 ? (
                      <div className="text-[11px] text-neutral-800 space-y-0.5 mt-1 font-sans">
                        {lines.map((line, lIdx) => (
                          <div key={lIdx}>{line}</div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-neutral-700 space-y-0.5 mt-0.5">
                        {item.model && <div>Model: {item.model}</div>}
                        {item.capacity && <div>Capacity: {item.capacity}</div>}
                        {item.serial_no && <div>S.R. No.: {item.serial_no}</div>}
                        {item.unique_code && <div>Unique Code: {item.unique_code}</div>}
                        {item.mf_year && <div>MF Year: {item.mf_year}</div>}
                        {item.company && <div>Company: {item.company}</div>}
                        {item.hsn_code && <div>HSN: {item.hsn_code}</div>}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-1 border-r border-black text-center font-semibold">
                    {String(item.qty).padStart(2, '0')}
                  </td>
                  <td className="py-2 px-2 border-r border-black text-right font-mono">
                    {Number(item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-1 border-r border-black text-center font-mono text-[11px]">
                    {item.sgst_pct ? `${item.sgst_pct}%` : ''}
                  </td>
                  <td className="py-2 px-1 border-r border-black text-center font-mono text-[11px]">
                    {item.cgst_pct ? `${item.cgst_pct}%` : ''}
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold">
                    {Number(item.total_amount || (item.qty * item.rate)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}

            {/* Fill space so table retains A4 proportions even with 1 or 2 items */}
            {items.length < 3 && (
              <tr style={{ height: items.length === 1 ? '160px' : '90px' }}>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 6. BOTTOM SECTION: TERMS & CONDITIONS (LEFT) vs TOTALS (RIGHT) */}
      <div className="grid grid-cols-12 border-x border-b border-black">
        {/* Left: Terms & Conditions */}
        <div className="col-span-7 p-2 border-r border-black flex flex-col justify-between">
          <div>
            <div className="font-extrabold text-xs uppercase tracking-wide mb-1.5 border-b border-neutral-300 pb-0.5">
              TERM & CONDITION :
            </div>
            <ul className="text-[11px] text-neutral-800 space-y-1">
              {termsList.map((term, tIdx) => (
                <li key={tIdx} className="leading-snug">
                  {term}
                </li>
              ))}
            </ul>
          </div>

          {bill.notes && (
            <div className="mt-3 pt-2 border-t border-neutral-200 text-[10px] text-neutral-600 italic">
              Note: {bill.notes}
            </div>
          )}
        </div>

        {/* Right: Subtotal, SGST, CGST, IGST, R.OFF, Ot. Add, Net Total */}
        <div className="col-span-5 text-xs">
          <div className="flex justify-between py-1 px-2 border-b border-black font-semibold">
            <span className="uppercase">TOTAL</span>
            <span className="font-mono">
              {Number(bill.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between py-1 px-2 border-b border-neutral-300">
            <span className="font-medium">SGST</span>
            <span className="font-mono">
              {bill.sgst_amount ? Number(bill.sgst_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
            </span>
          </div>

          <div className="flex justify-between py-1 px-2 border-b border-neutral-300">
            <span className="font-medium">CGST</span>
            <span className="font-mono">
              {bill.cgst_amount ? Number(bill.cgst_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
            </span>
          </div>

          <div className="flex justify-between py-1 px-2 border-b border-neutral-300">
            <span className="font-medium">IGST</span>
            <span className="font-mono">
              {bill.igst_amount ? Number(bill.igst_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
            </span>
          </div>

          <div className="flex justify-between py-1 px-2 border-b border-neutral-300">
            <span className="font-medium">R.OFF</span>
            <span className="font-mono">
              {bill.round_off ? Number(bill.round_off).toFixed(2) : ''}
            </span>
          </div>

          <div className="flex justify-between py-1 px-2 border-b border-black">
            <span className="font-medium">Ot. Add.</span>
            <span className="font-mono">
              {bill.other_charges ? Number(bill.other_charges).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
            </span>
          </div>

          <div className="flex justify-between py-2 px-2 bg-neutral-100 print:bg-transparent font-black text-sm">
            <span className="uppercase">Net. Total</span>
            <span className="font-mono text-base">
              ₹{Number(bill.net_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 7. AMOUNT IN WORDS */}
      <div className="border-x border-b border-black py-1.5 px-2 text-xs">
        <span className="font-bold uppercase tracking-wide">Amount in words : </span>
        <span className="font-semibold capitalize font-serif text-[13px]">
          {words}
        </span>
      </div>

      {/* 8. BANK DETAILS */}
      <div className="border-x border-b border-black py-2 px-2 text-xs">
        <div className="font-bold underline uppercase tracking-wide mb-1">
          Bank Details :
        </div>
        {bankDetails ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-4 text-[11px] text-neutral-800">
            {bankDetails.bank_name && (
              <div><span className="font-semibold">Bank Name:</span> {bankDetails.bank_name}</div>
            )}
            {bankDetails.account_holder && (
              <div><span className="font-semibold">A/C Holder:</span> {bankDetails.account_holder}</div>
            )}
            {bankDetails.account_number && (
              <div><span className="font-semibold">A/C No.:</span> <span className="font-mono font-bold">{bankDetails.account_number}</span></div>
            )}
            {bankDetails.ifsc_code && (
              <div><span className="font-semibold">IFSC Code:</span> <span className="font-mono font-bold">{bankDetails.ifsc_code}</span></div>
            )}
            {bankDetails.branch && (
              <div><span className="font-semibold">Branch:</span> {bankDetails.branch}</div>
            )}
            {bankDetails.upi_id && (
              <div><span className="font-semibold">UPI ID:</span> <span className="font-mono">{bankDetails.upi_id}</span></div>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-neutral-500 italic">No bank details attached.</div>
        )}
      </div>

      {/* 9. SIGNATURE FOOTER */}
      <div className="pt-10 pb-4 flex justify-end">
        <div className="text-right">
          <div className="h-12 flex items-center justify-end pr-4">
            {/* Stamp / Signature placeholder */}
            <div className="text-[10px] text-neutral-400 italic">
              Authorized Signature
            </div>
          </div>
          <div className="font-black text-sm uppercase tracking-wider text-neutral-900 border-t border-neutral-400 pt-1 pr-2">
            For, {businessName}
          </div>
        </div>
      </div>
    </div>
  );
}
