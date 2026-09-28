from __future__ import annotations

from importlib import import_module

from django.db.models import Q

from .types import ModuleDefinition

MODULE_PACKAGE_NAMES = [
    "vehicle_assets",
    "information_technology",
    "feeding",
    "cleaning",
    "shed_fans",
    "electrical_tools",
    "paint_tools",
    "plumbing_tools",
    "welding_tools",
    "furniture",
]


def _load_module_definition(package_name: str) -> ModuleDefinition:
    module = import_module(f"assets.modules.{package_name}")
    return module.MODULE


def _load_workspace_template(package_name: str) -> dict:
    module = import_module(f"assets.modules.{package_name}")
    return getattr(module, "WORKSPACE_TEMPLATE", {})


MODULE_DEFINITIONS = [
    _load_module_definition(package_name) for package_name in MODULE_PACKAGE_NAMES
]
WORKSPACE_TEMPLATES = {
    module_definition.key: _load_workspace_template(package_name)
    for module_definition, package_name in zip(
        MODULE_DEFINITIONS, MODULE_PACKAGE_NAMES, strict=False
    )
}
DEFAULT_MODULE = MODULE_DEFINITIONS[0]
DEFAULT_MODULE_KEY = DEFAULT_MODULE.key
DEFAULT_MODULE_LABEL = DEFAULT_MODULE.label
MODULE_CHOICES = [(module.key, module.label) for module in MODULE_DEFINITIONS]
MODULE_LABELS = {module.key: module.label for module in MODULE_DEFINITIONS}


def get_module_definition(module_key: str | None) -> ModuleDefinition:
    return next(
        (module for module in MODULE_DEFINITIONS if module.key == module_key),
        DEFAULT_MODULE,
    )


def get_module_key(module_key: str | None) -> str:
    return get_module_definition(module_key).key


def get_module_label(module_key: str | None) -> str:
    return get_module_definition(module_key).label


def get_module_filter(module_key: str | None) -> Q:
    normalized_module_key = get_module_key(module_key)
    if normalized_module_key == DEFAULT_MODULE_KEY:
        # Backward-compatible default: until legacy records are explicitly
        # classified, Vehicle Assets should show the existing database data.
        return Q()
    return Q(module=normalized_module_key)


def get_workspace_template(module_key: str | None) -> dict:
    return WORKSPACE_TEMPLATES.get(get_module_key(module_key), {})
