"""SQLAlchemy engine/session — SQLite locally, MySQL/MariaDB via DATABASE_URL.

pool_pre_ping recycles dead MySQL connections (matters on RDS / a long-lived EC2 process).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from config import settings

connect_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)

# Force utf8mb4 on MySQL/MariaDB — region names ("São Paulo") and alert text ("—", "→")
# are multi-byte; MariaDB defaults to latin1 and would reject them otherwise.
db_url = settings.database_url
if db_url.startswith("mysql") and "charset=" not in db_url:
    db_url += ("&" if "?" in db_url else "?") + "charset=utf8mb4"

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=280,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()
