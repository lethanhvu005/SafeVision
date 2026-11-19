from __future__ import annotations

import importlib
import sys
import types
from typing import Any


class _DummyAxes3D:
    def view_init(self, *args: Any, **kwargs: Any) -> None:
        return None

    def scatter3D(self, *args: Any, **kwargs: Any) -> None:
        return None

    def plot3D(self, *args: Any, **kwargs: Any) -> None:
        return None


class _DummyFigure:
    def add_subplot(self, *args: Any, **kwargs: Any) -> _DummyAxes3D:
        return _DummyAxes3D()


def _noop(*args: Any, **kwargs: Any) -> None:
    return None


def _install_matplotlib_stub() -> None:
    matplotlib_module = types.ModuleType('matplotlib')
    matplotlib_module.__file__ = __file__
    matplotlib_module.__package__ = 'matplotlib'
    matplotlib_module.__path__ = []
    matplotlib_module.__version__ = '0.0-stub'
    matplotlib_module.use = _noop

    pyplot_module = types.ModuleType('matplotlib.pyplot')
    pyplot_module.__package__ = 'matplotlib'
    pyplot_module.figure = lambda *args, **kwargs: _DummyFigure()
    pyplot_module.axes = lambda *args, **kwargs: _DummyAxes3D()
    pyplot_module.show = _noop
    pyplot_module.close = _noop
    pyplot_module.gca = lambda *args, **kwargs: _DummyAxes3D()
    pyplot_module.subplots = lambda *args, **kwargs: (_DummyFigure(), _DummyAxes3D())

    matplotlib_module.pyplot = pyplot_module

    sys.modules['matplotlib'] = matplotlib_module
    sys.modules['matplotlib.pyplot'] = pyplot_module


def _clear_modules(prefixes: tuple[str, ...]) -> None:
    for module_name in list(sys.modules):
        if any(module_name == prefix or module_name.startswith(prefix + '.') for prefix in prefixes):
            sys.modules.pop(module_name, None)


def _looks_like_blocked_matplotlib_import(exc: BaseException) -> bool:
    message = str(exc).lower()
    return (
        '_c_internal_utils' in message
        or 'application control policy' in message
        or ('matplotlib' in message and 'dll load failed' in message)
    )


def load_mediapipe() -> tuple[Any | None, Exception | None, str | None]:
    try:
        return importlib.import_module('mediapipe'), None, None
    except Exception as exc:  # noqa: BLE001
        if not _looks_like_blocked_matplotlib_import(exc):
            return None, exc, None
        original_error = exc

    _clear_modules(('mediapipe', 'matplotlib'))
    _install_matplotlib_stub()

    try:
        module = importlib.import_module('mediapipe')
        note = (
            'MediaPipe dang duoc nap qua matplotlib stub vi Windows block DLL native '
            'cua matplotlib trong nhanh drawing_utils.'
        )
        return module, None, note
    except Exception as exc:  # noqa: BLE001
        return None, exc, str(original_error)
