import importlib.util
import logging
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL
connect_args = {}

if db_url.startswith("postgresql"):
    if importlib.util.find_spec("psycopg2") is None:
        logger.warning("psycopg2 not found locally. Falling back to SQLite database.")
        db_url = "sqlite:///./urban_intelligence.db"

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(db_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Columns added after the first release. create_all() only creates missing
# tables, so existing development databases need the columns added in place.
ADDITIVE_COLUMNS = {
    "events": {
        "acknowledged_at": "TIMESTAMP NULL",
        "resolved_at": "TIMESTAMP NULL",
    }
}


# Columns whose type outgrew its first definition. Postgres enforces VARCHAR
# length, so an evidence path longer than 500 characters would abort the
# insert on an existing deployment until the column is widened in place.
WIDENED_COLUMNS = {
    "events": {"evidence_url": "TEXT"},
}


def ensure_schema() -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    for table, columns in ADDITIVE_COLUMNS.items():
        if table not in existing_tables:
            continue
        present = {col["name"] for col in inspector.get_columns(table)}
        for column, ddl in columns.items():
            if column in present:
                continue
            try:
                with engine.begin() as conn:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
                logger.info("Added column %s.%s", table, column)
            except Exception as exc:
                logger.warning("Could not add column %s.%s: %s", table, column, exc)

    if not engine.url.drivername.startswith("postgresql"):
        # SQLite ignores VARCHAR length, so there is nothing to widen.
        return

    for table, columns in WIDENED_COLUMNS.items():
        if table not in existing_tables:
            continue
        for column, ddl in columns.items():
            try:
                with engine.begin() as conn:
                    conn.execute(
                        text(f"ALTER TABLE {table} ALTER COLUMN {column} TYPE {ddl}")
                    )
                logger.info("Widened column %s.%s to %s", table, column, ddl)
            except Exception as exc:
                logger.warning("Could not widen column %s.%s: %s", table, column, exc)
