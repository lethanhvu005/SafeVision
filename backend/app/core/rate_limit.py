from collections import defaultdict, deque
from threading import Lock
from time import time

from fastapi import HTTPException, Request, status


class RateLimiter:
    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def enforce(self, key: str, limit: int, window_seconds: int) -> None:
        now = time()
        with self._lock:
            bucket = self._events[key]
            while bucket and now - bucket[0] > window_seconds:
                bucket.popleft()
            if len(bucket) >= limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail='Bạn thao tác quá nhanh. Hãy chờ một chút rồi thử lại.',
                )
            bucket.append(now)


rate_limiter = RateLimiter()


def build_rate_limit_key(prefix: str, request: Request, identifier: str | None = None) -> str:
    client_host = request.client.host if request.client else 'unknown'
    suffix = identifier or 'anonymous'
    return f'{prefix}:{client_host}:{suffix}'
