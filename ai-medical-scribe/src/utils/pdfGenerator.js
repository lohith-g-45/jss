export function generateConsultationPDF({ patientInfo, notes, transcript, doctorInfo, utterances = [] }) {
  const formatDate = (d) => {
    if (!d) return 'N/A';
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const esc = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

  const soapSections = [
    { label: 'Chief Complaint', value: notes?.chiefComplaint },
    { label: 'History of Present Illness', value: notes?.historyOfPresentIllness },
    { label: 'Past Medical History / Medications', value: notes?.pastMedicalHistory },
    { label: 'Assessment / Diagnosis', value: notes?.assessment },
    { label: 'Plan / Treatment', value: notes?.plan },
  ];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Consultation Report — ${esc(patientInfo?.patientName || 'Patient')}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 16mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #111827; background: #fff; padding: 28px 32px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      /* hide the browser-printed URL/date header and footer */
      @page { margin: 16mm; }
    }
    .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #2563EB; padding-bottom: 14px; margin-bottom: 20px; }
    .logo { font-size: 24px; font-weight: 800; color: #2563EB; letter-spacing: -0.5px; }
    .logo span { color: #10B981; }
    .report-title { font-size: 12px; color: #6B7280; text-align: right; line-height: 1.7; }
    .section { margin-bottom: 18px; }
    .section-title { font-size: 11px; font-weight: 700; color: #2563EB; text-transform: uppercase; letter-spacing: 0.6px; border-bottom: 1px solid #DBEAFE; padding-bottom: 5px; margin-bottom: 12px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px 24px; }
    .info-item { display: flex; flex-direction: column; }
    .info-label { font-size: 10px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.4px; }
    .info-value { font-size: 13px; color: #111827; margin-top: 2px; line-height: 1.4; }
    .soap-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .soap-full { grid-column: span 2; }
    .soap-card { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; }
    .soap-label { font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .soap-value { font-size: 13px; color: #1F2937; line-height: 1.6; white-space: pre-wrap; }
    .soap-empty { color: #D1D5DB; font-style: italic; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #9CA3AF; display: flex; justify-content: space-between; }
    .print-btn { position: fixed; top: 16px; right: 16px; background: #2563EB; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
    .print-btn:hover { background: #1D4ED8; }
  </style>
</head>
<body>
  <button class="no-print print-btn" onclick="window.print()">⬇ Save as PDF</button>

  <!-- Header -->
  <div class="header">
    <div>
      <div class="logo">Medi<span>Scribe</span> AI</div>
      <div style="font-size:11px; color:#6B7280; margin-top:4px;">AI-Powered Medical Documentation</div>
    </div>
    <div class="report-title">
      <div style="font-weight:700; font-size:15px; color:#111827;">Consultation Report</div>
      <div>Visit: ${formatDate(patientInfo?.dateOfVisit || new Date())}</div>
      <div>Generated: ${new Date().toLocaleString('en-IN')}</div>
    </div>
  </div>

  <!-- Patient Information -->
  <div class="section">
    <div class="section-title">Patient Information</div>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Full Name</span><span class="info-value" style="font-weight:700;">${esc(patientInfo?.patientName || 'N/A')}</span></div>
      <div class="info-item"><span class="info-label">Age &amp; Gender</span><span class="info-value">${esc(patientInfo?.age)} yrs · ${esc(patientInfo?.gender || 'N/A')}</span></div>
      <div class="info-item"><span class="info-label">Phone</span><span class="info-value">${esc(patientInfo?.phone || 'N/A')}</span></div>
      <div class="info-item"><span class="info-label">Email</span><span class="info-value">${esc(patientInfo?.email || 'N/A')}</span></div>
      ${patientInfo?.address ? `<div class="info-item" style="grid-column:span 2;"><span class="info-label">Address</span><span class="info-value">${esc(patientInfo.address)}</span></div>` : ''}
      ${doctorInfo?.name ? `<div class="info-item"><span class="info-label">Attending Doctor</span><span class="info-value" style="font-weight:600;">Dr. ${esc(doctorInfo.name)}${doctorInfo.specialization ? ' · ' + esc(doctorInfo.specialization) : ''}</span></div>` : ''}
    </div>
  </div>

  <!-- SOAP Notes -->
  <div class="section">
    <div class="section-title">Medical Notes (SOAP)</div>
    <div class="soap-grid">
      ${soapSections.map((s, i) => `
        <div class="soap-card${i >= 3 ? ' soap-full' : ''}">
          <div class="soap-label">${s.label}</div>
          <div class="soap-value ${s.value?.trim() ? '' : 'soap-empty'}">${s.value?.trim() ? esc(s.value) : 'Not recorded'}</div>
        </div>`).join('')}
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>MediScribe AI · Confidential Medical Record</span>
    <span>Patient: ${esc(patientInfo?.patientName || 'N/A')} · ${formatDate(patientInfo?.dateOfVisit || new Date())}</span>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      setTimeout(() => win.print(), 400);
    };
  }
}
