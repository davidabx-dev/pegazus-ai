import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher

from pegazus_ai.core.config import settings

# Password hasher configuration (Bcrypt)
password_hash = PasswordHash((BcryptHasher(),))

def hash_password(password: str) -> str:
    """🚩 PONTO SENSÍVEL DE SEGURANÇA: Gera hash bcrypt para a senha do usuário."""
    return password_hash.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """🚩 PONTO SENSÍVEL DE SEGURANÇA: Verifica a senha contra o hash armazenado."""
    return password_hash.verify(plain_password, hashed_password)

def hash_refresh_token(token: str) -> str:
    """🚩 PONTO SENSÍVEL DE SEGURANÇA: Gera um hash SHA-256 unidirecional do refresh token.
    O token em texto puro é enviado apenas ao cliente e NUNCA salvo em texto puro no banco."""
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

def create_access_token(subject: str | Any, expires_delta: Optional[timedelta] = None) -> str:
    """🚩 PONTO SENSÍVEL DE SEGURANÇA: Gera Access Token curto (15 min)."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "jti": str(uuid.uuid4()),
        "type": "access"
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: str | Any, expires_delta: Optional[timedelta] = None) -> str:
    """🚩 PONTO SENSÍVEL DE SEGURANÇA: Gera Refresh Token de longa duração."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "jti": str(uuid.uuid4()),
        "type": "refresh"
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    """🚩 PONTO SENSÍVEL DE SEGURANÇA: Decodifica e valida a assinatura e expiração do JWT."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise ValueError("Token inválido ou expirado")
