import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from backend.app.core.config import get_settings


def configure_logging() -> None:
    settings = get_settings()
    log_path = Path(settings.storage_path) / 'logs' / 'backend.log'
    formatter = logging.Formatter('%(asctime)s | %(levelname)s | %(name)s | %(message)s')

    root = logging.getLogger()
    root.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
    if root.handlers:
        return

    try:
        log_path.parent.mkdir(parents=True, exist_ok=True)
        handler = RotatingFileHandler(log_path, maxBytes=1_000_000, backupCount=5, encoding='utf-8')
    except OSError:
        handler = logging.StreamHandler()

    handler.setFormatter(formatter)
    root.addHandler(handler)
