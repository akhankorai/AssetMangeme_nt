from __future__ import annotations

from .registry import DEFAULT_MODULE_KEY, get_module_key


def module_from_request(request) -> str:
    module_key = None
    if hasattr(request, "query_params"):
        module_key = request.query_params.get("module")
    elif hasattr(request, "GET"):
        module_key = request.GET.get("module")
        
    if not module_key:
        if hasattr(request, "data") and isinstance(request.data, dict):
            module_key = request.data.get("module")
        elif hasattr(request, "POST"):
            module_key = request.POST.get("module")
            
    return get_module_key(module_key or DEFAULT_MODULE_KEY)
