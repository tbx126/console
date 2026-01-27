# Personal Life Console

A web application for tracking personal life activities including travel, portfolio management, and finance tracking.

## Tech Stack

**Backend:**
- FastAPI (Python web framework)
- Pydantic (data validation)
- Uvicorn (ASGI server)
- JSON files for data storage

**Frontend:**
- React with Vite
- Tailwind CSS for styling
- Recharts for data visualization
- Axios for API calls

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
- Windows: `venv\Scripts\activate`
- Mac/Linux: `source venv/bin/activate`

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Run the backend server:
```bash
uvicorn app.main:app --reload
```

The backend will be available at http://localhost:8000
API documentation at http://localhost:8000/docs

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend will be available at http://localhost:5173

## Project Structure

```
personal-life-console/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── models/
│   │   ├── routers/
│   │   ├── services/
│   │   └── utils/
│   ├── data/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── hooks/
│   └── package.json
└── README.md
```

## Features

- **Finance Module**: Track expenses, income, bills, and budgets
- **Travel Module**: Log flights and track airline statistics
- **Portfolio Module**: Manage investments and projects
- **Dashboard**: Overview of all tracked data

## Development Status

Phase 1: Foundation - Completed
Phase 2: Finance Module - In Progress
