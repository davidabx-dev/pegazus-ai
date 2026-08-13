import uuid
from typing import Optional
from dataclasses import dataclass
from sqlalchemy.orm import Session
from pegazus_ai.core.database import SessionLocal, Base, engine
from pegazus_ai.core.models import UserModel, RefreshTokenModel

Base.metadata.create_all(bind=engine)

@dataclass
class UserRecord:
    id: str
    email: str
    hashed_password: str

class UserRepository:
    def __init__(self, db_factory=SessionLocal):
        self.db_factory = db_factory

    @property
    def _valid_refresh_token_hashes(self) -> set:
        db: Session = self.db_factory()
        try:
            tokens = db.query(RefreshTokenModel).filter(RefreshTokenModel.is_revoked == False).all()
            return {t.token_hash for t in tokens}
        finally:
            db.close()

    def create_user(self, email: str, hashed_password: str) -> UserRecord:
        db: Session = self.db_factory()
        try:
            existing = db.query(UserModel).filter(UserModel.email == email).first()
            if existing:
                raise ValueError("Usuário já cadastrado com este e-mail.")

            user_id = str(uuid.uuid4())
            user = UserModel(id=user_id, email=email, hashed_password=hashed_password)
            db.add(user)
            db.commit()
            db.refresh(user)
            return UserRecord(id=user.id, email=user.email, hashed_password=user.hashed_password)
        finally:
            db.close()

    def get_by_email(self, email: str) -> Optional[UserRecord]:
        db: Session = self.db_factory()
        try:
            user = db.query(UserModel).filter(UserModel.email == email).first()
            if not user:
                return None
            return UserRecord(id=user.id, email=user.email, hashed_password=user.hashed_password)
        finally:
            db.close()

    def get_by_id(self, user_id: str) -> Optional[UserRecord]:
        db: Session = self.db_factory()
        try:
            user = db.query(UserModel).filter(UserModel.id == user_id).first()
            if not user:
                return None
            return UserRecord(id=user.id, email=user.email, hashed_password=user.hashed_password)
        finally:
            db.close()

    def save_refresh_token_hash(self, token_hash: str, user_id: str) -> None:
        """🚩 SEGURANÇA ESTRITA: Exige user_id obrigatório sem fallback silencioso para o primeiro usuário."""
        if not user_id or not str(user_id).strip():
            raise ValueError("user_id é obrigatório para vincular o hash do refresh token.")

        db: Session = self.db_factory()
        try:
            rf = RefreshTokenModel(token_hash=token_hash, user_id=user_id, is_revoked=False)
            db.add(rf)
            db.commit()
        finally:
            db.close()

    def verify_and_revoke_refresh_token_hash(self, token_hash: str) -> bool:
        db: Session = self.db_factory()
        try:
            rf = db.query(RefreshTokenModel).filter(
                RefreshTokenModel.token_hash == token_hash,
                RefreshTokenModel.is_revoked == False
            ).first()

            if not rf:
                return False

            rf.is_revoked = True
            db.commit()
            return True
        finally:
            db.close()

user_repository = UserRepository()
