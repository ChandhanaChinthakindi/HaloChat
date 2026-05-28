import { Resend } from "resend";
import { logger } from "./logger";

const FROM = process.env["FROM_EMAIL"] ?? "HaloChat <noreply@halochat.app>";
let _resend: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    // Dev fallback — log the link so developers can test without an API key
    logger.warn({ resetUrl }, "RESEND_API_KEY not set — password reset link (dev only)");
    return;
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your HaloChat password",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:linear-gradient(135deg,#818263,#BB8588);padding:36px;text-align:center">
            <div style="width:64px;height:64px;border-radius:32px;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
              <span style="font-size:28px">✨</span>
            </div>
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px">HaloChat</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 36px">
            <h2 style="color:#1a1a1a;font-size:20px;font-weight:600;margin:0 0 12px">Reset your password</h2>
            <p style="color:#666;font-size:15px;line-height:1.6;margin:0 0 28px">
              We received a request to reset your password. Tap the button below — this link expires in <strong>1 hour</strong>.
            </p>
            <div style="text-align:center;margin-bottom:28px">
              <a href="${resetUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#818263,#BB8588);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:15px 36px;border-radius:14px">
                Reset Password
              </a>
            </div>
            <p style="color:#999;font-size:13px;line-height:1.5;margin:0">
              If you didn't request this, you can safely ignore this email — your password won't change.<br><br>
              Or copy this link into your browser:<br>
              <a href="${resetUrl}" style="color:#818263;word-break:break-all">${resetUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #f0f0f0;text-align:center">
            <p style="color:#bbb;font-size:12px;margin:0">© HaloChat · Your AI Companion</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
