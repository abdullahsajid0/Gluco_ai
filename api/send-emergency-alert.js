/**
 * Vercel Serverless Function - Emergency Alert
 */

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { patientName, bgl, trend, alertType, timestamp, doctorEmails } = req.body;

    // Create Brevo transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SENDER_EMAIL,
        pass: process.env.BREVO_SMTP_KEY,
      },
    });

    // Generate email HTML
    const emailHTML = generateAlertEmail({
      patientName,
      bgl,
      trend,
      alertType,
      timestamp,
    });

    // Send emails
    const emailPromises = doctorEmails.map((email) =>
      transporter.sendMail({
        from: `"Glucós Emergency Alert" <${process.env.BREVO_SENDER_EMAIL}>`,
        to: email,
        subject: `🚨 URGENT: ${alertType} Alert for ${patientName}`,
        html: emailHTML,
      })
    );

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return res.status(200).json({
      success: true,
      message: `Emergency alert sent to ${successful} doctor(s)`,
      results: { successful, failed, total: doctorEmails.length },
    });
  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({
      error: error.message,
      success: false,
    });
  }
}

function generateAlertEmail({ patientName, bgl, trend, alertType, timestamp }) {
  const trendIcon = getTrendIcon(trend);
  const isLow = alertType.toLowerCase().includes('hypo');
  const alertColor = isLow ? '#dc2626' : '#ea580c';
  const bgColor = isLow ? '#fee2e2' : '#fed7aa';

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, ${alertColor} 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .alert-icon { font-size: 48px; margin-bottom: 10px; }
    .content { background: white; padding: 30px; border: 3px solid ${alertColor}; border-top: none; border-radius: 0 0 10px 10px; }
    .critical-box { background: ${bgColor}; border-left: 5px solid ${alertColor}; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .glucose-reading { font-size: 48px; font-weight: bold; color: ${alertColor}; text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="alert-icon">🚨</div>
      <h1 style="margin: 0;">CRITICAL GLUCOSE ALERT</h1>
      <p style="margin: 10px 0 0 0; font-size: 18px;">${alertType}</p>
    </div>
    <div class="content">
      <div class="critical-box">
        <h2 style="margin-top: 0; color: ${alertColor};">⚠️ IMMEDIATE ATTENTION REQUIRED</h2>
        <p>Your patient <strong>${patientName}</strong> has experienced a critical glucose event.</p>
      </div>
      <div class="glucose-reading">${bgl} mg/dL ${trendIcon}</div>
      <p><strong>Patient:</strong> ${patientName}</p>
      <p><strong>Alert Type:</strong> ${alertType}</p>
      <p><strong>Trend:</strong> ${trend} ${trendIcon}</p>
      <p><strong>Time:</strong> ${new Date(timestamp).toLocaleString()}</p>
    </div>
  </div>
</body>
</html>`;
}

function getTrendIcon(trend) {
  const icons = {
    double_up: '⇈',
    up: '↗',
    steady: '→',
    down: '↘',
    double_down: '⇊',
  };
  return icons[trend.toLowerCase()] || '→';
}

