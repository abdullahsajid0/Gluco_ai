/**
 * Email Server using Resend HTTP API
 * Works on Railway, Render, and all cloud platforms!
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001; // Railway uses dynamic PORT
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Enable CORS
app.use(cors());
app.use(express.json());

// Verify Resend API key on startup
if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY not configured!');
  console.log('');
  console.log('⚠️  Get your FREE Resend API key:');
  console.log('   1. Visit: https://resend.com/signup');
  console.log('   2. Create account (free 3,000 emails/month)');
  console.log('   3. Go to Settings → API Keys');
  console.log('   4. Create new API key');
  console.log('   5. Add to Railway Variables: RESEND_API_KEY=re_...');
  console.log('');
} else {
  console.log('✅ Email server is ready to send emails via Resend');
}

// Send email using Resend HTTP API
async function sendEmailViaResend(from, to, subject, html) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from,
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${error}`);
  }

  return await response.json();
}

// Emergency alert endpoint
app.post('/send-emergency-alert', async (req, res) => {
  try {
    const { patientName, bgl, trend, alertType, timestamp, doctorEmails } = req.body;

    console.log('');
    console.log('📧 Sending emergency alert...');
    console.log('   Patient:', patientName);
    console.log('   Alert:', alertType);
    console.log('   BGL:', bgl, 'mg/dL');
    console.log('   Trend:', trend);
    console.log('   Recipients:', doctorEmails);

    // Generate email HTML
    const emailHTML = generateAlertEmail({
      patientName,
      bgl,
      trend,
      alertType,
      timestamp,
    });

    // Send email to all doctors using Resend
    const emailPromises = doctorEmails.map((email) =>
      sendEmailViaResend(
        'Glucós Emergency Alert <onboarding@resend.dev>',
        email,
        `🚨 URGENT: ${alertType} Alert for ${patientName}`,
        emailHTML
      )
    );

    const results = await Promise.allSettled(emailPromises);

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    // Log errors for failed emails
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`❌ Failed to send to ${doctorEmails[index]}:`, result.reason.message || result.reason);
      }
    });

    console.log(`✉️  Emails sent: ${successful} successful, ${failed} failed`);
    console.log('');

    res.json({
      success: true,
      message: `Emergency alert sent to ${successful} doctor(s)`,
      results: {
        successful,
        failed,
        total: doctorEmails.length,
      },
    });
  } catch (error) {
    console.error('❌ Email sending error:', error.message);
    res.status(500).json({
      error: error.message,
      success: false,
    });
  }
});

// Weekly report endpoint
app.post('/send-weekly-report', async (req, res) => {
  try {
    const { patientName, weeklyData, doctorEmails } = req.body;

    console.log('');
    console.log('📋 Sending weekly report...');
    console.log('   Patient:', patientName);
    console.log('   Period: Last 7 days');
    console.log('   Recipients:', doctorEmails);

    // Generate report HTML
    const reportHTML = generateWeeklyReportEmail(patientName, weeklyData);

    // Send email to all doctors using Resend
    const emailPromises = doctorEmails.map((email) =>
      sendEmailViaResend(
        'Glucós Weekly Report <onboarding@resend.dev>',
        email,
        `📊 Weekly Diabetes Report - ${patientName}`,
        reportHTML
      )
    );

    const results = await Promise.allSettled(emailPromises);

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    // Log errors for failed emails
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`❌ Failed to send to ${doctorEmails[index]}:`, result.reason.message || result.reason);
      }
    });

    console.log(`✉️  Reports sent: ${successful} successful, ${failed} failed`);
    console.log('');

    res.json({
      success: true,
      message: `Weekly report sent to ${successful} doctor(s)`,
      results: {
        successful,
        failed,
        total: doctorEmails.length,
      },
    });
  } catch (error) {
    console.error('❌ Report sending error:', error.message);
    res.status(500).json({
      error: error.message,
      success: false,
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Glucós Email Server (Resend)',
    timestamp: new Date().toISOString(),
    configured: !!RESEND_API_KEY,
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🏥 Glucós Email Server (Resend API)');
  console.log('=' .repeat(50));
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📧 Email Provider: Resend`);
  console.log(`🔑 API Key: ${RESEND_API_KEY ? 'Configured ✅' : 'NOT CONFIGURED ❌'}`);
  console.log('=' .repeat(50));
  console.log('');
  
  if (!RESEND_API_KEY) {
    console.log('⚠️  WARNING: Resend API Key not configured!');
    console.log('');
    console.log('📝 Setup Instructions:');
    console.log('   1. Sign up at https://resend.com (FREE)');
    console.log('   2. Get API key from Settings → API Keys');
    console.log('   3. Add to Railway Variables: RESEND_API_KEY=re_...');
    console.log('');
  }
});

// Email HTML template generator
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
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.6; 
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, ${alertColor} 0%, #991b1b 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .alert-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .content {
      background: white;
      padding: 30px;
      border: 3px solid ${alertColor};
      border-top: none;
      border-radius: 0 0 10px 10px;
    }
    .critical-box {
      background: ${bgColor};
      border-left: 5px solid ${alertColor};
      padding: 20px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .glucose-reading {
      font-size: 48px;
      font-weight: bold;
      color: ${alertColor};
      text-align: center;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-label {
      font-weight: bold;
      color: #6b7280;
    }
    .action-box {
      background: #f3f4f6;
      padding: 20px;
      margin: 20px 0;
      border-radius: 5px;
      border-left: 5px solid #3b82f6;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
    }
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
        <p style="margin: 0; font-size: 16px;">
          Your patient <strong>${patientName}</strong> has experienced a critical glucose event that requires immediate medical attention.
        </p>
      </div>

      <div class="glucose-reading">
        ${bgl} mg/dL ${trendIcon}
      </div>

      <div style="background: #f9fafb; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <div class="info-row">
          <span class="info-label">Patient:</span>
          <span>${patientName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Alert Type:</span>
          <span style="color: ${alertColor}; font-weight: bold;">${alertType}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Blood Glucose:</span>
          <span style="color: ${alertColor}; font-weight: bold;">${bgl} mg/dL</span>
        </div>
        <div class="info-row">
          <span class="info-label">Trend:</span>
          <span>${trend} ${trendIcon}</span>
        </div>
        <div class="info-row" style="border-bottom: none;">
          <span class="info-label">Timestamp:</span>
          <span>${new Date(timestamp).toLocaleString()}</span>
        </div>
      </div>

      <div class="action-box">
        <h3 style="margin-top: 0; color: #1f2937;">📋 Recommended Actions:</h3>
        ${
          isLow
            ? `
        <ul style="margin: 10px 0;">
          <li><strong>Immediate:</strong> Contact patient to verify consciousness and ability to treat</li>
          <li><strong>Treatment:</strong> Ensure patient consumes 15-20g fast-acting carbohydrates</li>
          <li><strong>Monitoring:</strong> Recheck glucose in 15 minutes</li>
          <li><strong>Follow-up:</strong> If unconscious or unable to respond, call emergency services</li>
          <li><strong>Review:</strong> Assess insulin doses and timing to prevent future episodes</li>
        </ul>
        `
            : `
        <ul style="margin: 10px 0;">
          <li><strong>Immediate:</strong> Contact patient to verify symptoms (thirst, frequent urination)</li>
          <li><strong>Assessment:</strong> Check for ketones if Type 1 diabetes</li>
          <li><strong>Hydration:</strong> Ensure adequate water intake</li>
          <li><strong>Correction:</strong> Consider correction dose per patient's ISF</li>
          <li><strong>Monitoring:</strong> Recheck glucose in 2-3 hours</li>
          <li><strong>Emergency:</strong> If BGL > 400 mg/dL or ketones present, seek immediate care</li>
        </ul>
        `
        }
      </div>

      <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e;">
          <strong>⚠️ Important:</strong> This alert is generated by AI-powered monitoring. Please verify patient status and glucose reading through direct contact.
        </p>
      </div>
    </div>

    <div class="footer">
      <p><strong>Glucós</strong> - AI-Powered Diabetes Care Team</p>
      <p>This email was sent to you as an emergency contact for ${patientName}</p>
      <p style="font-size: 12px; color: #9ca3af;">
        Generated at ${new Date().toLocaleString()}
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function getTrendIcon(trend) {
  switch (trend.toLowerCase()) {
    case 'double_up':
      return '⇈';
    case 'up':
      return '↗';
    case 'steady':
      return '→';
    case 'down':
      return '↘';
    case 'double_down':
      return '⇊';
    default:
      return '→';
  }
}

// Weekly report email generator
function generateWeeklyReportEmail(patientName, weeklyData) {
  const stats = weeklyData.summary;
  const timeInRangeColor = stats.timeInRange >= 70 ? '#10b981' : stats.timeInRange >= 50 ? '#f59e0b' : '#dc2626';

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.6; 
      color: #333;
      margin: 0;
      padding: 0;
      background: #f3f4f6;
    }
    .container { 
      max-width: 700px; 
      margin: 20px auto; 
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .content {
      padding: 30px;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin: 20px 0;
    }
    .metric-card {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }
    .metric-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      font-weight: bold;
    }
    .metric-value {
      font-size: 32px;
      font-weight: bold;
      color: #1f2937;
      margin: 5px 0;
    }
    .metric-unit {
      font-size: 14px;
      color: #6b7280;
    }
    .time-in-range-bar {
      height: 30px;
      background: #e5e7eb;
      border-radius: 15px;
      overflow: hidden;
      margin: 20px 0;
    }
    .tir-fill {
      height: 100%;
      background: ${timeInRangeColor};
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
    }
    .section-title {
      font-size: 20px;
      font-weight: bold;
      color: #1f2937;
      margin: 30px 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    .event-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: bold;
      margin-right: 10px;
    }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .footer {
      background: #f9fafb;
      padding: 20px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f3f4f6;
      font-weight: bold;
      color: #374151;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">📊 Weekly Diabetes Report</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">7-Day Analysis for ${patientName}</p>
      <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">${new Date().toLocaleDateString()} - ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
    </div>
    
    <div class="content">
      <!-- Executive Summary -->
      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 30px; border-radius: 5px;">
        <h3 style="margin-top: 0; color: #1e40af;">📋 Executive Summary</h3>
        <p style="margin: 0; font-size: 16px;">
          ${stats.timeInRange >= 70 ? '✅ Excellent glycemic control maintained this week.' : 
            stats.timeInRange >= 50 ? '⚠️ Moderate glycemic control. Some adjustments recommended.' :
            '⚠️ Glucose control requires attention and intervention.'}
        </p>
      </div>

      <!-- Key Metrics Grid -->
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-label">Average Glucose</div>
          <div class="metric-value">${stats.avgBGL}</div>
          <div class="metric-unit">mg/dL</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Total Readings</div>
          <div class="metric-value">${stats.readings}</div>
          <div class="metric-unit">measurements</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Total Insulin</div>
          <div class="metric-value">${stats.totalInsulin}</div>
          <div class="metric-unit">units</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Avg Carbs/Meal</div>
          <div class="metric-value">${stats.avgCarbs}</div>
          <div class="metric-unit">grams</div>
        </div>
      </div>

      <!-- Time in Range -->
      <div class="section-title">⏱️ Time in Range Analysis</div>
      <div class="time-in-range-bar">
        <div class="tir-fill" style="width: ${stats.timeInRange}%">
          ${stats.timeInRange}% in Range (70-180 mg/dL)
        </div>
      </div>
      
      <table>
        <tr>
          <th>Range</th>
          <th>Percentage</th>
          <th>Status</th>
        </tr>
        <tr>
          <td>Below Range (&lt;70 mg/dL)</td>
          <td>${stats.timeBelowRange}%</td>
          <td>
            ${stats.timeBelowRange > 4 ? '<span class="event-badge badge-danger">High</span>' : 
              stats.timeBelowRange > 1 ? '<span class="event-badge badge-warning">Moderate</span>' :
              '<span class="event-badge badge-success">Good</span>'}
          </td>
        </tr>
        <tr>
          <td>In Range (70-180 mg/dL)</td>
          <td><strong>${stats.timeInRange}%</strong></td>
          <td>
            ${stats.timeInRange >= 70 ? '<span class="event-badge badge-success">Excellent</span>' : 
              stats.timeInRange >= 50 ? '<span class="event-badge badge-warning">Moderate</span>' :
              '<span class="event-badge badge-danger">Poor</span>'}
          </td>
        </tr>
        <tr>
          <td>Above Range (&gt;180 mg/dL)</td>
          <td>${stats.timeAboveRange}%</td>
          <td>
            ${stats.timeAboveRange > 25 ? '<span class="event-badge badge-danger">High</span>' : 
              stats.timeAboveRange > 10 ? '<span class="event-badge badge-warning">Moderate</span>' :
              '<span class="event-badge badge-success">Good</span>'}
          </td>
        </tr>
      </table>

      <!-- Notable Events -->
      <div class="section-title">⚠️ Notable Events</div>
      <table>
        <tr>
          <th>Event Type</th>
          <th>Count</th>
          <th>Recommendation</th>
        </tr>
        <tr>
          <td>Hypoglycemic Episodes (&lt;70 mg/dL)</td>
          <td><strong>${stats.hypoEvents}</strong></td>
          <td>
            ${stats.hypoEvents > 3 ? 'Consider reducing basal or pre-meal insulin' : 
              stats.hypoEvents > 0 ? 'Monitor timing and causes' : 
              'Well managed'}
          </td>
        </tr>
        <tr>
          <td>Hyperglycemic Episodes (&gt;250 mg/dL)</td>
          <td><strong>${stats.hyperEvents}</strong></td>
          <td>
            ${stats.hyperEvents > 5 ? 'Review carb counting and insulin doses' : 
              stats.hyperEvents > 0 ? 'Monitor post-meal patterns' : 
              'Well managed'}
          </td>
        </tr>
      </table>

      <!-- Clinical Recommendations -->
      <div class="section-title">💡 Clinical Recommendations</div>
      <ul style="line-height: 1.8;">
        ${stats.timeInRange < 70 ? '<li><strong>Improve Time in Range:</strong> Target is ≥70%. Consider adjusting basal insulin or meal timing.</li>' : ''}
        ${stats.hypoEvents > 3 ? '<li><strong>Address Hypoglycemia:</strong> ' + stats.hypoEvents + ' episodes detected. Review insulin doses, especially before exercise or sleep.</li>' : ''}
        ${stats.hyperEvents > 5 ? '<li><strong>Reduce Hyperglycemia:</strong> ' + stats.hyperEvents + ' episodes detected. Consider carb counting accuracy and bolus timing.</li>' : ''}
        ${stats.avgBGL > 180 ? '<li><strong>Lower Average Glucose:</strong> Current average of ' + stats.avgBGL + ' mg/dL is above target. Review overall insulin regimen.</li>' : ''}
        ${stats.avgBGL < 100 ? '<li><strong>Raise Average Glucose:</strong> Current average of ' + stats.avgBGL + ' mg/dL may be too low. Consider reducing insulin doses.</li>' : ''}
        ${stats.timeInRange >= 70 && stats.hypoEvents < 2 ? '<li><strong>Excellent Control:</strong> Continue current management strategy. Keep monitoring patterns.</li>' : ''}
      </ul>

      <!-- Medication Summary -->
      <div class="section-title">💉 Medication Summary</div>
      <table>
        <tr>
          <th>Metric</th>
          <th>Value</th>
        </tr>
        <tr>
          <td>Total Insulin (7 days)</td>
          <td><strong>${stats.totalInsulin} units</strong></td>
        </tr>
        <tr>
          <td>Average Daily Insulin</td>
          <td><strong>${(stats.totalInsulin / 7).toFixed(1)} units/day</strong></td>
        </tr>
      </table>

      <!-- Dietary Summary -->
      <div class="section-title">🍽️ Dietary Summary</div>
      <table>
        <tr>
          <th>Metric</th>
          <th>Value</th>
        </tr>
        <tr>
          <td>Average Carbs per Meal</td>
          <td><strong>${stats.avgCarbs}g</strong></td>
        </tr>
        <tr>
          <td>Meals Logged</td>
          <td><strong>${weeklyData.meals?.length || 0}</strong></td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <p><strong>Glucós</strong> - AI-Powered Diabetes Care Team</p>
      <p>Report generated on ${new Date().toLocaleString()}</p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 10px;">
        This report is generated by AI analysis. Please correlate with clinical judgment and patient consultation.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

