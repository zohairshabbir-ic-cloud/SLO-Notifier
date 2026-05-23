const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { gmailUser, gmailPass, toEmail, ccEmail, subject, htmlBody } = req.body;

  if (!gmailUser || !gmailPass || !toEmail || !htmlBody) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Parse and validate multiple emails
  const parseEmails = (raw) => raw.split(',').map(e => e.trim()).filter(e => e.length > 0);
  const validateEmails = (emails) => emails.every(e => emailRegex.test(e));

  const toList = parseEmails(toEmail);
  const ccList = ccEmail ? parseEmails(ccEmail) : [];

  if (!validateEmails(toList)) return res.status(400).json({ error: 'One or more To addresses are invalid.' });
  if (ccList.length && !validateEmails(ccList)) return res.status(400).json({ error: 'One or more CC addresses are invalid.' });
  if (!emailRegex.test(gmailUser)) return res.status(400).json({ error: 'Invalid Gmail address.' });

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass }
    });

    const mailOptions = {
      from: `SLO Notifier <${gmailUser}>`,
      to:   toList.join(', '),
      subject: subject || 'SLO Alert — Action Required',
      html: htmlBody
    };
    if (ccList.length) mailOptions.cc = ccList.join(', ');

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, message: `Email sent to ${toList.length + ccList.length} recipient(s)` });

  } catch (err) {
    console.error('Email send error:', err.message);
    if (err.message.includes('Invalid login') || err.message.includes('Username and Password')) {
      return res.status(401).json({ error: 'Gmail login failed. Check your email and App Password.' });
    }
    if (err.message.includes('app-specific password')) {
      return res.status(401).json({ error: 'You need a Gmail App Password, not your regular password.' });
    }
    return res.status(500).json({ error: `Send failed: ${err.message}` });
  }
}
