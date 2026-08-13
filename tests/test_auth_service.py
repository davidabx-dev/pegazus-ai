import pytest
from pegazus_ai.schemas.auth import UserCreate, UserLogin
from pegazus_ai.core.security import hash_refresh_token, decode_token

def test_register_and_login_success(test_auth_service):
    # 1. Registrar usuário
    user_data = UserCreate(email="user@test.com", password="securepassword123")
    user_resp = test_auth_service.register(user_data)
    assert user_resp.email == "user@test.com"
    assert user_resp.id is not None

    # 2. Login
    login_data = UserLogin(email="user@test.com", password="securepassword123")
    tokens = test_auth_service.login(login_data)
    assert tokens.access_token is not None
    assert tokens.refresh_token is not None

    # 3. Validar payload do access token
    payload = decode_token(tokens.access_token)
    assert payload["sub"] == user_resp.id
    assert payload["type"] == "access"

def test_login_invalid_password_raises_error(test_auth_service):
    user_data = UserCreate(email="wrongpwd@test.com", password="correct_password")
    test_auth_service.register(user_data)

    login_data = UserLogin(email="wrongpwd@test.com", password="wrong_password")
    with pytest.raises(ValueError, match="Credenciais inválidas"):
        test_auth_service.login(login_data)

def test_refresh_token_rotation_and_hash_storage(test_auth_service, test_user_repo):
    user_data = UserCreate(email="refresh@test.com", password="password123")
    user_resp = test_auth_service.register(user_data)
    tokens = test_auth_service.login(UserLogin(email="refresh@test.com", password="password123"))

    orig_refresh = tokens.refresh_token
    rf_hash = hash_refresh_token(orig_refresh)

    # Garante que APENAS o HASH está gravado no repositório
    assert rf_hash in test_user_repo._valid_refresh_token_hashes
    assert orig_refresh not in test_user_repo._valid_refresh_token_hashes

    # Rotação do refresh token
    new_tokens = test_auth_service.refresh(orig_refresh)
    assert new_tokens.access_token is not None
    assert new_tokens.refresh_token != orig_refresh

    # Garante que o hash do token antigo FOI REVOGADO e o novo foi adicionado
    assert rf_hash not in test_user_repo._valid_refresh_token_hashes
    new_rf_hash = hash_refresh_token(new_tokens.refresh_token)
    assert new_rf_hash in test_user_repo._valid_refresh_token_hashes

    # Tentativa de reutilizar o token antigo deve FALHAR
    with pytest.raises(ValueError, match="revogado ou já utilizado"):
        test_auth_service.refresh(orig_refresh)

def test_save_refresh_token_hash_without_user_id_raises_value_error(test_user_repo):
    """🚩 TESTE NOVO: Garante que salvar hash de refresh token sem user_id lança ValueError obrigatoriamente."""
    with pytest.raises(ValueError, match="user_id é obrigatório"):
        test_user_repo.save_refresh_token_hash(token_hash="fakehash123", user_id="")
