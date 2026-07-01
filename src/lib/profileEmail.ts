// The magic-link sign-in email for the HalvingLens Profile. One secure button,
// no password. Same dark + gold theme as the rest of HalvingLens.

const C = { bg: "#0a0c10", cardHi: "#171b24", border: "#23272f", ink: "#f4f1ea", sub: "#c2c6cf", dim: "#8c919c", faint: "#6b7079", gold: "#d9b96a", hair: "#1d212a" };
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function profileEmailSubject(): string {
  return "Sign in to your HalvingLens Profile";
}

export function profileEmailText(link: string, code: string): string {
  return [
    "Sign in to your HalvingLens Profile",
    "",
    `Your sign-in code: ${code}`,
    "Enter this code on the sign-in page. It expires in 15 minutes.",
    "",
    "Or click this secure link (no password needed):",
    link,
    "",
    "If you didn't request this, you can safely ignore it.",
  ].join("\n");
}

export function profileEmailHtml(link: string, code: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><title>${profileEmailSubject()}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:30px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:${C.bg};">
      <tr><td style="padding:8px 36px 24px;">
        <div style="font:700 15px/1 ${SANS};letter-spacing:.26em;text-transform:uppercase;color:${C.ink};">
          <span style="color:${C.gold};">◆</span>&nbsp; HalvingLens
        </div>
      </td></tr>
      <tr><td style="padding:6px 36px 8px;">
        <div style="font:600 30px/1.2 ${SERIF};color:${C.ink};letter-spacing:-0.4px;">Sign in to your Profile</div>
        <div style="font:400 16px/1.6 ${SANS};color:${C.sub};margin-top:14px;">
          Enter this code on the sign-in page — no password needed.
        </div>
      </td></tr>
      <tr><td style="padding:16px 36px 6px;">
        <div style="font:400 11px/1.4 ${SANS};letter-spacing:.16em;text-transform:uppercase;color:${C.dim};margin-bottom:8px;">Your sign-in code</div>
        <div style="font:700 40px/1 'Courier New',monospace;letter-spacing:.28em;color:${C.gold};">${code}</div>
        <div style="font:400 12.5px/1.5 ${SANS};color:${C.faint};margin-top:10px;">Expires in 15 minutes.</div>
      </td></tr>
      <tr><td style="padding:16px 36px 6px;">
        <div style="font:400 13px/1.5 ${SANS};color:${C.sub};">Or use the one-click link instead:</div>
      </td></tr>
      <tr><td style="padding:8px 36px 10px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="border-radius:10px;background:${C.gold};">
            <a href="${link}" style="display:inline-block;padding:14px 30px;font:600 15px/1 ${SANS};color:#15120a;text-decoration:none;border-radius:10px;">Sign in securely →</a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:8px 36px 6px;">
        <div style="font:400 12.5px/1.6 ${SANS};color:${C.faint};">
          This link expires in 1 hour and can only be used once. If you didn&apos;t request it, you can safely ignore this email.
        </div>
      </td></tr>
      <tr><td style="padding:22px 36px 30px;border-top:1px solid ${C.hair};">
        <div style="font:400 11px/1.7 ${SANS};color:${C.faint};">
          You&apos;re receiving this because someone entered this address to access a HalvingLens Profile. Historical
          context, not advice.
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
