import sys
import json
from loguru import logger

def serialize_log(record):
    """Serializa logs no formato JSON estruturado para observabilidade."""
    subset = {
        "timestamp": record["time"].isoformat(),
        "level": record["level"].name,
        "message": record["message"],
        "module": record["module"],
        "function": record["function"],
        "line": record["line"],
        "extra": record["extra"]
    }
    return json.dumps(subset)

def setup_logger():
    """Configura o loguru para produzir logs JSON no stdout."""
    logger.remove()  # Remover handler padrao
    logger.add(
        sys.stdout,
        format="{message}",
        serialize=True,
        level="INFO"
    )
    return logger

# Instancia padrao exportada
app_logger = setup_logger()
