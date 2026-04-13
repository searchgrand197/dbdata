import React, { useCallback, useRef, useState } from 'react'
import { format } from 'date-fns'

function safeFormat(dateVal, fmtStr) {
  if (!dateVal) return '--/--'
  try {
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return '--/--'
    return format(d, fmtStr)
  } catch {
    return '--/--'
  }
}

function printViaIframe(htmlString) {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:210mm;height:297mm;border:none;'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument || iframe.contentWindow.document
    doc.open()
    doc.write(htmlString)
    doc.close()

    const win = iframe.contentWindow
    const cleanup = () => {
      try { document.body.removeChild(iframe) } catch { /* already removed */ }
      resolve()
    }
    win.addEventListener('afterprint', cleanup)

    const tryPrint = () => {
      try { win.focus(); win.print() } catch { /* noop */ }
      setTimeout(() => cleanup(), 8000)
    }

    if (doc.readyState === 'complete') {
      setTimeout(tryPrint, 80)
    } else {
      iframe.onload = () => setTimeout(tryPrint, 80)
    }
  })
}

function buildInvoiceHtml({ invoice, outlet }) {
  const showGst = invoice.gst_enabled !== false
  const subtotal = Number(invoice.subtotal || 0)
  const cgst = Number(invoice.cgst || 0)
  const sgst = Number(invoice.sgst || 0)
  const tax = cgst + sgst
  const grandTotal = Number(invoice.grand_total || 0)
  const items = invoice.items || []

  const biz = outlet || {}
  const title = (biz.business_name || 'Pharmacy').toUpperCase()
  const addrLines = (biz.address || '')
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean)

  const gstColCount = showGst ? 12 : 10

  const gstHeaderCols = showGst
    ? `<th style="border:1px solid #000;padding:4px 2px;text-align:center;width:6%">SGST%</th>
       <th style="border:1px solid #000;padding:4px 2px;text-align:center;width:6%">CGST%</th>`
    : ''

  const itemRows = items
    .map((it, idx) => {
      const qty = Number(it.qty || 0)
      const rate = Number(it.rate || 0)
      const mrp = Number(it.mrp ?? it.batch?.mrp ?? rate)
      const amount = qty * rate
      const sgstR = showGst ? Number(it.sgst_rate ?? 0) : 0
      const cgstR = showGst ? Number(it.cgst_rate ?? 0) : 0
      const gstCols = showGst
        ? `<td style="border:1px solid #ccc;padding:3px;text-align:center">${sgstR.toFixed(2)}</td>
           <td style="border:1px solid #ccc;padding:3px;text-align:center">${cgstR.toFixed(2)}</td>`
        : ''
      return `<tr style="border-bottom:1px solid #ddd">
        <td style="border:1px solid #ccc;padding:3px;text-align:center">${idx + 1}</td>
        <td style="border:1px solid #ccc;padding:3px;font-weight:bold;word-break:break-word">${it.medicine?.name || it.medicine_name || '—'}</td>
        <td style="border:1px solid #ccc;padding:3px;text-align:center">${it.medicine?.pack_info || it.pack_info || '—'}</td>
        <td style="border:1px solid #ccc;padding:3px;text-align:center;font-size:8px">${it.medicine?.hsn_code || it.hsn_code || '—'}</td>
        <td style="border:1px solid #ccc;padding:3px;text-align:center;font-size:8px">${it.batch?.batch_no ?? it.batch_no ?? '—'}</td>
        <td style="border:1px solid #ccc;padding:3px;text-align:center;font-size:8px">${safeFormat(it.batch?.expiry_date || it.expiry_date, 'MM/yy')}</td>
        <td style="border:1px solid #ccc;padding:3px;text-align:center">${qty}</td>
        <td style="border:1px solid #ccc;padding:3px;text-align:right">${mrp.toFixed(2)}</td>
        <td style="border:1px solid #ccc;padding:3px;text-align:right">${rate.toFixed(2)}</td>
        ${gstCols}
        <td style="border:1px solid #ccc;padding:3px;text-align:right;font-weight:bold">${amount.toFixed(2)}</td>
      </tr>`
    })
    .join('')

  const emptyRows =
    items.length < 8
      ? Array.from({ length: 8 - items.length })
          .map(
            () =>
              `<tr style="height:18px">${Array.from({ length: gstColCount })
                .map(() => `<td style="border:1px solid #ccc;padding:3px">&nbsp;</td>`)
                .join('')}</tr>`,
          )
          .join('')
      : ''

  const taxSummaryLine = showGst
    ? `Taxable ${subtotal.toFixed(2)} &middot; CGST ${cgst.toFixed(2)} &middot; SGST ${sgst.toFixed(2)} &middot; GST ${tax.toFixed(2)}`
    : `Subtotal ${subtotal.toFixed(2)} &middot; Non-GST bill (no tax)`

  const gstTotalRows = showGst
    ? `<div style="display:flex;justify-content:space-between;padding:4px 8px;border-bottom:1px solid #ccc">
         <span>CGST</span><span>${cgst.toFixed(2)}</span>
       </div>
       <div style="display:flex;justify-content:space-between;padding:4px 8px;border-bottom:1px solid #ccc">
         <span>SGST</span><span>${sgst.toFixed(2)}</span>
       </div>`
    : ''

  const headerGstInfo = showGst
    ? `${biz.gst_number ? `<div>GSTIN : ${biz.gst_number}</div>` : ''}${biz.dl_number ? `<div>D.L.NO. : ${biz.dl_number}</div>` : ''}`
    : `${biz.dl_number ? `<div>D.L.NO. : ${biz.dl_number}</div>` : ''}`

  const patientName = `${invoice.patient_details?.first_name || ''} ${invoice.patient_details?.last_name || ''}`.trim()
  const invoiceDate = safeFormat(invoice.created_at || new Date(), 'dd-MM-yyyy')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${invoice.invoice_no || ''}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
    html, body { width:100%; background:#fff; color:#000; font-family:Arial,sans-serif; font-size:10px; }
    @page { size:A4; margin:8mm; }
    @media print {
      html, body { background:#fff !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
    }
  </style>
</head>
<body>
  <div style="max-width:210mm;margin:0 auto;border:1px solid #000">

    <div style="display:flex;border-bottom:1px solid #000">
      <div style="flex:1;padding:8px 10px;border-right:1px solid #000">
        <div style="font-size:14px;font-weight:bold">${title}</div>
        <div style="font-size:8px;font-style:italic;margin-bottom:4px">${showGst ? 'GST Invoice' : 'Retail invoice'}</div>
        <div style="font-size:8px;line-height:1.5">
          ${addrLines.length > 0 ? addrLines.map((l) => `<div>${l}</div>`).join('') : '<div>&mdash;</div>'}
          ${biz.mobile ? `<div>Phone: ${biz.mobile}</div>` : ''}
          ${biz.email ? `<div>E-Mail: ${biz.email}</div>` : ''}
          ${biz.website ? `<div>Web: ${biz.website}</div>` : ''}
        </div>
        <div style="font-size:8px;margin-top:4px;line-height:1.5">${headerGstInfo}</div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;border-right:1px solid #000;padding:8px">
        <div style="font-size:16px;font-weight:bold;text-align:center">${showGst ? 'GST INVOICE' : 'INVOICE'}</div>
      </div>
      <div style="flex:1.2;padding:8px 10px;font-size:9px;line-height:1.8">
        <div><strong>Patient Name :</strong> ${patientName}</div>
        <div><strong>Patient Address :</strong> ${invoice.patient_details?.address || '—'}</div>
        <div><strong>UHID No. :</strong> ${invoice.patient_details?.uhid || '—'}</div>
        <div><strong>Dr. Name :</strong> ${invoice.referred_by || '—'}</div>
        ${showGst ? '<div><strong>GST :</strong></div>' : ''}
        <div style="display:flex;justify-content:space-between;margin-top:4px;border-top:1px solid #000;padding-top:4px">
          <span><strong>Invoice No. : ${invoice.invoice_no || ''}</strong></span>
          <span><strong>Date: ${invoiceDate}</strong></span>
        </div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:9px;table-layout:fixed">
      <thead>
        <tr style="background:#f0f0f0;border-bottom:1px solid #000;border-top:1px solid #000">
          <th style="border:1px solid #000;padding:4px 2px;text-align:center;width:4%">SN.</th>
          <th style="border:1px solid #000;padding:4px 2px;text-align:left;width:${showGst ? '22%' : '26%'}">PRODUCT NAME</th>
          <th style="border:1px solid #000;padding:4px 2px;text-align:center;width:8%">PACK</th>
          <th style="border:1px solid #000;padding:4px 2px;text-align:center;width:8%">HSN</th>
          <th style="border:1px solid #000;padding:4px 2px;text-align:center;width:10%">BATCH</th>
          <th style="border:1px solid #000;padding:4px 2px;text-align:center;width:8%">EXP.</th>
          <th style="border:1px solid #000;padding:4px 2px;text-align:center;width:6%">QTY</th>
          <th style="border:1px solid #000;padding:4px 2px;text-align:right;width:8%">MRP</th>
          <th style="border:1px solid #000;padding:4px 2px;text-align:right;width:8%">RATE</th>
          ${gstHeaderCols}
          <th style="border:1px solid #000;padding:4px 2px;text-align:right;width:${showGst ? '10%' : '14%'}">AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${emptyRows}
      </tbody>
    </table>

    <div style="border-top:1px solid #000;padding:4px 8px;font-size:8px;border-bottom:1px solid #000">
      ${taxSummaryLine}
    </div>

    <div style="display:flex;border-bottom:1px solid #000">
      <div style="flex:1;padding:8px 10px;border-right:1px solid #000;font-size:8px">
        <div style="font-weight:bold;margin-bottom:4px;text-decoration:underline">Terms &amp; Conditions</div>
        <div>Please consult the Doctor before using medicine.</div>
        <div>Medicine without batch and expiry date will not be taken back.</div>
        <div>All disputes subject to local Jurisdiction only.</div>
        <div style="margin-top:8px"><strong>Remark :</strong> ___________________________</div>
      </div>
      <div style="flex:1;padding:8px;text-align:center;border-right:1px solid #000;display:flex;flex-direction:column;justify-content:space-between">
        <div style="font-size:8px;margin-bottom:4px">For ${title}</div>
        <div>
          <div style="font-style:italic;font-weight:bold;font-size:12px;margin-bottom:8px">PHARMACIST</div>
          <div style="font-style:italic;font-size:10px">${biz.business_name || 'Pharmacy'}</div>
        </div>
        <div style="border-top:1px solid #000;padding-top:4px;font-size:8px">Authorised Signatory</div>
      </div>
      <div style="width:160px;font-size:9px">
        <div style="display:flex;justify-content:space-between;padding:4px 8px;border-bottom:1px solid #ccc">
          <span>SUB TOTAL</span><span style="font-weight:bold">${subtotal.toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:4px 8px;border-bottom:1px solid #ccc">
          <span>TOTAL DIS</span><span>0.00</span>
        </div>
        ${gstTotalRows}
        <div style="display:flex;justify-content:space-between;padding:6px 8px;background:#000;color:#fff;font-weight:bold;font-size:10px">
          <span>GRAND TOTAL</span><span>${grandTotal.toFixed(2)}</span>
        </div>
        <div style="padding:4px 8px;font-size:8px;text-align:center;font-style:italic">Computer Generated Invoice</div>
      </div>
    </div>

  </div>
</body>
</html>`
}

export default function PharmacyInvoicePrint({ invoice, outlet, onClose }) {
  const [printing, setPrinting] = useState(false)
  const hasAutoPrinted = useRef(false)

  const doPrint = useCallback(async () => {
    if (!invoice || printing) return
    setPrinting(true)
    try {
      const html = buildInvoiceHtml({ invoice, outlet })
      await printViaIframe(html)
    } catch {
      // noop
    } finally {
      setPrinting(false)
    }
  }, [invoice, outlet, printing])

  React.useEffect(() => {
    if (!invoice || hasAutoPrinted.current) return
    hasAutoPrinted.current = true
    const t = setTimeout(() => doPrint(), 300)
    return () => clearTimeout(t)
  }, [invoice, doPrint])

  if (!invoice) return null

  const showGst = invoice.gst_enabled !== false
  const subtotal = Number(invoice.subtotal || 0)
  const cgst = Number(invoice.cgst || 0)
  const sgst = Number(invoice.sgst || 0)
  const tax = cgst + sgst
  const grandTotal = Number(invoice.grand_total || 0)
  const items = invoice.items || []

  const biz = outlet || {}
  const title = (biz.business_name || 'Pharmacy').toUpperCase()
  const addrLines = (biz.address || '')
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean)

  const tableCols = showGst ? 12 : 10

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'white',
        zIndex: 9999,
        overflowY: 'auto',
        padding: '20px',
      }}
    >
      <div style={{ maxWidth: '210mm', margin: '0 auto', fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#000', border: '1px solid #000' }}>

        <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
          <div style={{ flex: 1, padding: '8px 10px', borderRight: '1px solid #000' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{title}</div>
            <div style={{ fontSize: '8px', fontStyle: 'italic', marginBottom: '4px' }}>
              {showGst ? 'GST Invoice' : 'Retail invoice'}
            </div>
            <div style={{ fontSize: '8px', lineHeight: '1.5' }}>
              {addrLines.length > 0 ? addrLines.map((line, i) => <div key={i}>{line}</div>) : <div>—</div>}
              {biz.mobile ? <div>Phone: {biz.mobile}</div> : null}
              {biz.email ? <div>E-Mail: {biz.email}</div> : null}
              {biz.website ? <div>Web: {biz.website}</div> : null}
            </div>
            {showGst ? (
              <div style={{ fontSize: '8px', marginTop: '4px', lineHeight: '1.5' }}>
                {biz.gst_number ? <div>GSTIN : {biz.gst_number}</div> : null}
                {biz.dl_number ? <div>D.L.NO. : {biz.dl_number}</div> : null}
              </div>
            ) : (
              <div style={{ fontSize: '8px', marginTop: '4px', lineHeight: '1.5' }}>
                {biz.dl_number ? <div>D.L.NO. : {biz.dl_number}</div> : null}
              </div>
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid #000', padding: '8px' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}>
              {showGst ? 'GST INVOICE' : 'INVOICE'}
            </div>
          </div>

          <div style={{ flex: 1.2, padding: '8px 10px', fontSize: '9px', lineHeight: '1.8' }}>
            <div><strong>Patient Name :</strong> {invoice.patient_details?.first_name} {invoice.patient_details?.last_name}</div>
            <div><strong>Patient Address :</strong> {invoice.patient_details?.address || '—'}</div>
            <div><strong>UHID No. :</strong> {invoice.patient_details?.uhid || '—'}</div>
            <div><strong>Dr. Name :</strong> {invoice.referred_by || '—'}</div>
            {showGst ? <div><strong>GST :</strong></div> : null}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', borderTop: '1px solid #000', paddingTop: '4px' }}>
              <span><strong>Invoice No. : {invoice.invoice_no}</strong></span>
              <span><strong>Date: {safeFormat(invoice.created_at || new Date(), 'dd-MM-yyyy')}</strong></span>
            </div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: '#f0f0f0', borderBottom: '1px solid #000', borderTop: '1px solid #000' }}>
              <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '4%' }}>SN.</th>
              <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'left', width: showGst ? '22%' : '26%' }}>PRODUCT NAME</th>
              <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '8%' }}>PACK</th>
              <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '8%' }}>HSN</th>
              <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '10%' }}>BATCH</th>
              <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '8%' }}>EXP.</th>
              <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '6%' }}>QTY</th>
              <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'right', width: '8%' }}>MRP</th>
              <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'right', width: '8%' }}>RATE</th>
              {showGst ? (
                <>
                  <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '6%' }}>SGST%</th>
                  <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '6%' }}>CGST%</th>
                </>
              ) : null}
              <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'right', width: showGst ? '10%' : '14%' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const qty = Number(it.qty || 0)
              const rate = Number(it.rate || 0)
              const mrp = Number(it.mrp ?? it.batch?.mrp ?? rate)
              const amount = qty * rate
              const sgstR = showGst ? Number(it.sgst_rate ?? 0) : 0
              const cgstR = showGst ? Number(it.cgst_rate ?? 0) : 0
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #ccc', padding: '3px', fontWeight: 'bold', wordBreak: 'break-word' }}>
                    {it.medicine?.name || it.medicine_name || '—'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'center' }}>
                    {it.medicine?.pack_info || it.pack_info || '—'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'center', fontSize: '8px' }}>
                    {it.medicine?.hsn_code || it.hsn_code || '—'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'center', fontSize: '8px' }}>
                    {it.batch?.batch_no ?? it.batch_no ?? '—'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'center', fontSize: '8px' }}>
                    {safeFormat(it.batch?.expiry_date || it.expiry_date, 'MM/yy')}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'center' }}>{qty}</td>
                  <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right' }}>{mrp.toFixed(2)}</td>
                  <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right' }}>{rate.toFixed(2)}</td>
                  {showGst ? (
                    <>
                      <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'center' }}>{sgstR.toFixed(2)}</td>
                      <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'center' }}>{cgstR.toFixed(2)}</td>
                    </>
                  ) : null}
                  <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right', fontWeight: 'bold' }}>{amount.toFixed(2)}</td>
                </tr>
              )
            })}
            {items.length < 8 && Array.from({ length: 8 - items.length }).map((_, i) => (
              <tr key={`empty-${i}`} style={{ height: '18px' }}>
                {Array.from({ length: tableCols }).map((_, j) => (
                  <td key={j} style={{ border: '1px solid #ccc', padding: '3px' }}>&nbsp;</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {showGst ? (
          <div style={{ borderTop: '1px solid #000', padding: '4px 8px', fontSize: '8px', borderBottom: '1px solid #000' }}>
            Taxable {subtotal.toFixed(2)} · CGST {cgst.toFixed(2)} · SGST {sgst.toFixed(2)} · GST {tax.toFixed(2)}
          </div>
        ) : (
          <div style={{ borderTop: '1px solid #000', padding: '4px 8px', fontSize: '8px', borderBottom: '1px solid #000' }}>
            Subtotal {subtotal.toFixed(2)} · Non-GST bill (no tax)
          </div>
        )}

        <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
          <div style={{ flex: 1, padding: '8px 10px', borderRight: '1px solid #000', fontSize: '8px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px', textDecoration: 'underline' }}>Terms & Conditions</div>
            <div>Please consult the Doctor before using medicine.</div>
            <div>Medicine without batch and expiry date will not be taken back.</div>
            <div>All disputes subject to local Jurisdiction only.</div>
            <div style={{ marginTop: '8px' }}>
              <strong>Remark :</strong> ___________________________
            </div>
          </div>

          <div style={{ flex: 1, padding: '8px', textAlign: 'center', borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '8px', marginBottom: '4px' }}>For {title}</div>
            <div>
              <div style={{ fontStyle: 'italic', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}>PHARMACIST</div>
              <div style={{ fontStyle: 'italic', fontSize: '10px' }}>{biz.business_name || 'Pharmacy'}</div>
            </div>
            <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '8px' }}>Authorised Signatory</div>
          </div>

          <div style={{ width: '160px', fontSize: '9px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>
              <span>SUB TOTAL</span><span style={{ fontWeight: 'bold' }}>{subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>
              <span>TOTAL DIS</span><span>0.00</span>
            </div>
            {showGst ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>
                  <span>CGST</span><span>{cgst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>
                  <span>SGST</span><span>{sgst.toFixed(2)}</span>
                </div>
              </>
            ) : null}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#000', color: '#fff', fontWeight: 'bold', fontSize: '10px' }}>
              <span>GRAND TOTAL</span><span>{grandTotal.toFixed(2)}</span>
            </div>
            <div style={{ padding: '4px 8px', fontSize: '8px', textAlign: 'center', fontStyle: 'italic' }}>
              Computer Generated Invoice
            </div>
          </div>
        </div>

      </div>

      <div style={{ textAlign: 'center', marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={doPrint}
          disabled={printing}
          style={{ background: '#16a34a', color: 'white', border: 'none', padding: '10px 28px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
        >
          {printing ? 'Printing…' : '🖨 Print Invoice'}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{ background: '#1e40af', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
        >
          ✕ Close Preview
        </button>
      </div>
    </div>
  )
}
