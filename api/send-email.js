const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  // CORS headers so the frontend can call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { gmailUser, gmailPass, toEmail, ccEmail, subject, htmlBody } = req.body;

  // Basic validation
  if (!gmailUser || !gmailPass || !toEmail || !htmlBody) {
    return res.status(400).json({ error: 'Missing required fields: gmailUser, gmailPass, toEmail, htmlBody' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(gmailUser)) return res.status(400).json({ error: 'Invalid Gmail address' });
  if (!emailRegex.test(toEmail))   return res.status(400).json({ error: 'Invalid recipient email' });

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass }
    });

    const mailOptions = {
      from: `SLO Notifier <${gmailUser}>`,
      to: toEmail,
      subject: subject || 'SLO Alert — Action Required',
      html: htmlBody
    };
    if (ccEmail && emailRegex.test(ccEmail)) mailOptions.cc = ccEmail;

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, message: 'Email sent successfully' });

  } catch (err) {
    console.error('Email send error:', err.message);
    // Friendly error messages
    if (err.message.includes('Invalid login') || err.message.includes('Username and Password')) {
      return res.status(401).json({ error: 'Gmail login failed. Check your email and App Password.' });
    }
    if (err.message.includes('app-specific password')) {
      return res.status(401).json({ error: 'You need a Gmail App Password, not your regular password. See setup guide.' });
    }
    return res.status(500).json({ error: `Send failed: ${err.message}` });
  }
}
