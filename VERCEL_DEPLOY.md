# ⚡ Vercel પર ડિપ્લોય કરવાની સરળ રીત (Vercel Deployment Guide)

મેં પ્રોજેક્ટમાં **`vercel.json`** કોન્ફિગરેશન ફાઇલ ઉમેરી દીધી છે, જેથી Vercel પર કોઈ પણ 404 એરર વગર તમારી એપ્લિકેશન તરત જ લાઈવ થઈ જશે.

---

## 🚀 રીત ૧: તમારા ટર્મિનલમાંથી સીધું જ Vercel પર ડિપ્લોય કરવું (૨ મિનિટ)

તમારા કમ્પ્યુટરમાં PowerShell અથવા Command Prompt ખોલો અને નીચેનો કમાન્ડ રન કરો:

```powershell
npx vercel
```

### શું થશે?
1. ટર્મિનલમાં પૂછશે: **`Log in to Vercel`** &rarr; **Enter** આપો (બ્રાઉઝરમાં પેજ ખુલશે, ત્યાં લૉગિન કરી લો).
2. લૉગિન થયા પછી ટર્મિનલમાં પૂછશે:
   - `Set up and deploy?` &rarr; **y** લખીને Enter
   - `Which scope?` &rarr; તમારું નામ/એકાઉન્ટ &rarr; Enter
   - `Link to existing project?` &rarr; **n** &rarr; Enter
   - `What's your project's name?` &rarr; **krish-agriculture** &rarr; Enter
   - `In which directory is your code located?` &rarr; **./** &rarr; Enter
3. ફક્ત ૩૦ સેકન્ડમાં Vercel તમને લાઈવ લિંક આપી દેશે:
   👉 **`https://krish-agriculture.vercel.app`**

પ્રોડક્શન માટે ફાઇનલ કમાન્ડ:
```powershell
npx vercel --prod
```

---

## 🌐 રીત ૨: GitHub દ્વારા Vercel વેબસાઇટ પરથી (સૌથી પ્રખ્યાત રીત)

1. આ પ્રોજેક્ટને તમારા GitHub માં Push કરો.
2. [vercel.com](https://vercel.com) પર જાઓ અને તમારા GitHub એકાઉન્ટથી Sign In કરો.
3. **"Add New..."** &rarr; **"Project"** પર ક્લિક કરો.
4. તમારું `krish-agriculture` વાળું repository સિલેક્ટ કરો.
5. **Framework Preset:** `Vite`
6. સીધું જ **"Deploy"** બટન પર ક્લિક કરો.
7. ૨ મિનિટમાં તમારી લાઈવ `.vercel.app` લિંક રેડી થઈ જશે!

---

## ⚠️ અગત્યની ટેકનિકલ બાબત (ડેટાબેઝ & બિલ સેવિંગ વિશે):
- **Vercel** એ મુખ્યત્વે **Serverless / Frontend** પ્લેટફોર્મ છે. આથી તમારો React ફ્રન્ટએન્ડ Vercel પર સુપરફાસ્ટ સ્પીડમાં ચાલશે.
- પરંતુ તમે બનાવેલા ટેક્સ બિલો અને કસ્ટમર્સનો ડેટા કાયમ માટે સુરક્ષિત રાખવા માટે બેકએન્ડ ડેટાબેઝનું સર્વર ચાલુ હોવું જરૂરી છે.
- આથી Vercel ના **Project Settings &rarr; Environment Variables** માં જઈને તમારા લાઈવ બેકએન્ડ API ની લિંક:
  `VITE_API_URL = https://your-backend-api.com/api`
  ઉમેરી દેવાથી Vercel પરથી ગમે તેટલા બિલો બનાવો, બધો જ ડેટા કાયમ માટે સેવ રહેશે.
