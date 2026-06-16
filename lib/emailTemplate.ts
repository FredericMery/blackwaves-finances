type BuildParams = {
  subject?: string
  title?: string
  contentHtml?: string
  contentText?: string
  ctaUrl?: string
  ctaText?: string
  date?: string
  siteUrl?: string
  trackingPixelUrl?: string
}

function ensureHtml(contentHtml?: string, contentText?: string) {
  if (contentHtml && /<\/?[a-z][\s\S]*>/i.test(contentHtml)) {
    return contentHtml
  }

  const source = (contentText || contentHtml || "")
  if (!source) return ""

  const paragraphs = source
    .split(/\n{2,}/g)
    .map(p => p.trim())
    .filter(Boolean)

  return paragraphs
    .map(p => `<p style="margin:0 0 12px 0;line-height:1.5">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('\n')
}

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function buildEmailHtml(opts: BuildParams) {
  const subject = opts.subject || ''
  const title = opts.title || ''
  const date = opts.date || ''
  const ctaUrl = opts.ctaUrl || '#'
  const ctaText = opts.ctaText || 'Voir'
  const content = ensureHtml(opts.contentHtml, opts.contentText)

  const header = `
    <div style="font-family: Arial, Helvetica, sans-serif; color:#111; padding:18px 24px;">
      <h2 style="margin:0 0 8px 0; font-size:20px">${escapeHtml(subject || title)}</h2>
      <div style="color:#6b7280; font-size:13px; margin-bottom:12px">${escapeHtml(date)}</div>
      <hr style="border:none;border-top:1px solid #eceff1;margin:12px 0 18px 0"/>
    </div>
  `

  const cta = `
    <div style="padding:0 24px 24px 24px;">
      <a href="${ctaUrl}" style="display:inline-block;background-color:#0ea5e9;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600">${escapeHtml(ctaText)}</a>
    </div>
  `

  const footer = `
    <div style="padding:18px 24px;color:#6b7280;font-size:12px;font-family: Arial, Helvetica, sans-serif;">
      <div>Envoyé par votre club</div>
    </div>
  `

  const tracking = opts.trackingPixelUrl
    ? `<img src="${opts.trackingPixelUrl}" width="1" height="1" alt="" style="display:block"/>`
    : ''

  const inner = `
    <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 18px rgba(2,6,23,0.4)">
      ${header}
      <div style="padding:0 24px 12px 24px; font-family: Arial, Helvetica, sans-serif; color:#111;">
        ${content}
      </div>
      ${cta}
      ${footer}
    </div>
    ${tracking}
  `

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </head>
      <body style="margin:0;background-color:#f7fafc;padding:24px">
        ${inner}
      </body>
    </html>
  `
}

export function buildEmailFragment(opts: BuildParams) {
  const header = `
    <div style="font-family: Arial, Helvetica, sans-serif; color:#111; padding:18px 24px;">
      <h2 style="margin:0 0 8px 0; font-size:20px">${escapeHtml(opts.subject || opts.title || '')}</h2>
      <div style="color:#6b7280; font-size:13px; margin-bottom:12px">${escapeHtml(opts.date || '')}</div>
      <hr style="border:none;border-top:1px solid #eceff1;margin:12px 0 18px 0"/>
    </div>
  `

  const content = ensureHtml(opts.contentHtml, opts.contentText)

  const cta = `
    <div style="padding:0 24px 24px 24px;">
      <a href="${opts.ctaUrl || '#'}" style="display:inline-block;background-color:#0ea5e9;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600">${escapeHtml(opts.ctaText || 'Voir')}</a>
    </div>
  `

  const footer = `
    <div style="padding:18px 24px;color:#6b7280;font-size:12px;font-family: Arial, Helvetica, sans-serif;">
      <div>Envoyé par votre club</div>
    </div>
  `

  const tracking = opts.trackingPixelUrl ? `<img src="${opts.trackingPixelUrl}" width="1" height="1" alt="" style="display:block"/>` : ''

  return `
    <div style="background:#ffffff;border-radius:8px;overflow:hidden">
      ${header}
      <div style="padding:0 24px 12px 24px; font-family: Arial, Helvetica, sans-serif; color:#111;">
        ${content}
      </div>
      ${cta}
      ${footer}
    </div>
    ${tracking}
  `
}

export function buildEmailText(opts: BuildParams) {
  const title = opts.title || opts.subject || ''
  const date = opts.date || ''
  const ctaUrl = opts.ctaUrl || '#'
  const source = opts.contentText || opts.contentHtml || ''

  const text = source
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')

  return `${title}\n${date}\n\n${text}\n\n${opts.ctaText || 'Voir'}: ${ctaUrl}`
}
