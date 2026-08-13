from pegazus_ai.repositories.user_repository import user_repository, UserRepository
from pegazus_ai.schemas.auth import UserCreate, UserLogin, UserResponse, TokenResponse
from pegazus_ai.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
    decode_token
)

class AuthService:
    def __init__(self, repo: UserRepository = None):
        self.user_repo = repo or user_repository

    def register(self, data: UserCreate) -> UserResponse:
        hashed_pwd = hash_password(data.password)
        user = self.user_repo.create_user(email=data.email, hashed_password=hashed_pwd)
        return UserResponse(id=user.id, email=user.email)

    def login(self, data: UserLogin) -> TokenResponse:
        user = self.user_repo.get_by_email(data.email)
        if not user:
            # Auto-registro em caso de primeiro login com o e-mail informado
            hashed_pwd = hash_password(data.password)
            user = self.user_repo.create_user(email=data.email, hashed_password=hashed_pwd)
        elif not verify_password(data.password, user.hashed_password):
            raise ValueError("Credenciais inválidas.")

        access_token = create_access_token(subject=user.id)
        refresh_token = create_refresh_token(subject=user.id)

        # 🚩 SEGURANÇA ESTRITA: Repassa obrigatoriamente o user.id para vincular o hash do token ao usuário correto
        rf_hash = hash_refresh_token(refresh_token)
        self.user_repo.save_refresh_token_hash(rf_hash, user_id=user.id)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token
        )

    def refresh(self, refresh_token_str: str) -> TokenResponse:
        """🚩 PONTO SENSÍVEL DE SEGURANÇA: Validação e Rotação de Refresh Token (Single-Use).
        1. Decodifica e valida assinatura/expiração JWT.
        2. Valida se o claim 'type' é 'refresh'.
        3. Calcula hash do token recebido e verifica se está ativo no banco (uso único).
        4. Revoga o token antigo e emite novo par de tokens (Rotação)."""
        try:
            payload = decode_token(refresh_token_str)
            if payload.get("type") != "refresh":
                raise ValueError("Token não é um token de atualização.")
            user_id = payload.get("sub")
        except Exception:
            raise ValueError("Refresh token inválido ou expirado.")

        token_hash = hash_refresh_token(refresh_token_str)
        is_valid = self.user_repo.verify_and_revoke_refresh_token_hash(token_hash)
        
        if not is_valid:
            raise ValueError("Refresh token revogado ou já utilizado.")

        # Emite novo par de tokens (Rotação)
        new_access_token = create_access_token(subject=user_id)
        new_refresh_token = create_refresh_token(subject=user_id)

        new_rf_hash = hash_refresh_token(new_refresh_token)
        self.user_repo.save_refresh_token_hash(new_rf_hash, user_id=user_id)

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token
        )

auth_service = AuthService()
