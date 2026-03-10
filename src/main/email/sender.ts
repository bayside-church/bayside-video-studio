import Mailgun from 'mailgun.js';
import formData from 'form-data';
import { MAILGUN_API_KEY, MAILGUN_DOMAIN, EMAIL_FROM, isDev } from '../config';

let mg: ReturnType<InstanceType<typeof Mailgun>['client']> | null = null;

function getClient() {
  if (!mg) {
    const mailgun = new Mailgun(formData);
    mg = mailgun.client({ username: 'api', key: MAILGUN_API_KEY });
  }
  return mg;
}

export async function sendPlaybackEmail(
  toEmail: string,
  playbackUrl: string,
): Promise<void> {
  if (isDev) {
    console.log(`[Dev] Would send email to ${toEmail} with URL: ${playbackUrl}`);
    return;
  }

  await getClient().messages.create(MAILGUN_DOMAIN, {
    from: EMAIL_FROM,
    to: [toEmail],
    subject: 'Your Bayside Video Studio Recording is Ready!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <h1 style="color: #ffffff; font-size: 28px; margin: 0;">Bayside Video Studio</h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <p style="color: #d1d5db; font-size: 18px; line-height: 1.6; margin: 0;">
                Your recording is ready to watch!
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 30px 0;">
              <a href="${playbackUrl.replace(/"/g, '&quot;')}"
                 style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 18px; font-weight: 600; text-decoration: none; padding: 16px 40px; border-radius: 12px;">
                Watch Your Video
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 30px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                Thanks for visiting Bayside Video Studio!
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });

  console.log(`[Email] Sent successfully`);
}
