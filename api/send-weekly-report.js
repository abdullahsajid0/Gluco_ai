/**
 * Vercel Serverless Function - Weekly Report
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
    const { patientName, weeklyData, doctorEmails } = req.body;

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

    // Generate report HTML (simplified for now)
    const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f3f4f6; }
    .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; }
    h1 { color: #1f2937; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Weekly Diabetes Report</h1>
    <p><strong>Patient:</strong> ${patientName}</p>
    <p><strong>Period:</strong> Last 7 days</p>
    <p>Detailed report data will appear here.</p>
  </div>
</body>
</html>`;

    // Send emails
    const emailPromises = doctorEmails.map((email) =>
      transporter.sendMail({
        from: `"Glucós Weekly Report" <${process.env.BREVO_SENDER_EMAIL}>`,
        to: email,
        subject: `📊 Weekly Diabetes Report - ${patientName}`,
        html: reportHTML,
      })
    );

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return res.status(200).json({
      success: true,
      message: `Weekly report sent to ${successful} doctor(s)`,
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

