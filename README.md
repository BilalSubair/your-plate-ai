# NutriGuide AI

Welcome to **NutriGuide AI**, an intelligent full-stack nutrition tracking, smart receipt-scanning, and calorie calculation application. 
This service provides dynamic AI-assisted tools for building Indian diets, generating smart calorie substitutions, searching clinical supplement data, and tracking daily macros accurately.

## Key Features

- **AI Log Scanner**: Upload a nutrition label and automatically parse accurate Calories, Protein, Carbs, and Fats using Google Cloud Vision and Llama-3 parsing directly into your custom Dashboard.
- **Smart Custom Substitutions**: Craving pizza? The AI handles calorie swaps, returning 3 Indian-inspired healthy alternatives that fit your macros seamlessly.
- **AI Supplement Researcher**: Tap into extensive compound research including real-time estimated verification ratings, clinical pros and cons, and drug interaction warnings for both generic and branded supplements like MuscleBlaze Whey.
- **Offline Backend**: Fully offline tracking and dynamic target tracking ensuring accurate Dashboard rings that never lose parity with Django.

## Tech Stack
- **Frontend**: Vite, React (TypeScript), Tailwind CSS, Shadcn-UI
- **Backend**: Django & Django REST Framework
- **AI Tooling**: Groq API (Llama-3-8B), Google Cloud Vision

## Local Setup

Ensure that you have Node.js and Python installed. This project requires env configurations for Groq and Google Application Credentials.

### Frontend
```sh
npm install
npm run dev
```

### Backend (Django)
```sh
cd backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py runserver
```
