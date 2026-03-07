# 🚀 Quick Start Guide - MediScribe AI

## 📋 Prerequisites Checklist

Before you begin, ensure you have:
- [ ] Node.js 20.19+ or 22.12+ installed
- [ ] npm 10.x or higher
- [ ] Git (optional, for version control)
- [ ] A code editor (VS Code recommended)
- [ ] A modern web browser (Chrome, Firefox, Safari, or Edge)

## ⚡ Quick Setup (5 minutes)

### 1. Navigate to Project
```bash
cd ai-medical-scribe
```

### 2. Install Dependencies
```bash
npm install
```
*This will install all required packages (~200MB)*

### 3. Start Development Server
```bash
npm run dev
```

### 4. Open in Browser
Navigate to: `http://localhost:5173`

### 5. Login with Demo Credentials
```
Email: sarah.johnson@hospital.com
Password: password123
```

## 🎯 What to Try First

### Test the Core Features

1. **Dashboard**
   - View statistics cards
   - Check recent consultations
   - Click "Start New Consultation"

2. **Start Consultation**
   - Click the microphone button
   - Allow browser microphone access
   - Speak or click stop to see transcript
   - Click "Generate Medical Notes"

3. **View Generated Notes**
   - See SOAP formatted notes
   - Click "Edit" to modify
   - Try "Regenerate with AI"
   - Save the notes

4. **Patient Records**
   - Search for patients
   - Filter by date
   - Click "View" on any patient
   - Explore consultation history

5. **Settings**
   - Update profile information
   - Toggle notification preferences
   - Explore security options

## 📁 Project Structure Overview

```
src/
├── components/       → Reusable UI components
│   └── layout/      → Sidebar, Header, DashboardLayout
├── pages/           → Application pages/routes
├── context/         → React Context (state management)
├── services/        → API service layer
├── utils/           → Helper functions & mock data
├── hooks/           → Custom React hooks
├── App.jsx          → Main app with routing
└── main.jsx         → Entry point with providers
```

## 🛠️ Available Commands

```bash
# Development
npm run dev          # Start dev server (http://localhost:5173)

# Production
npm run build        # Build for production (outputs to /dist)
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
```

## 🎨 Customization Guide

### Change Color Scheme

Edit `tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      primary: '#2563EB',    // Your main color
      background: '#F8FAFC', // Background color
      accent: '#14B8A6',     // Accent color
    },
  },
}
```

### Add a New Page

1. Create page component in `src/pages/YourPage.jsx`
2. Add route in `src/App.jsx`
3. Add navigation item in `src/components/layout/Sidebar.jsx`

Example:
```javascript
// In App.jsx
<Route path="your-page" element={<YourPage />} />

// In Sidebar.jsx
{ path: '/your-page', icon: YourIcon, label: 'Your Page' }
```

## 🔌 Connect to Real Backend

### 1. Create `.env` file
```bash
cp .env.example .env
```

### 2. Set API URL
```env
VITE_API_URL=https://your-api.com/api
```

### 3. Update API Calls
Replace mock data with real API calls in page components:

```javascript
// Before (mock)
await new Promise(resolve => setTimeout(resolve, 1000));
setData(mockData);

// After (real API)
const data = await apiFunction();
setData(data);
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5173
npx kill-port 5173
# Or use a different port
npm run dev -- --port 3000
```

### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Microphone Not Working
1. Check browser permissions (usually top-left/right of address bar)
2. Ensure you're using HTTPS or localhost
3. Try a different browser

### Styling Not Applied
```bash
# Rebuild Tailwind
npm run build
```

## 📚 Learning Resources

### Understanding the Code

- **Context API**: See `src/context/AppContext.jsx` for state management
- **Routing**: Check `src/App.jsx` for route configuration
- **API Layer**: Review `src/services/api.js` for backend communication
- **Mock Data**: Explore `src/utils/mockData.js` to understand data structure

### Key Technologies

- [React Documentation](https://react.dev/)
- [React Router](https://reactrouter.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Lucide Icons](https://lucide.dev/)

## 🔍 Code Examples

### Create a New Stat Card
```javascript
<StatCard
  icon={YourIcon}
  title="Your Metric"
  value="123"
  trend="Trending up"
  color="primary"
/>
```

### Show a Toast Notification
```javascript
const toast = useToast();

// Success message
toast.success('Operation completed!');

// Error message
toast.error('Something went wrong');
```

### Add a Modal
```javascript
const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  size="md"
>
  Your content here
</Modal>
```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```
Output will be in `dist/` folder.

### Deploy Options

**Vercel** (Recommended)
```bash
npm install -g vercel
vercel
```

**Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**Custom Server**
```bash
# Upload dist/ folder to your server
# Configure web server to serve index.html for all routes
```

## 💡 Pro Tips

1. **Hot Reload**: Changes auto-reload in dev mode - no need to refresh!

2. **Component Inspection**: Install React DevTools browser extension

3. **Network Debugging**: Use browser DevTools Network tab to see API calls

4. **State Debugging**: Add console.logs in Context providers to track state

5. **CSS Debugging**: Use browser element inspector to see Tailwind classes

6. **Search Shortcuts**: Cmd/Ctrl + P to quickly find files in VS Code

## 🤝 Need Help?

- Check `FEATURES.md` for detailed feature documentation
- Review `README.md` for comprehensive project info
- Inspect component code - includes helpful comments
- Look at mock data in `src/utils/mockData.js` for data structure examples

## ✅ Verification Checklist

After setup, verify:
- [ ] Dev server starts without errors
- [ ] Can login with demo credentials
- [ ] Dashboard loads with statistics
- [ ] Can navigate between pages
- [ ] Microphone can be accessed
- [ ] Toast notifications appear
- [ ] No console errors in browser

---

**Ready to build amazing healthcare software! 🏥**
