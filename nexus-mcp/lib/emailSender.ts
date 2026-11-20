import nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export interface EmailOptions {
  to: string;
  sessionId: string;
  topic: string;
  verdict: string;
  confidence: number;
  riskLevel: string;
  riskScore: number;
  driveLink?: string;
  username?: string;
  documentPath?: string;
}

/**
 * Creates a configured Nodemailer transporter using Gmail SMTP and Google App Password.
 */
function getTransporter() {
  const user = process.env.GMAIL_USER || process.env.ADMIN_EMAIL;
  const rawPass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !rawPass) {
    console.warn('⚠️ [EMAIL] GMAIL_USER or GMAIL_APP_PASSWORD is not set in .env');
    return null;
  }

  // Remove spaces from Google App Password (e.g. "bzcg gacq cuwd djel" -> "bzcgacqcuwddjel")
  const pass = rawPass.replace(/\s+/g, '');

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass,
    },
  });
}

/**
 * Sends a legal briefing notification email directly via Gmail SMTP.
 */
export async function sendDirectEmail(opts: EmailOptions): Promise<boolean> {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn('⚠️ [EMAIL] Transporter could not be initialized. Skipping email send.');
      return false;
    }

    const recipient = opts.to || process.env.ADMIN_EMAIL || process.env.GMAIL_USER;
    if (!recipient) {
      console.warn('⚠️ [EMAIL] No recipient email specified.');
      return false;
    }

    const riskColor = opts.riskLevel.toLowerCase() === 'high' ? '#ef4444' : opts.riskLevel.toLowerCase() === 'low' ? '#22c55e' : '#f59e0b';
    const confidencePct = Math.round(opts.confidence <= 1 ? opts.confidence * 100 : opts.confidence);
    const shortId = opts.sessionId ? opts.sessionId.substring(0, 8) : 'N/A';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0d14; color: #e4e4ef; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #13141f; border-radius: 12px; border: 1px solid #232438; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e1f33 0%, #13141f 100%); padding: 24px; border-bottom: 1px solid #232438; text-align: center; }
    .title { color: #f59e0b; font-size: 20px; font-weight: 700; margin: 0; letter-spacing: 1px; }
    .subtitle { color: #8c8da6; font-size: 12px; margin-top: 6px; letter-spacing: 2px; text-transform: uppercase; }
    .body { padding: 24px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .meta-card { background: #1a1b2e; padding: 12px 16px; border-radius: 8px; border: 1px solid #282a44; }
    .meta-label { font-size: 11px; color: #767894; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .meta-val { font-size: 16px; font-weight: 700; }
    .verdict-box { background: #18192c; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px; }
    .verdict-title { font-size: 13px; font-weight: 700; color: #f59e0b; margin-bottom: 8px; text-transform: uppercase; }
    .verdict-text { font-size: 14px; line-height: 1.6; color: #d0d1e6; white-space: pre-wrap; }
    .btn { display: inline-block; background: #f59e0b; color: #000000; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none; text-align: center; margin-top: 10px; }
    .footer { text-align: center; padding: 20px; font-size: 11px; color: #5a5c78; border-top: 1px solid #1e1f33; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">⚖️ DHARMARAKSHA</h1>
      <div class="subtitle">AI Legal Tribunal Analysis Report</div>
    </div>
    <div class="body">
      <div class="meta-grid">
        <div class="meta-card">
          <div class="meta-label">Risk Rating</div>
          <div class="meta-val" style="color: ${riskColor};">${opts.riskLevel.toUpperCase()} (${opts.riskScore}/100)</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Confidence Score</div>
          <div class="meta-val" style="color: #22c55e;">${confidencePct}%</div>
        </div>
      </div>

      <div class="meta-card" style="margin-bottom: 20px;">
        <div class="meta-label">Subject / Topic</div>
        <div style="font-size: 14px; color: #e4e4ef; margin-top: 4px;">${opts.topic}</div>
      </div>

      <div class="verdict-box">
        <div class="verdict-title">Tribunal Executive Verdict</div>
        <div class="verdict-text">${opts.verdict}</div>
      </div>

      ${opts.driveLink ? `
      <div style="text-align: center; margin-top: 24px;">
        <a href="${opts.driveLink}" class="btn" target="_blank">📄 View & Download Full PDF Report</a>
      </div>` : ''}
    </div>
    <div class="footer">
      Session ID: ${opts.sessionId} • Triggered by: ${opts.username || 'System User'}<br>
      DHARMARAKSHA Multi-Agent Indian Law Tribunal
    </div>
  </div>
</body>
</html>`;

    const attachments: any[] = [];
    if (opts.documentPath && fs.existsSync(opts.documentPath)) {
      attachments.push({
        filename: path.basename(opts.documentPath),
        path: opts.documentPath,
      });
    }

    const mailOptions = {
      from: `"DHARMARAKSHA Legal Tribunal" <${process.env.GMAIL_USER || process.env.ADMIN_EMAIL}>`,
      to: recipient,
      subject: `⚖️ [DHARMARAKSHA] Legal Analysis Report — ${opts.topic.substring(0, 45)} [Risk: ${opts.riskLevel.toUpperCase()}]`,
      text: `DHARMARAKSHA Legal Analysis Report\n\nSession: ${opts.sessionId}\nTopic: ${opts.topic}\nRisk: ${opts.riskLevel.toUpperCase()} (Score: ${opts.riskScore})\nConfidence: ${confidencePct}%\n\nVerdict:\n${opts.verdict}\n\n${opts.driveLink ? `Document URL: ${opts.driveLink}\n` : ''}`,
      html: htmlContent,
      attachments: attachments,
    };

    console.log(`📧 [EMAIL] Dispatching email to: ${recipient}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [EMAIL] Email sent successfully! MessageId: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`❌ [EMAIL] Direct email sending failed:`, error.message || error);
    return false;
  }
}
