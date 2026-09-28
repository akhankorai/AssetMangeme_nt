# Asset Management

 Django REST backend and React frontend scaffolded for Microsoft SQL Server.

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
 copy .env.example .env
 python manage.py migrate
 python manage.py create_admin_user
 python manage.py runserver 8000
```

The default database settings target:

- Host: `localhost`
- Instance: `SQLEXPRESS`
- Database: `AssetManagement`
- Backend: `sqlserver_compat` over ODBC Driver 18
- Auth: Windows integrated auth by default, with `Encrypt=no;TrustServerCertificate=yes`

Edit `backend\.env` if your SQL Server host, instance, or login differs.
Admin bootstrap is also automatic after migrations and configurable via `BOOTSTRAP_ADMIN_*` variables in `backend\.env`.

## Frontend

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

The React app expects the API at `http://localhost:8000/api` by default. Override with `VITE_API_BASE_URL` in `frontend\.env`.
