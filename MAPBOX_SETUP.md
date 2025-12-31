# Mapbox Setup Instructions

## Get Your Free Mapbox API Key

The flight map visualization uses Mapbox GL JS. You need a free API token to enable the map.

### Steps to Get Your Token:

1. **Create a Free Account**
   - Go to: https://account.mapbox.com/auth/signup/
   - Sign up with your email (it's completely free)

2. **Get Your Access Token**
   - After signup, you'll see your **Default public token**
   - Copy the token (starts with `pk.`)

3. **Add Token to the Application**
   - Open: `frontend/src/components/FlightMap.tsx`
   - Line 7: Replace the placeholder token with your real token:
   
   ```typescript
   mapboxgl.accessToken = "pk.YOUR_ACTUAL_TOKEN_HERE";
   ```

### Free Tier Limits:
- ✅ 50,000 free map loads per month
- ✅ Perfect for development and demos
- ✅ No credit card required

### Example Token Format:
```
pk.eyJ1IjoieW91cm5hbWUiLCJhIjoiY2xrMTIzNDU2Nzg5MGFiY2RlZmdoIjp9.aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
```

## Current Status

The flight map will show a Mapbox error until you add your token. All other features work normally.

**Map Features Once Configured:**
- ✈️ Live flight tracker with 8 sample flights
- 🌍 Interactive 3D globe view
- 🎨 Color-coded flight status (scheduled, boarding, in-flight, delayed, cancelled)
- 📊 Real-time statistics
- 🔍 Filter flights by status
- 📍 Airport markers with popups
- ✨ Great circle routes connecting origins and destinations

---

**Quick Start:** Replace token → Save file → Frontend hot-reloads automatically
