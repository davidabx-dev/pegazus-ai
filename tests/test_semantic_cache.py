from pegazus_ai.services.semantic_cache import semantic_cache_service

def test_semantic_cache_key_generation():
    tenant_1 = "tenant-alpha"
    tenant_2 = "tenant-beta"
    question = "Qual o horário de atendimento?"

    key_1 = semantic_cache_service._make_key(tenant_1, question)
    key_2 = semantic_cache_service._make_key(tenant_2, question)

    # 🚩 FIX 2: Garante que o formato da chave segue {escopo}:{id}:query_cache:{hash}
    assert key_1.startswith("tenant:tenant-alpha:query_cache:")
    assert key_2.startswith("tenant:tenant-beta:query_cache:")
    assert key_1 != key_2

def test_semantic_cache_case_insensitive():
    tenant = "tenant-123"
    q1 = "Qual é o Horário?"
    q2 = "qual é o horário?"

    key_1 = semantic_cache_service._make_key(tenant, q1)
    key_2 = semantic_cache_service._make_key(tenant, q2)

    # Garante que perguntas com caixas diferentes geram o mesmo hash de cache
    assert key_1 == key_2
