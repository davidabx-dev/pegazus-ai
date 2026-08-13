from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

def get_user_or_ip_identifier(request: Request) -> str:
    """🚩 PONTO SENSÍVEL DE SEGURANÇA: Identificador de Rate Limit por Usuário Autenticado.
    Extrai o user_id do JWT caso a requisição possua o cabeçalho Authorization: Bearer <token>.
    Caso contrário, utiliza o IP remoto do cliente como fallback."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            from pegazus_ai.core.security import decode_token
            payload = decode_token(token)
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except Exception:
            pass
    return get_remote_address(request)

# Rate Limiter centralizado utilizando identificação por usuário/IP
limiter = Limiter(key_func=get_user_or_ip_identifier)
