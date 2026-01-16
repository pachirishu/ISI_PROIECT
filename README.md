# StreetArtView

StreetArtView este o aplicatie web realizata cu **React + Vite**, care permite utilizatorilor sa descopere, vizualizeze si adauge puncte de street art pe o harta interactiva. Aplicatia foloseste **Firebase** pentru autentificare, stocarea datelor si a imaginilor.

---

## Echipa proiectului

Acest proiect a fost realizat de:

- **[Constantin Gabriel](https://github.com/pachirishu)**
- **[Duminica Ana-Maria](https://github.com/Ana-MariaDuminica)**
- **[Ureche Andreea-Maria](https://github.com/urecheandreea)**

> Proiect realizat in cadrul disciplinei **ISI**.

---

## Structura proiectului (`src/`)

Structura principala a aplicatiei este urmatoarea:

```
src/
│
├── assets/
│ ├── imagini statice (iconite, poze UI etc.)
│
├── config/
│ └── firebase.js # Configurarea Firebase (Auth, Firestore, Storage)
│
├── components/
│ ├── AddAttractionForm.jsx # Formular pentru adaugarea unei atractii
│ ├── MapComponent.jsx # Harta interactiva cu puncte
│ ├── Navbar.jsx # Bara de navigatie
│ ├── UserProfile.jsx # Profilul utilizatorului
│ └── InsightsPage.jsx # Statistici / informatii
│
├── utils/
│ └── funcții auxiliare pentru rutare
│
├── App.jsx
│ └── Definirea rutelor paginilor
│
├── main.jsx
│ └── Punctul de intrare al aplicatiei React
│
└── index.css / styles
```

---

## Rulare proiect local

Pentru a rula proiectul local, urmeaza pasii de mai jos:

### 1️. Creeaza un proiect Firebase
Acceseaza https://console.firebase.google.com si creeaza un proiect nou.

Activeaza următoarele servicii:
- **Authentication**
  - Provider: **Email / Password**
- **Cloud Firestore**
- **Firebase Storage**

### 2️. Configureaza Firebase in aplicatie

Creeaza un fisier `.env` in radacina proiectului, pe baza fisierului `.env.example`, si completeaza-l cu cheile tale Firebase:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Adaugare Reguli CORS

```
[
  {
    "origin": [
      "http://localhost:5173"
    ],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

### 4. Instaleaza Dependintele

```npm install```

### 5. Ruleaza Aplicatia

```npm run dev```
