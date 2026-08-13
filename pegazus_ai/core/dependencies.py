from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pegazus_ai.core.security import decode_token
from pegazus_ai.repositories.user_repository import user_repository, UserRecord

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> UserRecord:
    """🚩 PONTO SENSÍVEL DE SEGURANÇA: Extrai e valida o usuário a partir do Access Token JWT.
    Garante que endpoints protegidos identifiquem corretamente o user_id autenticado."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais de acesso",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise credentials_exception
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    user = user_repository.get_by_id(user_id)
    if user is None:
        raise credentials_exception
    return user
