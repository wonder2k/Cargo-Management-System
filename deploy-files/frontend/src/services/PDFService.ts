import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { pinyin } from 'pinyin-pro';
import { Booking, Warehouse } from '../types';

const localize = (text: string | null | undefined): string => {
  if (!text) return "";
  const halfWidth = text.replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).replace(/　/g, ' ');
  if (/^[\x00-\x7F]*$/.test(halfWidth)) return halfWidth;
  return halfWidth.replace(/[一-龥]+/g, (match) => pinyin(match, { toneType: 'none' }) + " ").replace(/\s+/g, ' ').trim();
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
