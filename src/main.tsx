import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./services/testDataGenerator"; // Make test data available in console

createRoot(document.getElementById("root")!).render(<App />);

// Welcome message in console
console.log(
  '%c🏥 Glucós Multi-Agent Diabetes System',
  'color: #3b82f6; font-size: 16px; font-weight: bold;'
);
console.log(
  '%c✨ Multi-agent AI powered by Gemini + Groq',
  'color: #10b981; font-size: 12px;'
);
console.log('\n📊 Available console commands:');
console.log('  testData.populateTestData() - Generate 7 days of sample data');
console.log('  testData.clearTestData() - Clear all data and start fresh');
console.log('\n📖 See TESTING_GUIDE.md for comprehensive testing instructions\n');
