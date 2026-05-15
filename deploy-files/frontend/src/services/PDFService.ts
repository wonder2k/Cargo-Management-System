import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { pinyin } from 'pinyin-pro';
import { Booking, Warehouse } from '../types';

const localize = (text: string | null | undefined): string => {
  if (!text) return "";
  try {
    const halfWidth = text.replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).replace(/　/g, ' ');
    if (/^[\x00-\x7F]*$/.test(halfWidth)) return halfWidth;
    return halfWidth.replace(/[一-龥]+/g, (match) => pinyin(match, { toneType: 'none' }) + " ").replace(/\s+/g, ' ').trim();
  } catch {
    return text.replace(/[^\x00-\x7F]/g, '').trim();
  }
};

// Text labels based on language
const TXT = (lang: 'en' | 'zh', key: string): string => {
  const labels: Record<string, { en: string; zh: string }> = {
    quotation: { en: 'AIR FREIGHT QUOTATION', zh: '空运报价单' },
    proposal: { en: 'AIR FREIGHT PROPOSAL', zh: '空运报价方案' },
    quoteNo: { en: 'Quote No', zh: '报价单号' },
    date: { en: 'Date', zh: '日期' },
    validUntil: { en: 'Valid Until', zh: '有效期至' },
    preparedFor: { en: 'PREPARED FOR', zh: '报价对象' },
    dest: { en: 'Destination', zh: '目的站' },
    origin: { en: 'Origin', zh: '始发站' },
    carrier: { en: 'Carrier', zh: '航司' },
    breakdown: { en: 'Breakdown', zh: '费用明细' },
    finalPrice: { en: 'Final Price', zh: '最终单价' },
    contact: { en: 'Contact', zh: '联系人' },
    phone: { en: 'Phone', zh: '电话' },
    terms: { en: 'Notes & Terms', zh: '条款说明' },
    term1: { en: 'Rates are subject to space availability at time of booking.', zh: '运价以订舱时的舱位情况为准。' },
    term2: { en: 'Volumetric calculations apply (1:6000 ratio).', zh: '体积重量按 1:6000 计算。' },
    term3: { en: 'Rates valid for general cargo only unless specified.', zh: '除非特别说明，报价仅适用于普货。' },
    term4: { en: 'Final charges based on actual weight/dim as per carrier SLI.', zh: '最终费用按航司分单上的实际重量/尺寸计算。' },
    autoGen: { en: 'This is a computer-generated proposal. No signature required.', zh: '本报价单由系统自动生成，无需签名。' },
  };
  return labels[key]?.[lang] || key;
};

export const PDFService = {
  generateProposal: (quotation: any, customer: any, profile: any, lang: 'en' | 'zh' = 'en') => {
    const doc = new jsPDF();

    // Try to embed logo
    try {
      const logoUrl = profile?.avatarUrl || profile?.logoUrl;
      if (logoUrl) {
        doc.addImage(logoUrl, 'PNG', 20, 10, 35, 15);
      }
    } catch { /* logo optional */ }

    // Company header (right side)
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(localize(profile?.companyName) || 'CargoSystem Global', doc.internal.pageSize.width - 20, 12, { align: 'right' });
    doc.setFontSize(8);
    doc.text(`${TXT(lang, 'contact')}: ${localize(profile?.contactPerson || profile?.displayName || profile?.name)}`, doc.internal.pageSize.width - 20, 17, { align: 'right' });
    doc.text(`${TXT(lang, 'phone')}: ${profile?.phone || '-'}`, doc.internal.pageSize.width - 20, 22, { align: 'right' });
    doc.text(`Email: ${profile?.email || ''}`, doc.internal.pageSize.width - 20, 27, { align: 'right' });

    // Title
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text(TXT(lang, 'quotation'), doc.internal.pageSize.width / 2, 45, { align: 'center' });

    // Info box
    doc.setFillColor(248, 250, 252);
    doc.rect(20, 55, 170, 35, 'F');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`${TXT(lang, 'quoteNo')}: ${quotation.quotationNo}`, 25, 65);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`${TXT(lang, 'date')}: ${dayjs().format('YYYY-MM-DD')}`, 25, 72);
    doc.text(`${TXT(lang, 'validUntil')}: ${quotation.validUntil}`, 25, 79);
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(TXT(lang, 'preparedFor'), 110, 65);
    doc.setFontSize(11);
    doc.text(localize(quotation.customerName || customer?.name) || 'Valued Client', 110, 72);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const recipientLines = quotation.recipientInfo ? quotation.recipientInfo.split('\n') : [];
    recipientLines.forEach((line: string, i: number) => {
      doc.text(localize(line), 110, 78 + (i * 4));
    });

    // Routes table
    const headRow = [[TXT(lang, 'origin'), TXT(lang, 'dest'), TXT(lang, 'carrier'), TXT(lang, 'breakdown'), TXT(lang, 'finalPrice')]];
    const bodyRows = quotation.routes.map((r: any) => {
      const customs = r.customsMethods?.['formal'] || r.customs;
      const miscText = (r.miscFees || []).map((m: any) => `${m.name}: ${m.amount} (${m.unit === 'per_kg' ? 'KG' : 'Ship'})`).join('\n');
      const freightVal = Number(r.finalPrice) || 0;
      const fuelVal = Number(r.fuel) || 0;
      const secVal = Number(r.security) || 0;
      const termVal = Number(r.terminal) || 0;
      const cusVal = Number(customs?.amount) || 0;
      const miskKgSum = (r.miscFees || []).reduce((sum: number, m: any) => m.unit === 'per_kg' ? sum + (Number(m.amount) || 0) : sum, 0);
      const freightPart = freightVal - fuelVal - secVal - termVal - (customs?.unit === 'per_kg' ? cusVal : 0) - miskKgSum;

      return [
        r.origin,
        r.destination,
        r.carrier,
        `Freight: ${freightPart.toFixed(2)}\nFuel: ${fuelVal}\nSec: ${secVal}\nTerm: ${termVal}\nCus: ${cusVal} (${customs?.unit === 'per_kg' ? 'KG' : 'Ship'})\n${miscText}`,
        `${quotation.currency} ${freightVal.toFixed(2)} / KG` + (r.flatFees > 0 ? `\n+ ${quotation.currency} ${r.flatFees} (Flat)` : ''),
      ];
    });

    autoTable(doc, {
      startY: 100,
      head: headRow,
      body: bodyRows,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42] },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      columnStyles: {
        3: { fontStyle: 'italic', fontSize: 6 },
        4: { halign: 'right', fontStyle: 'bold' },
      },
      didDrawCell: (data: any) => {
        if (data.column.index === 3 && data.cell.section === 'body') {
          const { cell, doc } = data;
          const text = cell.text ? cell.text.join('\n') : '';
          const lines = text.split('\n');
          if (lines.length > 0) {
            const fill = cell.styles.fillColor;
            doc.setFillColor(Array.isArray(fill) ? fill[0] : 255, Array.isArray(fill) ? fill[1] : 255, Array.isArray(fill) ? fill[2] : 255);
            doc.rect(cell.x + 0.1, cell.y + 0.1, cell.width - 0.2, cell.height - 0.2, 'F');
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(25, 118, 210);
            doc.text(lines[0] || '', cell.x + 2, cell.y + 4.5);
            doc.setFontSize(6);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100, 116, 139);
            for (let i = 1; i < lines.length; i++) {
              doc.text(lines[i] || '', cell.x + 2, cell.y + 5.5 + (i * 3));
            }
          }
        }
      },
    });

    // Terms
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(TXT(lang, 'terms'), 20, finalY);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    [TXT(lang, 'term1'), TXT(lang, 'term2'), TXT(lang, 'term3'), TXT(lang, 'term4')].forEach((term, i) => {
      doc.text(term, 20, finalY + 7 + (i * 5));
    });
    doc.setFontSize(8);
    doc.text(TXT(lang, 'autoGen'), doc.internal.pageSize.width / 2, 285, { align: 'center' });

    doc.save(`${quotation.quotationNo}_${localize(quotation.customerName)}.pdf`);
  },

  // HTML-based printable quote — handles Chinese text natively via browser
  printQuote: (quotation: any, customer: any, profile: any, lang: 'en' | 'zh' = 'en') => {
    const isZH = lang === 'zh';

    // Logo: use absolute URL + inline SVG fallback
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const avatarPath = profile?.avatarUrl || '';
    const logoAbsUrl = avatarPath.startsWith('/') ? baseUrl + avatarPath : avatarPath;
    const logoHtml = logoAbsUrl
      ? `<img src="${logoAbsUrl}" style="max-height:48px;max-width:160px;object-fit:contain;"
          onerror="this.outerHTML='<div style=\\'font-size:18px;font-weight:700;color:#1e3a5f;\\'>JCargo</div>'" />`
      : '<div style="font-size:18px;font-weight:700;color:#1e3a5f;">JCargo</div>';

    const routeRows = quotation.routes.map((r: any) => {
      const freightVal = Number(r.finalPrice) || 0;
      const fuelVal = Number(r.fuel) || 0;
      const secVal = Number(r.security) || 0;
      const termVal = Number(r.terminal) || 0;
      const miskKgSum = (r.miscFees || []).reduce((s: number, m: any) => m.unit === 'per_kg' ? s + (Number(m.amount) || 0) : s, 0);
      const freightPart = freightVal - fuelVal - secVal - termVal - miskKgSum;
      const perKgTotal = Math.max(freightPart, 0) + fuelVal + secVal + termVal + miskKgSum;
      const flatTotal = r.flatFees || 0;

      // Left column: base charges (per-KG)
      const leftItems: string[] = [];
      const row = (label: string, val: number) =>
        `<div style="display:flex;justify-content:space-between;gap:8px;font-size:10px;line-height:1.7">
          <span style="color:#475569">${label}</span>
          <span style="font-family:monospace;font-weight:600;text-align:right">${val.toFixed(2)}</span>
        </div>`;
      leftItems.push(row(isZH ? '运费' : 'Freight', freightPart));
      if (fuelVal > 0) leftItems.push(row(isZH ? '燃油附加' : 'Fuel', fuelVal));
      if (secVal > 0) leftItems.push(row(isZH ? '安检费' : 'Security', secVal));
      if (termVal > 0) leftItems.push(row(isZH ? '地勤费' : 'Terminal', termVal));
      if (miskKgSum > 0) leftItems.push(row(isZH ? '杂费(KG)' : 'Misc(KG)', miskKgSum));

      // Right column: customs methods (per-route)
      const customsMap = r.customsMethods || {};
      const allMethods = ['formal', '9610', '9710', '9810'];
      const rightItems: string[] = [];
      rightItems.push(`<div style="font-size:9px;font-weight:700;color:#64748b;margin-bottom:2px">${isZH ? '报关费(按需选一)' : 'Customs (select one)'}</div>`);
      allMethods.forEach(k => {
        const m = customsMap[k];
        if (m && Number(m.amount) > 0) {
          const unitLabel = m.unit === 'per_kg' ? '/KG' : '/Ship';
          rightItems.push(
            `<div style="display:flex;justify-content:space-between;gap:8px;font-size:9px;line-height:1.6">
              <span style="font-weight:600;color:#1e293b">${k.toUpperCase()}</span>
              <span style="font-family:monospace;text-align:right">${quotation.currency} ${Number(m.amount).toFixed(2)} ${unitLabel}</span>
            </div>`
          );
        }
      });

      return `<tr>
        <td style="padding:7px 8px;border:1px solid #e2e8f0;font-family:monospace;font-size:12px;font-weight:700;text-align:center;color:#1e293b">${r.origin}</td>
        <td style="padding:7px 8px;border:1px solid #e2e8f0;font-family:monospace;font-size:12px;font-weight:700;text-align:center;color:#1e293b">${r.destination}</td>
        <td style="padding:7px 8px;border:1px solid #e2e8f0;font-weight:600;font-size:12px;text-align:center">${r.carrier}</td>
        <td style="padding:7px 8px;border:1px solid #e2e8f0;font-size:0">
          <div style="display:flex;">
            <div style="flex:1;padding-right:6px;">${leftItems.join('')}</div>
            <div style="width:1px;background:#e2e8f0;margin:2px 0"></div>
            <div style="flex:1;padding-left:6px;">${rightItems.join('')}</div>
          </div>
        </td>
        <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:right;font-weight:700;color:#2563eb;font-size:13px">
          ${quotation.currency} ${perKgTotal.toFixed(2)}<span style="font-size:10px;font-weight:400;color:#64748b"> /KG</span>
          ${flatTotal > 0 ? `<br/><span style="font-size:10px;color:#d97706">+ ${quotation.currency} ${flatTotal.toFixed(2)}<span style="font-weight:400"> /Shipment</span></span>` : ''}
        </td>
      </tr>`;
    }).join('');

    const terms = isZH
      ? ['运价以订舱时的舱位情况为准。', '体积重量按 1:6000 计算。', '除非特别说明，报价仅适用于普货。', '最终费用按航司分单上的实际重量/尺寸计算。']
      : ['Rates are subject to space availability at time of booking.', 'Volumetric calculations apply (1:6000 ratio).',
         'Rates valid for general cargo only unless specified.', 'Final charges based on actual weight/dim as per carrier SLI.'];

    // Calculate totals
    const totalKg = quotation.routes.reduce((s: number, r: any) => s + (Number(r.finalPrice) || 0), 0);
    const totalFlat = quotation.routes.reduce((s: number, r: any) => s + (Number(r.flatFees) || 0), 0);

    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><title>${quotation.quotationNo}</title>
<style>
  @page { size: A4; margin: 10mm 10mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; margin: 0; padding: 0; font-size: 12px; line-height: 1.5; }

  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 14px; }
  .company-info { text-align: right; font-size: 11px; color: #475569; }
  .company-info .name { font-size: 16px; font-weight: 700; color: #1e3a5f; }
  .company-info .detail { margin-top: 2px; }

  .title-wrap { text-align: center; margin: 8px 0 18px; }
  .title-wrap .main { font-size: 20px; font-weight: 700; color: #2563eb; letter-spacing: 0.04em; }
  .title-wrap .sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }

  .info-row { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; margin-bottom: 16px; }
  .info-row .col { }
  .info-row .label { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
  .info-row .value { font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 2px; }
  .info-row .value-sm { font-size: 11px; color: #64748b; margin-top: 1px; }
  .info-row .num { font-family: 'Courier New', monospace; font-size: 14px; font-weight: 700; color: #2563eb; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th { background: #1e293b; color: #fff; padding: 7px 6px; font-size: 10px; text-align: center; letter-spacing: 0.04em; text-transform: uppercase; }
  td { padding: 6px; border: 1px solid #e2e8f0; font-size: 11px; vertical-align: top; }
  tr:nth-child(even) { background: #fafbfc; }

  .summary { display: flex; justify-content: flex-end; gap: 20px; margin-bottom: 20px; padding: 10px 14px; background: #f0f4ff; border: 1px solid #dbeafe; }
  .summary .item { text-align: right; }
  .summary .lbl { font-size: 9px; color: #64748b; text-transform: uppercase; }
  .summary .val { font-size: 15px; font-weight: 700; color: #2563eb; }

  .terms-box { border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 10px; }
  .terms-box .title { font-size: 10px; font-weight: 700; color: #475569; margin-bottom: 6px; }
  .terms-box .item { font-size: 9px; color: #94a3b8; margin: 2px 0; padding-left: 10px; }

  .footer-line { text-align: center; font-size: 9px; color: #cbd5e1; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
</style></head>
<body>

  <!-- Header -->
  <div class="header">
    <div style="display:flex;align-items:center;gap:10px;">
      ${logoHtml || '<div style="font-size:18px;font-weight:700;color:#1e3a5f;">JCargo</div>'}
    </div>
    <div class="company-info">
      <div class="name">${profile?.companyName || 'CargoSystem Global'}</div>
      <div class="detail">${isZH?'联系人':'Contact'}: ${profile?.contactPerson || profile?.name || '-'}</div>
      <div class="detail">${isZH?'电话':'Tel'}: ${profile?.phone || '-'} | Email: ${profile?.email || ''}</div>
    </div>
  </div>

  <!-- Title -->
  <div class="title-wrap">
    <div class="main">${isZH ? '空运报价单' : 'AIR FREIGHT QUOTATION'}</div>
    <div class="sub">${isZH ? '报价单号' : 'Quote No'}. ${quotation.quotationNo}  |  ${dayjs().format('YYYY-MM-DD')}</div>
  </div>

  <!-- Info -->
  <div class="info-row">
    <div class="col">
      <div class="label">${isZH ? '报价对象' : 'CLIENT'}</div>
      <div class="value">${quotation.customerName}</div>
      <div class="value-sm" style="white-space:pre-wrap">${quotation.recipientInfo || ''}</div>
    </div>
    <div class="col" style="text-align:right">
      <div class="label">${isZH ? '有效期至' : 'VALID UNTIL'}</div>
      <div class="num">${quotation.validUntil}</div>
      <div class="value-sm">${isZH ? '币种' : 'Currency'}: ${quotation.currency}</div>
    </div>
  </div>

  <!-- Routes table -->
  <table>
    <thead><tr>
      <th style="width:12%;background:#1e293b;color:#fff;padding:9px 6px;font-size:12px;font-weight:700;text-align:center;letter-spacing:0.03em;text-transform:uppercase;">${isZH ? '始发站' : 'ORIGIN'}</th>
      <th style="width:12%;background:#1e293b;color:#fff;padding:9px 6px;font-size:12px;font-weight:700;text-align:center;letter-spacing:0.03em;text-transform:uppercase;">${isZH ? '目的站' : 'DEST'}</th>
      <th style="width:14%;background:#1e293b;color:#fff;padding:9px 6px;font-size:12px;font-weight:700;text-align:center;letter-spacing:0.03em;text-transform:uppercase;">${isZH ? '航司' : 'CARRIER'}</th>
      <th style="background:#1e293b;color:#fff;padding:9px 6px;font-size:12px;font-weight:700;text-align:center;letter-spacing:0.03em;text-transform:uppercase;">${isZH ? '费用明细' : 'BREAKDOWN'}</th>
      <th style="width:20%;background:#1e293b;color:#fff;padding:9px 6px;font-size:12px;font-weight:700;text-align:center;letter-spacing:0.03em;text-transform:uppercase;">${isZH ? '单价' : 'UNIT PRICE'}</th>
    </tr></thead>
    <tbody>${routeRows}</tbody>
  </table>

  <!-- Summary -->
  <div class="summary">
    <div class="item">
      <div class="lbl">${isZH ? '路线数' : 'Routes'}</div>
      <div class="val" style="font-size:13px">${quotation.routes.length}</div>
    </div>
    <div class="item">
      <div class="lbl">${isZH ? '平均运价/KG' : 'Avg Rate/KG'}</div>
      <div class="val">${quotation.currency} ${(totalKg / (quotation.routes.length || 1)).toFixed(2)}</div>
    </div>
    ${totalFlat > 0 ? `
    <div class="item">
      <div class="lbl">${isZH ? '按票费用' : 'Flat Fees'}</div>
      <div class="val">${quotation.currency} ${totalFlat.toFixed(2)}</div>
    </div>` : ''}
  </div>

  <!-- Terms -->
  <div class="terms-box">
    <div class="title">${isZH ? '条款说明' : 'TERMS & CONDITIONS'}</div>
    ${terms.map(t => `<div class="item">- ${t}</div>`).join('')}
  </div>

  <div class="footer-line">${isZH ? '本报价单由 JCargo 系统自动生成，无需签名。' : 'This quotation is auto-generated by JCargo CMS. No signature required.'}</div>

</body></html>`;

    // Open in new window for print
    const win = window.open('', '_blank');
    if (!win) { /* popup blocked */ return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  },

  generateInvoice: (invoice: any, customer: any, mawb?: any) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('INVOICE', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('CargoSystem Logistics', 20, 40);
    doc.text('123 Logistics Way', 20, 45);
    doc.text('Shanghai, China', 20, 50);
    doc.text(`Invoice No: ${invoice.invoiceNo}`, 140, 40);
    doc.text(`Date: ${dayjs(invoice.createdAt).format('YYYY-MM-DD')}`, 140, 45);
    doc.text(`Due Date: ${dayjs(invoice.dueDate).format('YYYY-MM-DD')}`, 140, 50);
    doc.setFontSize(12);
    doc.text('BILL TO:', 20, 70);
    doc.setFontSize(10);
    doc.text(localize(customer?.name), 20, 75);
    doc.text(customer?.email || '', 20, 80);

    const head = [['Date', 'Reference / Route', 'PCK', 'GW', 'Breakdown', 'Amount']];
    let body: any[] = [];
    if (invoice.lineItems?.length > 0) {
      body = invoice.lineItems.map((item: any) => {
        const cw = item.chargeableWeight || 0;
        const customs = item.customsClearance;
        const miscText = (item.miscFees || []).map((m: any) => `${m.name}: ${m.amount} (${m.unit === 'per_kg' ? 'KG' : 'Ship'})`).join('\n');
        const fuelVal = Number(item.fuelSurcharge) || 0;
        const secVal = Number(item.securityScreening) || 0;
        const termVal = Number(item.terminalHandling) || 0;
        const cusVal = Number(customs?.amount) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const breakdown = `Freight: ${unitPrice.toFixed(2)}/kg\nFuel: ${fuelVal}/kg\nSec: ${secVal}/kg\nTerm: ${termVal}/kg\nCus: ${cusVal} (${customs?.unit === 'per_kg' ? 'KG' : 'Ship'})\n${miscText}`;
        return [
          item.flightDate ? new Date(item.flightDate).toLocaleDateString() : '-',
          `${item.reference || 'N/A'}\n${localize(item.description)}\nDec: ${item.declarationMethod || '-'}`,
          item.pieces || '-',
          `${item.weight?.toLocaleString() || '-'} KG\n(CW: ${cw?.toLocaleString() || '-'} KG)`,
          breakdown,
          `${invoice.currency} ${item.amount.toLocaleString()}`,
        ];
      });
    } else {
      body = [['-', mawb?.internalMawbNo || invoice.mawbId || 'N/A', '-', '-', '-', `${invoice.currency} ${invoice.amount.toLocaleString()}`]];
    }
    autoTable(doc, {
      startY: 90, head, body, theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], halign: 'center' },
      columnStyles: { 4: { fontStyle: 'italic', fontSize: 6 }, 5: { halign: 'right', fontStyle: 'bold' } },
    });
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Total Amount: ${invoice.currency} ${invoice.amount.toLocaleString()}`, 140, finalY);
    doc.save(`Invoice_${invoice.invoiceNo}.pdf`);
  },

  generateBookingOrder: (booking: Booking, warehouse?: Warehouse, profile?: any) => {
    const doc = new jsPDF();
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.text(localize(profile?.companyName) || 'JICHEG FREIGHT FORWARDING', margin, 15);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('GUANGZHOU JICHENG FREIGHT FORWARDING CO. LTD.', margin, 20);
    doc.text(`E-Mail: ${profile?.email || 'contact@jcargos.com'}`, margin, 24);
    doc.setFontSize(22);
    doc.setTextColor(0);
    doc.text('SHIPPING ORDER', pageWidth / 2, 38, { align: 'center' });
    autoTable(doc, {
      startY: 45, margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 2, textColor: [40, 40, 40] },
      columnStyles: { 0: { cellWidth: (pageWidth - margin * 2) / 4 }, 1: { cellWidth: (pageWidth - margin * 2) / 4 }, 2: { cellWidth: (pageWidth - margin * 2) / 4 }, 3: { cellWidth: (pageWidth - margin * 2) / 4 } },
      body: [
        [{ content: `Origin\n${booking.origin}`, styles: { fillColor: [240, 242, 250], fontStyle: 'bold' } },
         { content: `Destination\n${booking.destination}`, styles: { fillColor: [240, 242, 250], fontStyle: 'bold' } },
         { content: `Carrier/Flight\n${booking.carrier || 'TBA'}`, styles: { fillColor: [240, 242, 250], fontStyle: 'bold' } },
         { content: `Flight Date\n${dayjs(booking.flightDate).format('YYYY-MM-DD')}`, styles: { fillColor: [240, 242, 250], fontStyle: 'bold' } }],
        [{ content: `Shipper Info:\n${localize(booking.shipperInfo)}`, rowSpan: 2, colSpan: 2, styles: { minCellHeight: 35, fontStyle: 'bold' } },
         { content: `AWB No.:\n${booking.mawbNo || booking.bookingNo}`, colSpan: 2 }],
        [{ content: `HAWB No.:\n--`, colSpan: 2 }],
        [{ content: `Consignee Info:\n${localize(booking.consigneeInfo)}`, rowSpan: 2, colSpan: 2, styles: { minCellHeight: 35, fontStyle: 'bold' } },
         { content: `Cargo Tender:\n${booking.entryTime ? dayjs(booking.entryTime).format('MM-DD HH:mm') : 'TBA'}`, colSpan: 2 }],
        [{ content: `Warehouse:\n${localize(warehouse?.name)}`, colSpan: 2 }],
        [{ content: `Notify Party:\n${localize(booking.alsoNotify) || '--'}`, colSpan: 2, styles: { minCellHeight: 15, fontStyle: 'bold' } },
         { content: `Declaration:\n${booking.declarationMethod || 'Formal'}`, colSpan: 2 }],
        [{ content: `Goods Description:\n${localize(booking.goodsDescription) || 'N/A'}`, colSpan: 4, styles: { minCellHeight: 12, fillColor: [250, 250, 250] } }],
      ],
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 2, margin: { left: margin, right: margin },
      theme: 'grid', headStyles: { fillColor: [220, 230, 250], textColor: [0, 0, 0], fontSize: 8 },
      head: [['Marks', 'PCS', 'GW (KG)', 'VOL (CBM)', 'Description']],
      body: [['N/M', booking.pieces, booking.weight, booking.volume, localize(booking.goodsDescription) || 'General Cargo']],
      styles: { fontSize: 8 },
    });
    const finalY = (doc as any).lastAutoTable.finalY + 5;
    doc.setFontSize(8);
    doc.setDrawColor(0);
    doc.rect(margin, finalY, pageWidth - margin * 2, 20);
    doc.line(pageWidth / 2, finalY, pageWidth / 2, finalY + 20);
    doc.text('Contact:', margin + 2, finalY + 5);
    doc.text(localize(profile?.contactPerson || profile?.displayName), margin + 2, finalY + 12);
    doc.text(profile?.phone || '', margin + 2, finalY + 17);
    doc.text('Signature & Date:', pageWidth / 2 + 2, finalY + 5);
    doc.text('Print Date: ' + dayjs().format('YYYY-MM-DD HH:mm'), pageWidth / 2 + 2, finalY + 17);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text('This document is computer-generated. Standard trading terms apply.', pageWidth / 2, 285, { align: 'center' });
    doc.save(`BookingOrder_${booking.bookingNo}.pdf`);
  },

  generateQuotationHistory: async (quotations: any[]) => {
    const doc = new jsPDF();
    doc.text('Quotation Summary Report', 14, 20);
    autoTable(doc, {
      startY: 30, head: [['ID', 'Customer', 'Date', 'Status']],
      body: quotations.map(q => [q.id?.slice(-6) || 'N/A', localize(q.customerName) || 'N/A', dayjs(q.createdAt).format('YYYY-MM-DD'), q.status]),
    });
    doc.save('quotation_history.pdf');
  },
};
