from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from pegazus_ai.core.config import settings

def get_engine():
    db_url = settings.DATABASE_URL
    try:
        if db_url.startswith("sqlite"):
            engine = create_engine(db_url, connect_args={"check_same_thread": False})
        else:
            engine = create_engine(db_url, pool_pre_ping=True)
            # Test Connection
            with engine.connect() as conn:
                pass
        return engine
    except Exception as e:
        # Fallback para SQLite em memória ou arquivo local se o Postgres não estiver de pé
        fallback_url = "sqlite:///./pegazus_db.sqlite"
        return create_engine(fallback_url, connect_args={"check_same_thread": False})

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
