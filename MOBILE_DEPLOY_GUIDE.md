# HobbyHub - Mobile App Store Deployment Guide

This guide walks you through converting your React/Vite/TypeScript web app into native iOS and Android apps using Capacitor, then publishing to the App Store and Google Play Store.

---

## 1. File Tree

```
hobbyhub/
|
|-- android/                          # Android native project (auto-generated)
|   |-- app/
|   |   |-- build.gradle              # App config, versionCode, versionName
|   |   |-- src/main/
|   |   |   |-- AndroidManifest.xml   # Permissions, app ID
|   |   |   |-- res/
|   |   |   |   |-- mipmap-*/        # App icons (auto-generated)
|   |   |   |   |-- drawable-*/      # Splash screens (auto-generated)
|   |-- build.gradle                  # Project-level config
|   |-- gradle.properties             # Gradle settings
|
|-- ios/                              # iOS native project (auto-generated)
|   |-- App/
|   |   |-- App.xcodeproj/            # Xcode project
|   |   |-- App.xcworkspace/          # Xcode workspace
|   |   |-- App/
|   |   |   |-- Assets.xcassets/
|   |   |   |   |-- AppIcon.appiconset/    # 25 iOS icon sizes
|   |   |   |   |-- Splash.imageset/       # Splash screens
|   |   |   |-- Info.plist            # App metadata
|   |   |   |-- AppDelegate.swift     # App lifecycle
|   |   |-- Podfile                   # iOS dependencies
|
|-- resources/
|   |-- icon.png                      # Source icon (1024x1024)
|   |-- splash.png                    # Source splash (9:16)
|
|-- src/
|   |-- context/
|   |   |-- AuthContext.tsx           # Auth state (localStorage)
|   |   |-- PostContext.tsx           # Post CRUD (localStorage)
|   |   |-- NotificationContext.tsx   # Notification system
|   |-- components/
|   |   |-- ui/                       # shadcn/ui components
|   |   |   |-- button.tsx
|   |   |   |-- input.tsx
|   |   |   |-- card.tsx
|   |   |   |-- avatar.tsx
|   |   |   |-- sheet.tsx
|   |   |   |-- alert.tsx
|   |   |   |-- label.tsx
|   |   |   |-- sonner.tsx
|   |   |-- Navbar.tsx               # Mobile-optimized nav
|   |   |-- ProtectedRoute.tsx       # Auth guard
|   |   |-- Layout.tsx               # Page wrapper with <Outlet />
|   |-- pages/
|   |   |-- Login.tsx                # shadcn/ui login form
|   |   |-- Signup.tsx               # shadcn/ui signup form
|   |   |-- Home.tsx                 # Landing page
|   |   |-- Explore.tsx              # Community discovery
|   |   |-- Community.tsx            # Community feed
|   |   |-- Profile.tsx              # User profile
|   |   |-- CreatePost.tsx           # Post creation
|   |-- App.tsx                      # Routes + providers
|   |-- main.tsx                     # Entry point (no providers)
|   |-- index.css                    # Global styles + Tailwind
|
|-- capacitor.config.ts               # Capacitor configuration
|-- index.html                        # Mobile meta tags
|-- vite.config.ts                    # Vite config
|-- tailwind.config.js                # Tailwind + shadcn theme
|-- package.json                      # Dependencies + scripts
```

---

## 2. Files That Need Modification

### `index.html` - Mobile Meta Tags

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="theme-color" content="#0f1115" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="format-detection" content="telephone=no" />
    <title>HobbyHub</title>
    <style>
      html, body {
        background-color: #0f1115 !important;
        overscroll-behavior-y: none;
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### `capacitor.config.ts` - Capacitor Configuration

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hobbyhub.app',
  appName: 'HobbyHub',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#0f1115',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f1115',
    },
    Keyboard: {
      resize: 'body',
    },
  },
};

export default config;
```

### `package.json` - Scripts

Add these scripts to your existing `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "app:ios": "npm run build && npx cap sync ios && npx cap open ios",
    "app:android": "npm run build && npx cap sync android && npx cap open android",
    "cap:sync": "npm run build && npx cap sync"
  }
}
```

### `main.tsx` - Clean Entry Point

```tsx
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(<App />)
```

### `App.tsx` - Routes with Nested Layout

```tsx
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PostProvider } from './context/PostContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Community from './pages/Community';
import CreatePost from './pages/CreatePost';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <AuthProvider>
      <PostProvider>
        <NotificationProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Home />} />
                <Route path="explore" element={<Explore />} />
                <Route path="community/:id" element={<Community />} />
                <Route path="create-post" element={<CreatePost />} />
                <Route path="profile" element={<Profile />} />
              </Route>
            </Routes>
          </Router>
          <Toaster />
        </NotificationProvider>
      </PostProvider>
    </AuthProvider>
  );
}

export default App;
```

---

## 3. Step-by-Step Terminal Script

### Prerequisites

```bash
# macOS only (for iOS). For Android, any OS works.

# 1. Install Node.js 20+
node -v  # Should be v20+

# 2. Install Xcode from Mac App Store (iOS only)
# 3. Install Android Studio from https://developer.android.com/studio

# 4. Install CocoaPods (iOS only)
sudo gem install cocoapods

# 5. Verify Android SDK path
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
```

### Full Setup Script

```bash
# ============================================================
# STEP 1: Install Capacitor dependencies
# ============================================================
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android @capacitor/app @capacitor/keyboard @capacitor/status-bar @capacitor/splash-screen

# ============================================================
# STEP 2: Build production assets
# ============================================================
npm run build

# ============================================================
# STEP 3: Initialize Capacitor (creates capacitor.config.ts)
# ============================================================
npx cap init HobbyHub com.hobbyhub.app --web-dir dist

# ============================================================
# STEP 4: Add native platforms
# ============================================================
npx cap add ios
npx cap add android

# ============================================================
# STEP 5: Generate app icons and splash screens
# ============================================================
# Place source images in resources/:
#   - resources/icon.png    (1024x1024 minimum)
#   - resources/splash.png  (9:16 aspect ratio)
#
# The iOS and Android icon generation is done via a build script
# that resizes these sources to all required dimensions.

# ============================================================
# STEP 6: Sync web assets to native platforms
# ============================================================
npx cap sync

# ============================================================
# STEP 7: Open native IDEs
# ============================================================
npx cap open ios       # Opens Xcode
npx cap open android   # Opens Android Studio
```

### Shortcut (After Initial Setup)

```bash
# All-in-one for iOS
npm run app:ios

# All-in-one for Android
npm run app:android

# Just sync after code changes
npm run cap:sync
```

---

## 4. Xcode Steps (iOS -> App Store)

### Step 4.1: Configure Signing

1. Open `ios/App/App.xcodeproj` in Xcode
2. Click the `App` project in the left navigator
3. Select `App` under **TARGETS**
4. Go to **Signing & Capabilities** tab
5. Select your **Team** (Apple Developer account required)
6. Verify **Bundle Identifier**: `com.hobbyhub.app`

### Step 4.2: Set Version

1. Go to **General** tab
2. Set **Version**: `1.0.0`
3. Set **Build**: `1`
4. Set **iOS Deployment Target**: `14.0`

### Step 4.3: Archive and Upload

1. Select **Any iOS Device (arm64)** as build target
2. Go to **Product > Archive** (wait for build)
3. **Organizer** window opens automatically
4. Click **Distribute App**
5. Select **App Store Connect**
6. Select **Upload**
7. Click **Next** through all prompts
8. Wait for upload to complete

### Step 4.4: Submit on App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click **My Apps > + > New App**
3. Fill in:
   - **Platforms**: iOS
   - **Name**: HobbyHub
   - **Primary Language**: English
   - **Bundle ID**: com.hobbyhub.app
   - **SKU**: hobbyhub-001
4. Go to **App Store** tab > **App Information**
   - **Category**: Social Networking
   - **Content Rights**: No
5. Go to **Pricing and Availability**: Set price (Free)
6. Go to **Prepare for Submission**
   - Upload screenshots (6.5" iPhone, 5.5" iPhone, 12.9" iPad)
   - Add description, keywords, support URL
   - Upload privacy policy
   - Select the build you just uploaded
7. Click **Submit for Review**

**Required:**
- Apple Developer Program ($99/year)
- Screenshots: 6.5" iPhone (1284x2778), 5.5" iPhone (1242x2208)

---

## 5. Android Studio Steps (Android -> Google Play)

### Step 5.1: Configure Build

1. Open `android/` folder in Android Studio
2. Wait for Gradle sync to complete
3. Open `android/app/build.gradle`
4. Update version:

```gradle
android {
    defaultConfig {
        applicationId "com.hobbyhub.app"
        minSdkVersion 22
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
}
```

### Step 5.2: Generate Signing Keystore

```bash
# Run ONCE in terminal
cd android/app

keytool -genkey -v \
  -keystore hobbyhub-release.keystore \
  -alias hobbyhub \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# When prompted, enter:
# Keystore password: [create strong password]
# Key password: [same or different]
# Organization: Your Name
# Organization Unit: HobbyHub
```

### Step 5.3: Configure Signing in Gradle

Create `android/keystore.properties`:

```properties
storeFile=hobbyhub-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=hobbyhub
keyPassword=YOUR_KEY_PASSWORD
```

In `android/app/build.gradle`, add signing config:

```gradle
android {
    signingConfigs {
        release {
            storeFile file("hobbyhub-release.keystore")
            storePassword "YOUR_STORE_PASSWORD"
            keyAlias "hobbyhub"
            keyPassword "YOUR_KEY_PASSWORD"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 5.4: Build App Bundle

```bash
# In Android Studio:
# Build > Generate Signed Bundle / APK > Android App Bundle > Next
# Select keystore, enter passwords > Next > Release > Create
#
# Or via terminal:
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Step 5.5: Submit on Google Play Console

1. Go to https://play.google.com/console
2. Click **Create app**
3. Fill in:
   - **App name**: HobbyHub
   - **Default language**: English
   - **App or game**: App
   - **Free or paid**: Free
4. Go to **Dashboard** and complete all sections:
   - **App access**: All functionality is available without restrictions
   - **Ads**: No, this app does not contain ads
   - **Content rating**: Complete questionnaire (Social Networking)
   - **Target audience**: 18+
   - **News apps**: No
   - **Data safety**: Fill out all forms
   - **Privacy policy**: Add URL
5. Go to **Production > Create new release**
   - Upload the `.aab` file
   - Add release notes
6. Click **Review release** then **Start rollout to Production**

**Required:**
- Google Play Developer account ($25 one-time)
- Feature graphic (1024x500) for store listing
- Screenshots: Phone (up to 8), Tablet (up to 8)

---

## 6. Development Workflow (After Publishing)

After making changes to your web app:

```bash
# 1. Make changes to React code
# 2. Rebuild
npm run build

# 3. Sync to native platforms
npx cap sync

# 4. Rebuild in native IDEs
# iOS: Product > Archive in Xcode
# Android: Build > Generate Signed Bundle in Android Studio
```

### Quick Update Script

```bash
#!/bin/bash
# save as deploy-mobile.sh

echo "Building web app..."
npm run build

echo "Syncing to native platforms..."
npx cap sync

echo "Opening iOS in Xcode..."
npx cap open ios

echo "Opening Android in Android Studio..."
npx cap open android

echo "Done! Build and upload in each IDE."
```

---

## 7. Troubleshooting

| Problem | Solution |
|---------|----------|
| `npx cap add ios` fails | Run on macOS only. Install Xcode from App Store. |
| `npx cap add android` fails | Install Android Studio + SDK Platform-Tools. |
| CocoaPods not found | `sudo gem install cocoapods` then `pod setup` |
| Icons not showing | Ensure `resources/icon.png` is at least 1024x1024 |
| White flash on launch | Set `backgroundColor` in `capacitor.config.ts` to match app theme |
| Keyboard covers input | Set `Keyboard: { resize: 'body' }` in config |
| Status bar is white | Set `StatusBar: { style: 'DARK', backgroundColor: '#0f1115' }` |
| `cap sync` fails | Run `npm run build` first to generate `dist/` |
| Xcode archive fails | Check Signing & Capabilities > Team is selected |
| Android build fails | Check `ANDROID_HOME` env var is set |

---

## 8. Checklist Before Submission

### iOS
- [ ] Apple Developer Program enrolled ($99/year)
- [ ] Bundle ID `com.hobbyhub.app` registered in Apple Developer Portal
- [ ] App Icon (1024x1024) - already generated
- [ ] Screenshots: 6.5" iPhone, 5.5" iPhone, 12.9" iPad
- [ ] App description (up to 4000 chars)
- [ ] Keywords (100 chars max)
- [ ] Support URL
- [ ] Privacy policy URL
- [ ] Content rating set
- [ ] Tested on physical device

### Android
- [ ] Google Play Developer account ($25 one-time)
- [ ] App signing key generated
- [ ] App Bundle (.aab) built
- [ ] Feature graphic (1024x500)
- [ ] Screenshots: Phone + 7" tablet + 10" tablet
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] Privacy policy URL
- [ ] Content rating questionnaire complete
- [ ] Data safety form complete
- [ ] Tested on physical device

---

## 9. Post-Launch Quick Updates

For minor updates (bug fixes, content changes):

```bash
# Update version in capacitor.config.ts
# Update versionCode/versionName in android/app/build.gradle
# Update version/build in Xcode

npm run build
npx cap sync

# Then archive/upload new build in Xcode / Android Studio
# App Store: New build appears in App Store Connect within 10 min
# Google Play: New release can be rolled out immediately
```

Typical review times:
- **iOS**: 24-48 hours
- **Android**: 1-3 days (sometimes a few hours)
