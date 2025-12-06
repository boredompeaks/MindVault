# 🚀 MindVault Setup Guide

Complete guide to set up and run MindVault locally.

---

## 📋 Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** or **yarn**
- **Google Gemini API Key** (free tier available)

---

## 🔑 Step 1: Get Your Gemini API Keys

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Get API Key"**
4. Click **"Create API key"**
5. Copy your API key (keep it secret!)

**Optional:** Create a second API key for load balancing

---

## 📦 Step 2: Install Dependencies

```bash
# Clone the repository (or download as ZIP)
cd MindVault

# Install dependencies
npm install
```

---

## ⚙️ Step 3: Configure Environment Variables

1. **Copy the example environment file:**

```bash
cp .env.example .env
```

2. **Edit `.env` file:**

```bash
# Open .env in your text editor
# Replace the placeholder values with your actual API keys

VITE_API_KEY_1=your_actual_api_key_here
VITE_API_KEY_2=your_second_api_key_here_optional
```

**Important:** 
- Never commit `.env` to version control (already in `.gitignore`)
- You need at least ONE API key (`VITE_API_KEY_1`)
- The second key is optional but enables better load distribution

---

## 🎯 Step 4: Run the Development Server

```bash
npm run dev
```

The app will start at: **http://localhost:3000**

---

## 🏗️ Step 5: Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` folder.

**Preview the build:**

```bash
npm run preview
```

---

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)

1. Push your code to GitHub
2. Import project to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Option 2: Netlify

1. Push your code to GitHub
2. Import project to [Netlify](https://netlify.com)
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Add environment variables
6. Deploy!

### Option 3: GitHub Pages

1. Update `vite.config.ts` with your repo name:
```typescript
export default defineConfig({
  base: '/your-repo-name/',
  // ... rest of config
});
```

2. Build and deploy:
```bash
npm run build
git add dist -f
git commit -m "Deploy"
git subtree push --prefix dist origin gh-pages
```

---

## 🧪 Verification Checklist

After setup, verify everything works:

- [ ] App loads without errors
- [ ] Can create a new note
- [ ] Can generate quiz from note
- [ ] AI chat responds to questions
- [ ] Can attach images/PDFs
- [ ] Can export/import notes
- [ ] Global notes load in sidebar
- [ ] Can fork global notes
- [ ] Dashboard shows statistics

---

## 🐛 Troubleshooting

### Issue: "No API Keys found!"

**Solution:**
1. Check `.env` file exists
2. Verify API keys are correct (no spaces, no quotes)
3. Restart dev server after changing `.env`
4. Check console for detailed error messages

### Issue: Global notes don't load

**Solution:**
1. Verify `/public/content/` folder exists
2. Check `notes-index.json` is valid JSON
3. Open browser console for error details
4. Try clearing browser cache

### Issue: IndexedDB errors

**Solution:**
1. Open browser DevTools
2. Go to Application > Storage > IndexedDB
3. Delete `MindVaultDB`
4. Refresh the page

### Issue: "Failed to fetch" errors

**Solution:**
1. Check your internet connection
2. Verify API keys are active (not revoked)
3. Check if you've hit API rate limits
4. Try using a second API key

---

## 🔒 Security Best Practices

1. **Never commit `.env` file**
   - Already in `.gitignore`
   - Always use `.env.example` as template

2. **Rotate API keys regularly**
   - Generate new keys every few months
   - Revoke old keys in AI Studio

3. **Use environment-specific keys**
   - Different keys for dev/staging/production
   - Monitor usage in Google Cloud Console

4. **Rate limiting awareness**
   - Free tier: 60 requests/minute
   - Use two keys for 120 requests/minute
   - Implement request queuing if needed

---

## 📊 Usage Limits (Free Tier)

**Gemini API Free Tier:**
- 60 requests per minute per key
- 1,500 requests per day
- 1 million tokens per day

**Tips to stay within limits:**
- Use two API keys (doubles limits)
- Avoid rapid-fire requests
- Cache AI responses when possible

---

## 🎓 Next Steps

After successful setup:

1. **Explore Features:**
   - Read the "Getting Started" global note
   - Try generating quizzes
   - Upload study materials
   - Use Deep Study mode

2. **Customize:**
   - Add your own subjects in `constants.ts`
   - Create custom global notes
   - Adjust auto-save delay in `NoteEditorPage.tsx`

3. **Contribute:**
   - Report bugs on GitHub
   - Submit pull requests
   - Share your custom global notes
   - Improve documentation

---

## 📞 Support

**Need help?**
- Check `IMPLEMENTATION_REPORT.md` for technical details
- Review sample global notes for examples
- Open an issue on GitHub
- Check browser console for error details

---

## 🎉 You're All Set!

Enjoy using MindVault for your studies! 🚀📚

**Pro Tips:**
- Use the AI assistant frequently
- Generate quizzes to test understanding
- Organize notes with subjects and tags
- Fork community notes as templates
- Export your vault regularly as backup

Happy studying! ✨
