from .registry import (
    DEFAULT_MODULE,
    DEFAULT_MODULE_KEY,
    DEFAULT_MODULE_LABEL,
    MODULE_CHOICES,
    MODULE_DEFINITIONS,
    MODULE_LABELS,
    WORKSPACE_TEMPLATES,
    get_module_definition,
    get_module_filter,
    get_module_key,
    get_module_label,
    get_workspace_template,
)
from .request import module_from_request

__all__ = [
    "DEFAULT_MODULE",
    "DEFAULT_MODULE_KEY",
    "DEFAULT_MODULE_LABEL",
    "MODULE_CHOICES",
    "MODULE_DEFINITIONS",
    "MODULE_LABELS",
    "WORKSPACE_TEMPLATES",
    "get_module_definition",
    "get_module_filter",
    "get_module_key",
    "get_module_label",
    "get_workspace_template",
    "module_from_request",
]
