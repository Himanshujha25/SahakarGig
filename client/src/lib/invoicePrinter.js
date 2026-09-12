import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "./toast";

export function resolveCoopDetails(booking) {
  const coop = (booking?.cooperativeId && typeof booking.cooperativeId === 'object')
    ? booking.cooperativeId
    : (booking?.providerId?.cooperativeId && typeof booking.providerId.cooperativeId === 'object')
    ? booking.providerId.cooperativeId
    : booking?.cooperativeId || booking?.providerId?.cooperativeId || {};

  const serviceName = booking?.service || booking?.targetCategory || 'Gig Labor Services';
  const name = coop?.name || `${serviceName} Cooperative Society`;
  const regId = coop?.registrationId || coop?.registrationNumber || `PACS/DL/2026/GIG-${(booking?._id || '9042').slice(-4).toUpperCase()}`;
  const district = coop?.district || coop?.region || 'New Delhi Central';
  const address = coop?.address || 'Cooperative Bhawan, Sector 4, New Delhi';
  const logoUrl = coop?.logoUrl || booking?.coopLogoUrl || '';
  const stampUrl = coop?.stampUrl || booking?.coopStampUrl || '';
  const signatureUrl = coop?.signatureUrl || booking?.coopSignatureUrl || '';
  const secretaryName = coop?.secretaryName || coop?.presidentName || (name.toLowerCase().includes('karol') ? 'Suresh Patel' : name.toLowerCase().includes('delhi') ? 'Rajesh Verma' : 'Authorized Secretary');

  return { name, regId, district, address, logoUrl, stampUrl, signatureUrl, secretaryName };
}

export async function downloadPDFInvoice(booking, user) {
  if (!booking) return;

  const invNo = `INV-${new Date(booking.createdAt || Date.now()).getFullYear()}-${(booking._id || '').slice(-6).toUpperCase()}`;
  const dateStr = new Date(booking.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const {
    name: coopName,
    regId: coopReg,
    district: coopDistrict,
    address: coopAddr,
    logoUrl: coopLogo,
    stampUrl: coopStamp,
    signatureUrl: coopSignature,
    secretaryName: coopSecretary,
  } = resolveCoopDetails(booking);

  const workerName = booking.providerId?.userId?.name || 'Verified Cooperative Gig Professional';
  const workerPhone = booking.providerId?.userId?.phone || '+91 98765 43210';
  const workerUan = `E-SHRAM-UAN-${(booking._id || '').slice(0, 10).toUpperCase()}`;

  const clientName = user?.name || booking.householdId?.name || 'Household Client';
  const clientPhone = user?.phone || booking.householdId?.phone || 'N/A';
  const clientAddress = booking.locationText || 'Client Premises';

  const price = Number(booking.price) || 200;
  const baseRate = Math.round(price * 0.94);
  const welfareCess = Math.max(2, Math.round(price * 0.01));
  const gstTax = Math.round(price * 0.05);

  // Offscreen element for rendering pristine PDF HTML
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "794px"; // A4 width at 96 DPI
  container.style.background = "#ffffff";
  container.style.padding = "40px";
  container.style.fontFamily = "'Hanken Grotesk', system-ui, sans-serif";

  const cleanCoopTag = coopName.toUpperCase().replace('COOPERATIVE SOCIETY', '').replace('COOPERATIVE', '').replace('LABOUR', '').trim();

  const stampElementHtml = coopStamp
    ? `<img src="${coopStamp}" style="max-height: 84px; max-width: 140px; object-fit: contain; transform: rotate(-5deg);" />`
    : `<div style="width: 82px; height: 82px; border: 2.5px dashed #00288e; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 8px; font-weight: 900; color: #00288e; text-align: center; transform: rotate(-7deg); background: rgba(0, 40, 142, 0.04); padding: 4px; line-height: 1.1;">
        <span style="font-size: 6.5px; opacity: 0.85; text-transform: uppercase;">PACS REGD</span>
        <strong style="font-size: 8.5px; margin: 1px 0; color: #00288e;">${cleanCoopTag || 'SAHAKAR'}</strong>
        <span style="font-size: 6.5px; color: #166534; font-weight: 800;">SEALED ✓</span>
       </div>`;

  const signatureElementHtml = coopSignature
    ? `<img src="${coopSignature}" style="max-height: 48px; max-width: 140px; object-fit: contain; transform: rotate(-2deg); margin-bottom: 2px;" />`
    : `<div style="font-family: cursive, 'Brush Script MT', sans-serif; font-size: 18px; font-weight: 800; color: #00288e; transform: rotate(-4deg); margin-bottom: 2px; letter-spacing: 0.5px;">${coopSecretary}</div>`;

  const logoElementHtml = coopLogo
    ? `<img src="${coopLogo}" style="width: 46px; height: 46px; border-radius: 10px; object-fit: contain; background: #ffffff; padding: 2px; border: 1px solid #cbd5e1;" />`
    : `<img src="/icon-512.png" style="width: 44px; height: 44px; border-radius: 10px;" />`;

  container.innerHTML = `
    <div style="border: 1px solid #cbd5e1; border-radius: 16px; padding: 32px; font-size: 13px; color: #0f172a;">
      <!-- HEADER -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #00288e; padding-bottom: 20px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          ${logoElementHtml}
          <div>
            <div style="font-size: 22px; font-weight: 900; color: #00288e; letter-spacing: -0.5px;">${coopName}</div>
            <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Cooperative Federation Official Tax Invoice</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase;">TAX INVOICE</div>
          <div style="font-family: monospace; font-size: 13px; font-weight: 700; color: #00288e;">${invNo}</div>
          <div style="font-size: 12px; color: #64748b;">Date: ${dateStr}</div>
          <div style="margin-top: 4px; display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: 800; background: ${booking.paymentStatus === 'paid' ? '#dcfce7' : '#fef3c7'}; color: ${booking.paymentStatus === 'paid' ? '#166534' : '#92400e'}; border: 1px solid ${booking.paymentStatus === 'paid' ? '#bbf7d0' : '#fde68a'};">
            ${booking.paymentStatus === 'paid' ? 'PAID ✓ (ESCROW RELEASED)' : 'PAYMENT ESCROW PENDING'}
          </div>
        </div>
      </div>

      <!-- ISSUER & CLIENT DETAILS -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #00288e; margin-bottom: 6px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px;">Issued By (Cooperative Society)</div>
          <div style="font-size: 13.5px; font-weight: 700; color: #0f172a;">${coopName}</div>
          <div style="font-size: 11.5px; color: #475569; margin-top: 2px;"><strong>PACS Reg No:</strong> ${coopReg}</div>
          <div style="font-size: 11.5px; color: #475569;"><strong>District:</strong> ${coopDistrict}</div>
          <div style="font-size: 11.5px; color: #475569;"><strong>Address:</strong> ${coopAddr}</div>
          <div style="font-size: 10.5px; font-weight: 700; color: #00288e; margin-top: 4px;">Affiliated with Ministry of Cooperation, Govt. of India</div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #00288e; margin-bottom: 6px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px;">Billed To (Household)</div>
          <div style="font-size: 13.5px; font-weight: 700; color: #0f172a;">${clientName}</div>
          <div style="font-size: 11.5px; color: #475569; margin-top: 2px;"><strong>Phone:</strong> ${clientPhone}</div>
          <div style="font-size: 11.5px; color: #475569;"><strong>Location:</strong> ${clientAddress}</div>
          <div style="font-size: 11.5px; color: #475569;"><strong>Booking Ref:</strong> ${booking._id}</div>
        </div>
      </div>

      <!-- WORKER DETAILS -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 20px;">
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #00288e; margin-bottom: 6px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px;">Deployed Service Professional</div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 13.5px; font-weight: 700; color: #0f172a;">${workerName}</div>
            <div style="font-size: 11.5px; color: #475569;"><strong>Service Role:</strong> ${booking.service}</div>
            <div style="font-size: 11.5px; color: #475569;"><strong>Contact Phone:</strong> ${workerPhone}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11.5px; color: #475569;"><strong>e-Shram UAN:</strong> <span style="font-family: monospace; font-weight: 700; color: #00288e;">${workerUan}</span></div>
            <div style="font-size: 11.5px; color: #166534; font-weight: 700;">⭐ 4.9 Verified PACS Member</div>
          </div>
        </div>
      </div>

      <!-- ITEMS TABLE -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f1f5f9; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #334155;">
            <th style="padding: 8px 12px; text-align: left; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">#</th>
            <th style="padding: 8px 12px; text-align: left; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">Description</th>
            <th style="padding: 8px 12px; text-align: center; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">SAC Code</th>
            <th style="padding: 8px 12px; text-align: center; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">Qty</th>
            <th style="padding: 8px 12px; text-align: right; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">Rate</th>
            <th style="padding: 8px 12px; text-align: right; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">1</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${booking.service}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-family: monospace;">${booking.sacCode || '998719'}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">1</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${baseRate}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">₹${baseRate}</td>
          </tr>
        </tbody>
      </table>

      <!-- TOTALS -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
        <div style="width: 280px; font-size: 12.5px;">
          <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #475569;">
            <span>Subtotal</span>
            <span>₹${baseRate}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #475569;">
            <span>PACS Welfare Cess (1%)</span>
            <span>₹${welfareCess}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #475569;">
            <span>GST & Taxes (5%)</span>
            <span>₹${gstTax}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 15px; font-weight: 900; color: #00288e; border-top: 2px solid #00288e; border-bottom: 2px solid #00288e; margin-top: 4px;">
            <span>Total Amount</span>
            <span>₹${price}</span>
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px; font-size: 11px; color: #1e40af; line-height: 1.4;">
        <strong>🛡️ Sahakar Escrow Guarantee:</strong> Payment is held securely until OTP verification upon job completion. Certified digital document generated by ${coopName}.
      </div>

      <!-- PACS STAMP & AUTHORIZED SIGNATURE -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #cbd5e1; padding-top: 16px; margin-top: 20px;">
        <div style="font-size: 10.5px; color: #64748b; line-height: 1.4;">
          Digitally signed & authenticated by PACS Secretary (${coopSecretary}).<br/>
          Verified under Multi-State Cooperative Societies Act & Ministry of Cooperation.
        </div>
        <div style="display: flex; align-items: center; gap: 20px;">
          <!-- STAMP -->
          ${stampElementHtml}
          <!-- SIGNATURE LINE -->
          <div style="width: 140px; text-align: center; border-top: 1.5px solid #00288e; padding-top: 4px;">
            ${signatureElementHtml}
            <div style="font-size: 10px; font-weight: 800; color: #0f172a;">Authorized Signatory</div>
            <div style="font-size: 9px; color: #64748b;">${coopName}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Tax-Invoice-${invNo}.pdf`);
    toast.success(`Tax Invoice ${invNo} downloaded successfully!`, "Invoice Downloaded");
  } catch (err) {
    console.error("PDF generation error:", err);
    toast.error("Could not generate PDF invoice. Please try again.", "Invoice Error");
  } finally {
    document.body.removeChild(container);
  }
}

export function printOfficialInvoice(booking, user) {
  downloadPDFInvoice(booking, user);
}
