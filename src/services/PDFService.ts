import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { pinyin } from 'pinyin-pro';
import { Booking, Warehouse, UserProfile, Quotation } from '../types';

/**
 * Utility to convert Chinese characters to Pinyin to prevent garbled text in jsPDF
 * as standard fonts do NOT support Unicode/Chinese without custom embedding.
 */
const localize = (text: string | null | undefined): string => {
  if (!text) return "";
  
  // Convert full-width characters to half-width
  const halfWidth = text.replace(/[\uff01-\uff5e]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
                        .replace(/\u3000/g, ' ');

  // If it's already pure ASCII, return it
  if (/^[\x00-\x7F]*$/.test(halfWidth)) return halfWidth;
  
  // Convert to Pinyin for poor-man's localized PDF
  // We process blocks to avoid adding spaces between English characters
  return halfWidth.replace(/[\u4e00-\u9fa5]+/g, (match) => {
    return pinyin(match, { toneType: 'none' }) + " ";
  }).replace(/\s+/g, ' ').trim();
};

export const PDFService = {
  generateInvoice: (invoice: any, customer: any, mawb?: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.text('INVOICE', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text('CargoSystem Logistics', 20, 40);
    doc.text('123 Logistics Way', 20, 45);
    doc.text('Shanghai, China', 20, 50);
    
    // Invoice Info
    doc.text(`Invoice No: ${invoice.invoiceNo}`, 140, 40);
    doc.text(`Date: ${dayjs(invoice.createdAt).format('YYYY-MM-DD')}`, 140, 45);
    doc.text(`Due Date: ${dayjs(invoice.dueDate).format('YYYY-MM-DD')}`, 140, 50);
    
    // Bill To
    doc.setFontSize(12);
    doc.text('BILL TO:', 20, 70);
    doc.setFontSize(10);
    doc.text(localize(customer.name), 20, 75);
    doc.text(customer.email || '', 20, 80);
    
    // Items
    const items = [
      ['Service Description', 'Reference', 'Amount'],
      ['Air Freight Charges', mawb?.internalMawbNo || invoice.mawbId || 'N/A', `${invoice.currency} ${invoice.amount.toLocaleString()}`],
    ];
    
    autoTable(doc, {
      startY: 90,
      head: [items[0]],
      body: [items[1]],
    });
    
    // Total
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Total Amount: ${invoice.currency} ${invoice.amount.toLocaleString()}`, 140, finalY);
    
    doc.save(`Invoice_${invoice.invoiceNo}.pdf`);
  },

  generateProposal: (quotation: any, customer: any, profile: any) => {
    const doc = new jsPDF();
    
    // Company Header
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text(localize(profile?.companyName) || 'CargoSystem Global', 20, 25);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Contact: ${localize(profile?.contactPerson || profile?.displayName)}`, 20, 32);
    doc.text(`Phone: ${profile?.contactPhone || '-'}`, 20, 37);
    doc.text(`Email: ${profile?.email || ''}`, 20, 42);

    // Quote Header (Right Aligned)
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('AIR FREIGHT QUOTATION', 190, 25, { align: 'right' });
    doc.setFontSize(10);
    doc.text(`No: ${quotation.quotationNo}`, 190, 32, { align: 'right' });
    doc.text(`Date: ${dayjs().format('YYYY-MM-DD')}`, 190, 37, { align: 'right' });

    // Quotation Metadata
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(20, 55, 170, 35, 'F');
    
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('AIR FREIGHT PROPOSAL', 25, 65);
    
    doc.setFontSize(9);
    doc.text(`Quote No: ${quotation.quotationNo}`, 25, 75);
    doc.text(`Date: ${dayjs().format('YYYY-MM-DD')}`, 25, 80);
    doc.text(`Valid Until: ${quotation.validUntil}`, 25, 85);

    doc.text('PREPARED FOR:', 110, 65);
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(localize(quotation.customerName || customer?.name) || 'Valued Client', 110, 72);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    
    const recipientLines = quotation.recipientInfo ? quotation.recipientInfo.split('\n') : [];
    recipientLines.forEach((line: string, i: number) => {
      doc.text(localize(line), 110, 78 + (i * 4));
    });

    // Routes Table
    autoTable(doc, {
      startY: 100,
      head: [['Origin', 'Destination', 'Carrier', 'Rate / KG', 'Surcharges', 'Final Price']],
      body: quotation.routes.map((r: any) => [
        r.origin,
        r.destination,
        r.carrier,
        `${quotation.currency} ${r.basePrice}`,
        'Included',
        `${quotation.currency} ${r.finalPrice.toFixed(2)}`
      ]),
      headStyles: { fillColor: [15, 23, 42] }, // slate-900
      alternateRowStyles: { fillColor: [241, 245, 249] },
    });

    // Terms & Conditions
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(11);
    doc.text('Notes & Terms:', 20, finalY);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    const terms = [
      '• Rates are subject to space availability at time of booking.',
      '• Volumetric calculations apply (1:6000 ratio).',
      '• Rates valid for general cargo only unless specified.',
      '• Final charges based on actual weight/dim as per carrier SLI.'
    ];
    terms.forEach((term, i) => {
      doc.text(term, 20, finalY + 7 + (i * 5));
    });

    // Footer
    doc.setFontSize(8);
    doc.text('This is a computer-generated proposal. No signature required.', 105, 285, { align: 'center' });

    doc.save(`${quotation.quotationNo}_${localize(quotation.customerName)}.pdf`);
  },

  generateBookingOrder: (booking: Booking, warehouse?: Warehouse, profile?: UserProfile | null) => {
    const doc = new jsPDF();
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header - Left aligned branding
    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.text(localize(profile?.companyName) || 'JICHEG FREIGHT FORWARDING', margin, 15);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('GUANGZHOU JICHENG FREIGHT FORWARDING CO. LTD.', margin, 20);
    doc.text(`E-Mail: ${profile?.email || 'contact@jcargos.com'}`, margin, 24);

    // Title - Large and Centered
    doc.setFontSize(22);
    doc.setTextColor(0);
    doc.text('SHIPPING ORDER', pageWidth / 2, 38, { align: 'center' });

    // Main Grid Structure using autoTable
    autoTable(doc, {
      startY: 45,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 2, textColor: [40, 40, 40], lineColor: [0, 0, 0], lineWidth: 0.1 },
      columnStyles: {
        0: { cellWidth: (pageWidth - margin * 2) / 4 },
        1: { cellWidth: (pageWidth - margin * 2) / 4 },
        2: { cellWidth: (pageWidth - margin * 2) / 4 },
        3: { cellWidth: (pageWidth - margin * 2) / 4 },
      },
      body: [
        // Top Row: Logistics Info
        [
          { content: `Origin\n${booking.origin}`, styles: { fillColor: [240, 242, 250], fontStyle: 'bold' } },
          { content: `Destination\n${booking.destination}`, styles: { fillColor: [240, 242, 250], fontStyle: 'bold' } },
          { content: `Carrier/Flight\n${booking.carrier || 'TBA'}`, styles: { fillColor: [240, 242, 250], fontStyle: 'bold' } },
          { content: `Flight Date\n${dayjs(booking.flightDate).format('YYYY-MM-DD')}`, styles: { fillColor: [240, 242, 250], fontStyle: 'bold' } },
        ],
        // Mid Row: Shipper & AWB info
        [
          { content: `Shipper Info:\n${localize(booking.shipperInfo)}`, rowSpan: 2, colSpan: 2, styles: { minCellHeight: 35, fontStyle: 'bold' } },
          { content: `AWB No.:\n${booking.mawbNo || booking.bookingNo}`, colSpan: 2 },
        ],
        [
          { content: `HAWB No.:\n--`, colSpan: 2 },
        ],
        // Consignee Row
        [
          { content: `Consignee Info:\n${localize(booking.consigneeInfo)}`, rowSpan: 2, colSpan: 2, styles: { minCellHeight: 35, fontStyle: 'bold' } },
          { content: `Cargo Tender:\n${booking.entryTime ? dayjs(booking.entryTime).format('MM-DD HH:mm') : 'TBA'}`, colSpan: 2 },
        ],
        [
          { content: `Warehouse:\n${localize(warehouse?.name)}`, colSpan: 2 },
        ],
        // Notify & Declaration
        [
          { content: `Notify Party:\n${localize(booking.alsoNotify) || '--'}`, colSpan: 2, styles: { minCellHeight: 15, fontStyle: 'bold' } },
          { content: `Declaration:\n${booking.declarationMethod || 'Formal'}`, colSpan: 2 },
        ],
        // Handling Info
        [
          { content: `Goods Description:\n${localize(booking.goodsDescription) || 'N/A'}`, colSpan: 4, styles: { minCellHeight: 12, fillColor: [250, 250, 250] } }
        ],
      ],
    });

    // Secondary table for Cargo Specs
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 2,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [220, 230, 250], textColor: [0, 0, 0], fontSize: 8 },
      head: [['Marks', 'PCS', 'GW (KG)', 'VOL (CBM)', 'Description']],
      body: [[
        'N/M',
        booking.pieces,
        booking.weight,
        booking.volume,
        localize(booking.goodsDescription) || 'General Cargo'
      ]],
      styles: { fontSize: 8 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 5;
    
    // Bottom grid: Signature & Date
    doc.setFontSize(8);
    doc.setDrawColor(0);
    doc.rect(margin, finalY, pageWidth - margin * 2, 20);
    doc.line(pageWidth / 2, finalY, pageWidth / 2, finalY + 20);
    
    doc.text('Contact:', margin + 2, finalY + 5);
    doc.text(localize(profile?.contactPerson || profile?.displayName), margin + 2, finalY + 12);
    doc.text(profile?.contactPhone || '', margin + 2, finalY + 17);

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
      startY: 30,
      head: [['ID', 'Customer', 'Date', 'Status']],
      body: quotations.map(q => [
        q.id?.slice(-6) || 'N/A',
        localize(q.customerName) || 'N/A',
        dayjs(q.createdAt).format('YYYY-MM-DD'),
        q.status
      ])
    });
    doc.save('quotation_history.pdf');
  }
};
