// Send transactional emails using Brevo (formerly Sendinblue) HTTP API.
// This avoids port-blocking issues on cloud hosting providers like Render.

const QRCode = require('qrcode');

/**
 * Generates a compact, pure-HTML QR code table from raw QR matrix data.
 * 
 * KEY OPTIMISATIONS (to stay under Gmail's 102 KB email clipping limit):
 * 1. Run-length encoding — consecutive same-colour cells in a row are
 *    merged with colspan, cutting element count by ~3×.
 * 2. Uses HTML `bgcolor` attribute instead of verbose CSS properties.
 * 3. Error correction M (not H) — keeps module count low while still
 *    allowing 15 % damage recovery, which is plenty for on-screen display.
 * 4. Minimal quiet zone in the table; the wrapper <div> padding provides
 *    the rest of the required white margin.
 */
const generateQRHtmlTable = (qrPayload) => {
  const qr = QRCode.create(qrPayload, { errorCorrectionLevel: 'M' });
  const modules = qr.modules;
  const size = modules.size;
  const data = modules.data;       // Uint8Array — 1 = dark, 0 = light
  const px = 7;                    // pixels per module
  const qz = 1;                    // quiet-zone modules (wrapper div adds more)
  const total = size + qz * 2;

  // Helper: is the module at (row, col) dark?
  const dark = (r, c) => {
    const qr = r - qz, qc = c - qz;
    return qr >= 0 && qr < size && qc >= 0 && qc < size && !!data[qr * size + qc];
  };

  let html = '<table cellpadding="0" cellspacing="0" border="0" ' +
    'style="border-collapse:collapse;margin:0 auto;">';

  for (let r = 0; r < total; r++) {
    html += `<tr style="height:${px}px;line-height:${px}px;font-size:0;">`;
    let c = 0;
    while (c < total) {
      const isDark = dark(r, c);
      // Count consecutive cells of the same colour (run-length)
      let span = 1;
      while (c + span < total && dark(r, c + span) === isDark) span++;

      const bg = isDark ? '#000' : '#fff';
      if (span > 1) {
        html += `<td colspan="${span}" width="${px * span}" height="${px}" bgcolor="${bg}" style="padding:0"></td>`;
      } else {
        html += `<td width="${px}" height="${px}" bgcolor="${bg}" style="padding:0"></td>`;
      }
      c += span;
    }
    html += '</tr>';
  }
  html += '</table>';
  return html;
};

const sendQREmail = async (email, name, eventName, qrCodeId) => {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      throw new Error('BREVO_API_KEY is missing in environment variables');
    }

    const senderEmail = process.env.EMAIL_USER || 'aloksinghrajput2405@gmail.com';
    const senderName = process.env.EVENT_NAME || 'Alok Events';

    // Generate the QR code as a pure HTML table (no images needed)
    const qrPayload = JSON.stringify({ qrCodeId });
    const qrHtmlTable = generateQRHtmlTable(qrPayload);

    const body = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [
        {
          email: email,
          name: name,
        },
      ],
      subject: `🎉 Get Ready! Here is your Ticket for ${eventName}`,
      htmlContent: `
        <div style="background-color: #0d0a1b; padding: 40px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center;">
          <div style="max-width: 600px; margin: 0 auto; background: #161233; border: 2px solid #ff007f; border-radius: 24px; padding: 35px; box-shadow: 0 10px 30px rgba(255, 0, 127, 0.25);">
            
            <!-- Funky Header -->
            <h1 style="color: #00f0ff; margin-top: 0; font-size: 28px; letter-spacing: 1px; text-shadow: 0 0 10px rgba(0, 240, 255, 0.5);">
              YOU'RE IN! 🚀
            </h1>
            
            <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Hey <strong style="color: #ff007f;">${name}</strong>, your spot is locked and loaded for <strong style="color: #00f0ff;">${eventName}</strong>. Get ready for an epic experience!
            </p>
            
            <!-- Ticket Card Box -->
            <div style="background-color: #0d0a1b; border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 16px; padding: 25px; margin: 25px 0;">
              <span style="color: #a0aec0; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">
                SCAN AT ENTRY GATES
              </span>
              
              <div style="margin: 20px 0;">
                <!-- QR Code rendered as a pure HTML table — works in ALL email clients -->
                <div style="display:inline-block; padding: 14px; background-color: #ffffff; border: 4px solid #ff007f; border-radius: 12px; box-shadow: 0 0 20px rgba(255, 0, 127, 0.4);">
                  ${qrHtmlTable}
                </div>
              </div>
              
              <div style="color: #00f0ff; font-weight: bold; font-size: 15px; margin-top: 10px; letter-spacing: 0.5px;">
                🎟️ DIGITAL PASS
              </div>
            </div>
            
            <p style="color: #a0aec0; font-size: 12px; margin-top: 20px;">
              💡 <em>Keep this QR code handy on your phone at the entry gate. Do not share it with others!</em>
            </p>
            
            <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0;">
            
            <p style="color: #ff007f; font-size: 14px; font-weight: bold; margin-bottom: 0;">
              Let's make some memories! ✨
            </p>
            
          </div>
        </div>
      `
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brevo API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`QR Email sent to ${email} via Brevo: ${data.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending QR email via Brevo:', error);
    throw error;
  }
};

const sendOTPEmail = async (email, name, eventName, otp) => {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      throw new Error('BREVO_API_KEY is missing in environment variables');
    }

    const senderEmail = process.env.EMAIL_USER || 'aloksinghrajput2405@gmail.com';
    const senderName = process.env.EVENT_NAME || 'Alok Events';

    const body = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [
        {
          email: email,
          name: name,
        },
      ],
      subject: `🔑 ${otp} is your verification code for ${eventName}`,
      htmlContent: `
        <div style="background-color: #0d0a1b; padding: 40px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center;">
          <div style="max-width: 500px; margin: 0 auto; background: #161233; border: 2px solid #00f0ff; border-radius: 24px; padding: 35px; box-shadow: 0 10px 30px rgba(0, 240, 255, 0.25);">
            
            <!-- Funky Header -->
            <h1 style="color: #ff007f; margin-top: 0; font-size: 26px; letter-spacing: 1px; text-shadow: 0 0 10px rgba(255, 0, 127, 0.4);">
              Verification Code ⚡
            </h1>
            
            <p style="color: #e2e8f0; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
              Hey <strong style="color: #00f0ff;">${name}</strong>, thank you for registering for <strong style="color: #ff007f;">${eventName}</strong>!<br>
              Let's make sure this is your active email. Copy the code below:
            </p>
            
            <!-- Cool Verification Code Display -->
            <div style="margin: 30px 0;">
              <span style="font-size: 36px; font-weight: 900; letter-spacing: 6px; color: #00f0ff; background-color: #0d0a1b; padding: 12px 30px; border-radius: 12px; border: 2px dashed #ff007f; text-shadow: 0 0 8px rgba(0, 240, 255, 0.5); display: inline-block;">
                ${otp}
              </span>
            </div>
            
            <p style="color: #a0aec0; font-size: 13px;">
              ⏰ This code is valid for <strong style="color: #e2e8f0;">10 minutes</strong>.
            </p>
            
            <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0;">
            
            <p style="color: #a0aec0; font-size: 11px; margin-bottom: 0;">
              If you didn't start this registration, simply ignore this email.
            </p>
            
          </div>
        </div>
      `
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brevo API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`OTP Email sent to ${email} via Brevo: ${data.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending OTP email via Brevo:', error);
    throw error;
  }
};

module.exports = {
  sendQREmail,
  sendOTPEmail
};
