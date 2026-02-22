# YourPlate AI — Django Backend

## Quick Start

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser (for admin panel)
python manage.py createsuperuser

# Seed sample supplements (optional)
python manage.py shell < seed_supplements.py

# Run server
python manage.py runserver
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Register new user |
| POST | `/api/auth/token/` | Get JWT tokens (login) |
| POST | `/api/auth/token/refresh/` | Refresh access token |
| GET/PUT | `/api/auth/profile/` | User profile |

### Food Logging
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/food/entries/` | List/create food entries |
| GET | `/api/food/entries/today/` | Today's entries |
| GET | `/api/food/entries/daily_summary/?days=7` | Daily aggregates |
| GET/POST | `/api/food/favorites/` | Favorite foods |

### Supplements
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/supplements/` | List all (search, filter by category/evidence) |
| GET | `/api/supplements/{id}/` | Detail with reviews |
| POST | `/api/supplements/{id}/review/` | Add review |

### Goals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT | `/api/goals/nutrition/` | Nutrition goals |
| GET/POST | `/api/goals/cravings/` | Craving entries |

## Admin Panel

Visit `http://localhost:8000/admin/` to manage all data.

## Frontend Connection

Set `VITE_API_URL` environment variable in your React app:
```
VITE_API_URL=http://localhost:8000/api
```

The frontend API client is at `src/lib/api.ts`.
