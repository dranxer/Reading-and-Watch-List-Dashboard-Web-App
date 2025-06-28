# 🚀 CurioLog Simple Extension Setup

## Quick Start (5 minutes)

### 1. Install the Simple Extension

1. **Open Chrome** and go to `chrome://extensions/`
2. **Enable Developer mode** (toggle in top-right)
3. **Click "Load unpacked"**
4. **Select** the `packages/extension` folder
5. **Rename** the following files:
   - `manifest-simple.json` → `manifest.json` (replace the existing one)
   - Keep `background-simple.js` and `popup-simple.html` as they are

### 2. Test the Extension

1. **Click the extension icon** in your toolbar
2. **You should see**: "✅ Connection OK"
3. **Try the buttons**:
   - **Test Connection** → Should show ping response
   - **Get Status** → Should show current status
   - **Sign In** → Should open `localhost:3000/sign-in?extension=true`

### 3. Expected Results

**✅ If Working:**
```
Status: ✅ Connection OK
Ping: {"pong":true,"status":"ok"}
Status: {"authenticated":false,"apiUrl":"http://localhost:3000","itemCount":0}
```

**❌ If Not Working:**
```
Status: ❌ Connection failed: Could not establish connection
```

## Simple Troubleshooting

### If you see connection errors:

1. **Reload the extension**:
   - Go to `chrome://extensions/`
   - Click the reload button (↻) on "CurioLog Simple"

2. **Check the background console**:
   - Go to `chrome://extensions/`
   - Click "Details" on CurioLog Simple
   - Click "Inspect views: background page"
   - Look for errors

3. **Nuclear option**:
   - Remove the extension completely
   - Load it again with `manifest-simple.json` renamed to `manifest.json`

## What This Simple Version Does

- ✅ **Basic connection** between popup and background
- ✅ **Simple authentication** (opens sign-in page)
- ✅ **Status checking**
- ✅ **Error handling** with timeouts
- ❌ **No content extraction** (too complex for basic version)
- ❌ **No token management** (too complex for basic version)

## Next Steps

Once this simple version works:

1. **Test sign-in flow** - click "Sign In" and complete authentication
2. **Check browser console** for any errors during sign-in
3. **Verify** `localhost:3000` is running (`npm run dev` in `packages/website`)

This basic implementation proves the extension communication works!

## Files Used

- `manifest-simple.json` → Main extension config
- `background-simple.js` → Simple background script (60 lines)
- `popup-simple.html` → Basic popup UI
- `popup-simple.js` → Simple popup logic (100 lines)

**Total: ~200 lines vs 1000+ in the complex version** 🎯 