# 🏥 Glucós - AI Diabetes Companion

An advanced multi-agent AI system for comprehensive diabetes management, powered by Gemini and Groq.

## 🌟 Features

- 🤖 **Multi-Agent AI System** - Specialized agents for different aspects of diabetes care
- 📊 **Real-time Glucose Monitoring** - Continuous tracking with intelligent alerts
- 🍽️ **AI Meal Analysis** - Vision-powered carb counting from food photos
- 💉 **Insulin Management** - Smart tracking and recommendations
- 📧 **Emergency Alerts** - Automatic email notifications to doctors
- 📈 **Weekly Reports** - Comprehensive health summaries for medical team
- 🎯 **Lifestyle Coaching** - Personalized guidance and trend analysis

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Gmail account with App Password
- Supabase account (free tier)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd glucos-ai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   
   Create a file named `.env` in the project root with these variables:
   ```bash
   # Supabase Configuration
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   
   # Email Server URL
   # Development: http://localhost:3001
   # Production: https://your-email-server.onrender.com
   VITE_EMAIL_SERVER_URL=http://localhost:3001
   
   # Gmail SMTP Configuration
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-gmail-app-password
   
   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:8080
   ```

4. **Get Gmail App Password:**
   - Visit: https://myaccount.google.com/apppasswords
   - Create app password for "Glucos Email Server"
   - Copy the 16-digit code to `GMAIL_APP_PASSWORD`

5. **Run the application:**
   ```bash
   # Terminal 1: Start frontend
npm run dev
   
   # Terminal 2: Start email server
   npm run email-server
   ```

6. **Open in browser:**
   Visit http://localhost:8080

## 🏗️ Architecture

### Multi-Agent System

- **Master Orchestrator** (Gemini 2.5 Pro) - Routes requests to specialized agents
- **Guardian** (Groq/Llama 3.1) - Ultra-fast real-time glucose monitoring
- **Nutritionist** (Gemini Vision) - Meal analysis with vision AI
- **Lifestyle Coach** (Gemini) - Long-term trend analysis
- **Secretary** (Email Reports) - Weekly summaries to doctors

### Tech Stack

**Frontend:**
- React + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- React Markdown

**Backend:**
- Supabase Edge Functions (Deno)
- Node.js + Express (Email Server)
- Nodemailer (Gmail SMTP)

**AI:**
- Google Gemini 2.5 Pro
- Groq (Llama 3.1 8B Instant)

## 📦 Deployment

### Deploy to Production (100% Free!)

#### 1. Email Server → Render.com

1. Push code to GitHub
2. Sign up at https://render.com
3. Create "Web Service" from your repository
4. Add environment variables:
   ```
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-app-password
   FRONTEND_URL=https://your-app.vercel.app
   NODE_VERSION=18.0.0
   ```
5. Deploy (auto-detected via `render.yaml`)
6. Copy your Render URL

#### 2. Frontend → Vercel

1. Sign up at https://vercel.com
2. Import your GitHub repository
3. Add environment variables:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_EMAIL_SERVER_URL=https://your-render-url.onrender.com
   ```
4. Deploy
5. Copy your Vercel URL

#### 3. Connect Services

Update Render environment:
- `FRONTEND_URL` → Your Vercel URL

#### 4. Keep Alive (Optional but Recommended)

Use UptimeRobot (free) to ping your Render server every 5 minutes:
- URL: `https://your-render-url.onrender.com/health`
- Prevents free tier from sleeping

### Cost Breakdown

| Service | Free Tier | Usage |
|---------|-----------|-------|
| Vercel | Unlimited | Frontend |
| Render | 750 hrs/month | Email (24/7) |
| Supabase | 500K requests | AI Functions |
| **Total** | **$0/month** | Everything |

## 🔐 Security

- ✅ No hardcoded secrets in code
- ✅ Environment variables for all sensitive data
- ✅ `.env` files excluded from Git
- ✅ HTTPS enforced in production
- ✅ Gmail App Passwords (never regular passwords)
- ✅ CORS properly configured

## 🧪 Testing

### Test Emergency Alerts

1. Enter glucose reading < 70 or > 250 mg/dL
2. Check configured doctor emails
3. Verify alert email received

### Test Weekly Reports

1. Use app for a few days to generate data
2. Click "Generate Report" in chat
3. Check doctor emails for HTML report
4. Verify summary displayed in chat

### Test Meal Analysis

1. Upload a photo of a meal
2. AI analyzes and estimates carbs
3. Meal automatically logged
4. Carb count appears in stats

## 📱 Features in Detail

### Real-time Glucose Monitoring
- Manual entry or simulated CGM
- Trend analysis (up, down, steady)
- Critical level alerts
- Time in range statistics

### AI Meal Analysis
- Upload food photos
- Automatic carb counting
- Insulin dose recommendations
- Meal history tracking

### Emergency Alerts
- Automatic email to doctors
- Configurable doctor contacts
- Critical glucose thresholds
- Real-time notifications

### Weekly Reports
- Comprehensive health metrics
- Time in range analysis
- Meal and insulin logs
- Trend identification
- PDF-ready HTML format

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start frontend dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run email-server # Start email server locally
```

### Project Structure

```
glucos-ai/
├── src/
│   ├── components/     # React components
│   ├── services/       # Business logic & AI agents
│   ├── pages/          # Page components
│   └── lib/            # Utilities
├── supabase/
│   └── functions/      # Edge Functions (AI agents)
├── email-server.mjs    # Local email server
└── render.yaml         # Render.com config
```

## 🤝 Contributing

This is a demonstration project. Feel free to fork and adapt for your needs!

## ⚠️ Disclaimer

This application is for educational and demonstration purposes. It should not replace professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare providers for diabetes management.

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Built with [Lovable](https://lovable.dev)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- AI powered by [Google Gemini](https://deepmind.google/technologies/gemini/) and [Groq](https://groq.com)

## 📞 Support

For issues and questions:
- Check environment variables are set correctly
- Verify Gmail App Password is valid
- Check Render and Vercel logs for errors
- Ensure CORS URLs match exactly

---

**Built with ❤️ for better diabetes management**
