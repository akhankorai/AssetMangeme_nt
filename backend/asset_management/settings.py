import os
from pathlib import Path

from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_list(name: str, default: str = "") -> list[str]:
    return [
        item.strip() for item in os.getenv(name, default).split(",") if item.strip()
    ]


def env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).lower() in {"1", "true", "yes", "on"}


def discover_sql_express_port(default: str = "51074") -> str:
    if os.name != "nt":
        return default

    try:
        import winreg
    except ImportError:
        return default

    registry_roots = (
        (winreg.HKEY_LOCAL_MACHINE, 64),
        (winreg.HKEY_LOCAL_MACHINE, 32),
    )
    instance_name = os.getenv("DB_INSTANCE", "SQLEXPRESS")
    instance_key_path = r"SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL"

    for root, view_bits in registry_roots:
        access = winreg.KEY_READ
        if view_bits == 64 and hasattr(winreg, "KEY_WOW64_64KEY"):
            access |= winreg.KEY_WOW64_64KEY
        elif view_bits == 32 and hasattr(winreg, "KEY_WOW64_32KEY"):
            access |= winreg.KEY_WOW64_32KEY

        try:
            with winreg.OpenKey(root, instance_key_path, 0, access) as instance_key:
                instance_id, _ = winreg.QueryValueEx(instance_key, instance_name)
        except OSError:
            continue

        tcp_ipall_path = rf"SOFTWARE\Microsoft\Microsoft SQL Server\{instance_id}\MSSQLServer\SuperSocketNetLib\Tcp\IPAll"
        try:
            with winreg.OpenKey(root, tcp_ipall_path, 0, access) as tcp_key:
                for value_name in ("TcpPort", "TcpDynamicPorts"):
                    try:
                        port_value, _ = winreg.QueryValueEx(tcp_key, value_name)
                    except OSError:
                        continue
                    port_text = str(port_value).strip()
                    if port_text and port_text != "0":
                        return port_text
        except OSError:
            continue

    return default


def build_sql_server_host(host: str, instance: str, port: str) -> str:
    host = (host or "localhost").strip()
    instance = (instance or "").strip()
    port = (port or "").strip()

    if "\\" in host or "," in host or not instance:
        return host

    if port:
        return host

    return f"{host}\\{instance}"


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "development-only-secret-key")
DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() in {"1", "true", "yes", "on"}
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "assets",
    "security",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "asset_management.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "asset_management.wsgi.application"

DEFAULT_DB_ENGINE = os.getenv("DB_ENGINE") or "sqlserver_compat"
DEFAULT_DB_NAME = os.getenv("DB_NAME") or "AssetManagement"
DEFAULT_DB_HOST = os.getenv("DB_HOST") or "localhost"
DEFAULT_DB_INSTANCE = os.getenv("DB_INSTANCE") or "SQLEXPRESS"
DEFAULT_DB_USER = os.getenv("DB_USER") or ""
DEFAULT_DB_PASSWORD = os.getenv("DB_PASSWORD") or ""
DEFAULT_DB_PORT = os.getenv("DB_PORT") or ""
DEFAULT_DB_EXTRA_PARAMS = (
    os.getenv("DB_EXTRA_PARAMS") or "Encrypt=no;TrustServerCertificate=yes"
)

SUPPORTED_DB_ENGINES = {"mssql", "sqlserver_compat", "sqlite3"}
if DEFAULT_DB_ENGINE not in SUPPORTED_DB_ENGINES:
    raise ImproperlyConfigured(
        f"Unsupported DB_ENGINE '{DEFAULT_DB_ENGINE}'. "
        "Supported engines are: mssql, sqlserver_compat, sqlite3."
    )

if DEFAULT_DB_ENGINE == "sqlite3":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": str(BASE_DIR / "db.sqlite3"),
        },
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": DEFAULT_DB_ENGINE,
            "NAME": DEFAULT_DB_NAME,
            "HOST": build_sql_server_host(
                DEFAULT_DB_HOST, DEFAULT_DB_INSTANCE, DEFAULT_DB_PORT
            ),
            "PORT": DEFAULT_DB_PORT,
            "USER": DEFAULT_DB_USER,
            "PASSWORD": DEFAULT_DB_PASSWORD,
            "OPTIONS": {
                "driver": os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server"),
                "extra_params": DEFAULT_DB_EXTRA_PARAMS,
            },
        },
    }

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Karachi"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

DEFAULT_DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:4201",
    "http://127.0.0.1:4201",
    "http://localhost:4202",
    "http://127.0.0.1:4202",
]

CORS_ALLOWED_ORIGINS = sorted(
    set(
        [
            *env_list(
                "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
            ),
            *DEFAULT_DEV_ORIGINS,
        ]
    )
)
CORS_ALLOW_CREDENTIALS = env_bool("CORS_ALLOW_CREDENTIALS", True)
CORS_ALLOW_ALL_ORIGINS = env_bool("CORS_ALLOW_ALL_ORIGINS", DEBUG)
CSRF_TRUSTED_ORIGINS = sorted(
    set(
        [
            *env_list(
                "CSRF_TRUSTED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
            ),
            *DEFAULT_DEV_ORIGINS,
        ]
    )
)

REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": None,
}
