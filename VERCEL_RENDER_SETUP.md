# 🚀 KRISH AGRICULTURE: Vercel (Frontend) + Render (Backend & DB) સેટઅપ માર્ગદર્શિકા

તમે પસંદ કરેલું આર્કિટેક્ચર સૌથી શ્રેષ્ઠ અને આધુનિક છે:
- **Frontend on Vercel:** હાઇ-સ્પીડ ગ્લોબલ CDN, સુપરફાસ્ટ લોડિંગ, ફ્રી SSL સર્ટિફિકેટ.
- **Backend & Database on Render:** Node.js API અને SQLite ડેટાબેઝ સેવ રાખવા માટે Persistent Disk સાથે ૨૪/૭ લાઈવ રહેશે.

---

## 📍 સ્ટેપ ૧: પહેલાં Backend & Database ને Render પર લાઈવ કરો
*(પહેલાં બેકએન્ડ એટલા માટે ચાલુ કરવાનું જેથી આપણને બેકએન્ડની URL લિંક મળી જાય, જે આપણે Vercel માં નાખી શકીએ).*

1. **કોડ GitHub પર Push કરો:**
   ```bash
   git init
   git add .
   git commit -m "Deploy Krish Agriculture"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/krish-billing.git
   git push -u origin main
   ```

2. **Render.com પર જાઓ:**
   - [render.com](https://render.com) પર તમારા GitHub એકાઉન્ટથી લૉગિન કરો.
   - **"New +"** બટન પર ક્લિક કરીને **"Web Service"** પસંદ કરો.
   - તમારું GitHub repository સિલેક્ટ કરો.

3. **આ વિગતો ભરો:**
   - **Name:** `krish-agriculture-api`
   - **Region:** `Singapore` (ભારત માટે સૌથી ઝડપી)
   - **Runtime:** `Node`
   - **Build Command:** `npm --prefix backend install`
   - **Start Command:** `node backend/server.js`
   - **Instance Type:** `Free` (અથવા કાયમી ચાલુ રાખવા માટે `Starter`)

4. **ડેટા સેવ રાખવા માટે ડિસ્ક જોડો (ખાસ મહત્વનું):**
   - પેજના નીચે **"Disks"** સેક્શનમાં **"Add Disk"** ક્લિક કરો:
     - **Name:** `krish-db-disk`
     - **Mount Path:** `/app/backend/database`
     - **Size:** `1 GB`

5. **"Deploy Web Service"** પર ક્લિક કરો.
   - ૨ મિનિટમાં તમારું બેકએન્ડ લાઈવ થઈ જશે અને તમને લિંક મળશે:
     👉 `https://krish-agriculture-api.onrender.com`
   - ચેક કરવા માટે બ્રાઉઝરમાં ખોલો: `https://krish-agriculture-api.onrender.com/api/health` (ત્યાં `{"status":"ok"}` દેખાશે).

---

## 📍 સ્ટેપ ૨: હવે Frontend ને Vercel પર લાઈવ કરો

1. [vercel.com](https://vercel.com) પર જાઓ અને GitHub થી લૉગિન કરો.
2. **"Add New..." &rarr; "Project"** પર ક્લિક કરો.
3. તમારું `krish-billing` વાળું repository સિલેક્ટ કરીને **"Import"** કરો.
4. **પ્રોજેક્ટ સેટિંગ્સ:**
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend` પસંદ કરો (અથવા Edit કરીને `frontend` ફોલ્ડર સિલેક્ટ કરો).
5. **Render ની લિંક Vercel સાથે જોડો (Environment Variables):**
   - **Environment Variables** સેક્શન ખોલો:
     - **Key (Name):** `VITE_API_URL`
     - **Value:** `https://krish-agriculture-api.onrender.com/api` *(સ્ટેપ ૧ માં મળેલી તમારી Render વાળી લિંક અને છેલ્લે `/api` લખો)*
6. **"Deploy"** બટન પર ક્લિક કરો.
7. ૩૦ થી ૪૫ સેકન્ડમાં Vercel તમને તમારી ફાઇનલ લાઈવ લિંક આપી દેશે:
   🎉 **`https://krish-agriculture.vercel.app`**

---

## 🎯 સ્ટેપ ૩: ટેસ્ટિંગ અને ઉપયોગ
- તમારી Vercel લિંક ઓપન કરો: `https://krish-agriculture.vercel.app`
- લૉગિન કરો:
  - **Admin:** `admin` / `Admin@123`
- ટેસ્ટ બિલ બનાવો અને પ્રિન્ટ કરો &rarr; તમામ ડેટા Render ના ડેટાબેઝમાં કાયમ માટે ૧૦૦% સુરક્ષિત સેવ રહેશે!
