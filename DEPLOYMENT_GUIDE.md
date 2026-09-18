# 🚀 KRISH AGRICULTURE — ઓનલાઈન ડિપ્લોયમેન્ટ માર્ગદર્શિકા (Online Deployment Guide)

આ એપ્લિકેશન **સિંગલ-સર્વિસ પ્રોડક્શન-રેડી (Unified Full-Stack)** આર્કિટેક્ચરમાં કન્વર્ટ કરી દેવામાં આવી છે. એટલે કે બેકએન્ડ (Node.js API) અને ફ્રન્ટએન્ડ (React.js) બંને એક જ સર્વર પર એકસાથે ચાલે છે.

તમે નીચેનામાંથી કોઈપણ પદ્ધતિ પસંદ કરી શકો છો:

---

## 🌟 વિકલ્પ ૧: Render.com પર ડિપ્લોય કરવું (સૌથી સરળ & ઝડપી)

[Render.com](https://render.com) પર તમે ગિટહબ (GitHub) દ્વારા સીધું જ ફ્રી / ઓછા ખર્ચે ઓનલાઈન મૂકી શકો છો.

### પગલાં:
1. **GitHub પર કોડ અપલોડ કરો:**
   - આ પ્રોજેક્ટને તમારા GitHub એકાઉન્ટમાં નવું પ્રાઇવેટ અથવા પબ્લિક Repository બનાવીને પુશ (Push) કરો.
   ```bash
   git init
   git add .
   git commit -m "Krish Agriculture Production Ready"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/krish-billing.git
   git push -u origin main
   ```

2. **Render.com પર એકાઉન્ટ બનાવો:**
   - [Render.com](https://render.com) પર જાઓ અને GitHub થી સાઇન ઇન કરો.

3. **નવી Web Service બનાવો:**
   - **"New +"** બટન પર ક્લિક કરો અને **"Web Service"** પસંદ કરો.
   - તમારું GitHub repository પસંદ કરો.

4. **સેટિંગ્સ ભરો:**
   - **Name:** `krish-agriculture-billing`
   - **Region:** `Singapore` (ભારત માટે સૌથી નજીક અને ફાસ્ટ)
   - **Runtime:** `Node`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free` અથવા `Starter`

5. **ડેટાબેઝ સેવ રાખવા માટે (Persistent Disk):**
   - પેજના નીચે **"Disks"** સેક્શનમાં **"Add Disk"** ક્લિક કરો:
     - **Name:** `krish-db-data`
     - **Mount Path:** `/app/backend/database` (અથવા `backend/database`)
     - **Size:** `1 GB` (વર્ષો સુધી પૂરતો છે)

6. **Deploy Web Service પર ક્લિક કરો:**
   - ૨ થી ૩ મિનિટમાં એપ્લિકેશન લાઈવ થઈ જશે અને તમને ફ્રી લિંક મળશે:
     `https://krish-agriculture-billing.onrender.com`

---

## 💼 વિકલ્પ ૨: પોતાનું ક્લાઉડ VPS સર્વર (Hostinger / DigitalOcean / Hetzner)
*(કાયમી બિઝનેસ માટે સૌથી બેસ્ટ અને ભરોસાપાત્ર - અંદાજે ₹300 થી ₹400 / મહિનો)*

જો તમે તમારું પોતાનું ડોમેન (દા.ત. `bill.krishagriculture.com`) રાખવા માંગતા હોવ તો આ શ્રેષ્ઠ વિકલ્પ છે.

### પદ્ધતિ A: Docker વડે ૧-ક્લિક ડિપ્લોયમેન્ટ (સૌથી સરળ):
સર્વર પર પ્રોજેક્ટ ક્લોન કરીને માત્ર આ એક કમાન્ડ ચલાવો:
```bash
docker compose up -d --build
```
બસ! તમારી આખી એપ્લિકેશન ડેટાબેઝ સેવ સાથે પોર્ટ `5000` પર લાઈવ થઈ જશે.

### પદ્ધતિ B: PM2 અને Nginx વડે ડિપ્લોયમેન્ટ:
```bash
# 1. પેકેજ ઇન્સ્ટોલ કરો અને બિલ્ડ કરો
npm run install:all
npm run build

# 2. PM2 વડે સર્વરને ૨૪ કલાક ચાલુ રાખો
npm install -g pm2
pm2 start backend/server.js --name "krish-billing"
pm2 startup
pm2 save

# 3. Nginx રિવર્સ પ્રોક્સિથી પોર્ટ 5000 ને તમારા ડોમેન સાથે જોડો
# 4. ફ્રી SSL સર્ટિફિકેટ (HTTPS) ઇન્સ્ટોલ કરો:
sudo certbot --nginx -d bill.krishagriculture.com
```

---

## ⚡ વિકલ્પ ૩: Railway.app વડે ડિપ્લોય કરવું

1. [Railway.app](https://railway.app) પર જાઓ અને GitHub થી લૉગિન કરો.
2. **"New Project"** &rarr; **"Deploy from GitHub repo"** સિલેક્ટ કરો.
3. Settings માં જઈને **Volume** એડ કરો:
   - **Mount Path:** `/app/backend/database`
4. Deploy પર ક્લિક કરો. રેલ્વે તમને તરત જ HTTPS લાઈવ URL આપી દેશે.

---

## 🔒 સિક્યોરિટી અને બેકઅપ
- લાઈવ થયા પછી તમે **Admin Portal &rarr; Backup & Export** માંથી ગમે ત્યારે આખા ડેટાબેઝનું **JSON Backup** અથવા એકાઉન્ટિંગ માટે **CSV ફાઇલો** ડાઉનલોડ કરીને તમારા કમ્પ્યુટર પર સેવ રાખી શકો છો.
