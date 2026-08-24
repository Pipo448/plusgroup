// src/utils/printReport.js
// ✅ NOUVO — Zouti pataje pou enprime nenpòt fich rapò (Sesyon Kès,
// Kontwòl Estòk, elt.) nan yon fenèt pwòp, byen prezante, ak menm antèt/pye
// paj ki itilize toupatou nan PLUS GROUP (footer "Powered by plusgroupe.com").

export function printReport({ title, subtitle, rows, meta, tenantName }) {
  const win = window.open('', '_blank', 'width=480,height=700')
  if (!win) return

  const metaHtml = (meta || [])
    .map(m => `
      <div class="meta-row">
        <span class="meta-label">${m.label}</span>
        <span class="meta-value ${m.strong ? 'strong' : ''} ${m.color || ''}">${m.value}</span>
      </div>
    `).join('')

  const rowsHtml = (rows || [])
    .map(r => `
      <div class="line-row">
        <span class="line-label">${r.label}</span>
        <span class="line-value ${r.strong ? 'strong' : ''} ${r.color || ''}">${r.value}</span>
      </div>
    `).join('')

  win.document.write(`
    <!DOCTYPE html>
    <html lang="ht">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Courier New', monospace;
          padding: 20px;
          color: #0F1A5C;
          max-width: 380px;
          margin: 0 auto;
        }
        .header { text-align: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px dashed #1B2A8F; }
        .header .tenant { font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; }
        .header .title { font-size: 12px; font-weight: 700; margin-top: 4px; color: #6B7AAB; text-transform: uppercase; }
        .header .subtitle { font-size: 11px; margin-top: 2px; color: #6B7AAB; }
        .meta-row { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; }
        .meta-label { color: #6B7AAB; }
        .meta-value { font-weight: 700; }
        .divider { border-top: 1px dashed #1B2A8F; margin: 12px 0; }
        .line-row { display: flex; justify-content: space-between; font-size: 12px; padding: 5px 0; }
        .line-label { color: #333; }
        .line-value { font-weight: 700; }
        .line-value.strong { font-size: 15px; font-weight: 900; }
        .color-red { color: #C0392B; }
        .color-green { color: #059669; }
        .footer { text-align: center; margin-top: 20px; padding-top: 12px; border-top: 2px dashed #1B2A8F; font-size: 9px; color: #6B7AAB; }
        @media print { body { padding: 8px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="tenant">${tenantName || 'PLUS GROUP'}</div>
        <div class="title">${title}</div>
        ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
      </div>
      ${metaHtml}
      <div class="divider"></div>
      ${rowsHtml}
      <div class="footer">
        Powered by plusgroupe.com<br/>Tél: +509 4244-9024
      </div>
    </body>
    </html>
  `)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}
