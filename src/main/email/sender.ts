import Mailgun from 'mailgun.js';
import formData from 'form-data';
import { getMailgunApiKey, getMailgunDomain, getEmailFrom } from '../settings';

let mg: ReturnType<InstanceType<typeof Mailgun>['client']> | null = null;
let lastApiKey = '';

function getClient() {
  const apiKey = getMailgunApiKey();
  // Recreate client if key changed
  if (!mg || apiKey !== lastApiKey) {
    const mailgun = new Mailgun(formData);
    mg = mailgun.client({ username: 'api', key: apiKey });
    lastApiKey = apiKey;
  }
  return mg;
}

export async function sendPlaybackEmail(
  toEmail: string,
  playbackUrl: string,
  playbackId?: string | null,
): Promise<void> {
  const safeUrl = playbackUrl.replace(/"/g, '&quot;');
  const gifUrl = playbackId ? `https://image.mux.com/${playbackId}/animated.gif?width=480&fps=12` : null;
  const emailFrom = getEmailFrom();

  // Pre-warm the GIF so it's cached on Mux's CDN before the recipient opens the email
  if (gifUrl) {
    try {
      const { net } = await import('electron');
      const req = net.request(gifUrl);
      await new Promise<void>((resolve) => {
        req.on('response', (res) => {
          res.on('data', () => {}); // drain the response
          res.on('end', () => resolve());
          res.on('error', () => resolve());
        });
        req.on('error', () => resolve());
        req.end();
      });
      console.log('[Email] GIF pre-warmed');
    } catch {
      console.warn('[Email] GIF pre-warm failed, sending anyway');
    }
  }

  await getClient().messages.create(getMailgunDomain(), {
    from: emailFrom,
    to: [toEmail],
    subject: 'Your Bayside Video Studio Recording is Ready!',
    'h:sender': emailFrom,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--[if mso]><style>body,table,td{font-family:Segoe UI,Helvetica,Arial,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0b0c12;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0c12;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Main card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#13151e;border-radius:16px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;">

          <!-- Accent bar at top -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#818cf8,#34d399);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Logo / header -->
          <tr>
            <td align="center" style="padding:36px 32px 0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:36px;height:36px;background-color:rgba(129,140,248,0.12);border-radius:10px;text-align:center;vertical-align:middle;">
                    <span style="font-size:18px;line-height:36px;">&#9654;</span>
                  </td>
                  <td style="padding-left:12px;">
                    <span style="color:#e8eaed;font-size:18px;font-weight:700;letter-spacing:-0.01em;">Bayside Video Studio</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <div style="height:1px;background-color:rgba(255,255,255,0.06);"></div>
            </td>
          </tr>

          <!-- Success icon + heading -->
          <tr>
            <td align="center" style="padding:32px 32px 0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="width:56px;height:56px;background-color:rgba(52,211,153,0.12);border-radius:50%;">
                    <span style="color:#34d399;font-size:28px;line-height:56px;">&#10003;</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:20px 32px 0 32px;">
              <h1 style="margin:0;color:#e8eaed;font-size:24px;font-weight:700;letter-spacing:-0.02em;line-height:1.3;">
                Your recording is ready
              </h1>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:10px 32px 0 32px;">
              <p style="margin:0;color:rgba(232,234,237,0.55);font-size:15px;line-height:1.6;">
                Your full-quality video has finished processing and is ready for you to download.
              </p>
            </td>
          </tr>

          ${gifUrl ? `<!-- Video preview GIF -->
          <tr>
            <td align="center" style="padding:24px 32px 0 32px;">
              <a href="${safeUrl}" target="_blank" style="display:block;text-decoration:none;">
                <img src="${gifUrl}" alt="Video preview" width="456" style="display:block;width:100%;max-width:456px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);" />
              </a>
            </td>
          </tr>` : ''}

          <!-- CTA button -->
          <tr>
            <td align="center" style="padding:28px 32px 0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color:#818cf8;border-radius:12px;">
                    <a href="${safeUrl}" target="_blank"
                       style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;letter-spacing:-0.01em;">
                      Download Your Video
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 24-hour warning badge -->
          <tr>
            <td align="center" style="padding:20px 32px 0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:rgba(129,140,248,0.08);border:1px solid rgba(129,140,248,0.15);border-radius:10px;padding:10px 18px;">
                    <span style="color:#818cf8;font-size:13px;font-weight:600;">&#9201;&ensp;This link expires in 24 hours</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:32px 32px 0 32px;">
              <div style="height:1px;background-color:rgba(255,255,255,0.06);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:20px 32px 28px 32px;">
              <p style="margin:0;color:rgba(232,234,237,0.3);font-size:13px;line-height:1.5;">
                Thanks for using Bayside Video Studio.<br>
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
        <!-- End main card -->

      </td>
    </tr>
  </table>
</body>
</html>`,
  });

  console.log(`[Email] Sent successfully`);
}
