import re
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Scaffolds a new asset module following the DDD pattern."

    def add_arguments(self, parser):
        parser.add_argument(
            "name",
            type=str,
            help='The human-readable name of the module (e.g. "Medical Equipment")',
        )
        parser.add_argument(
            "--key",
            type=str,
            help="The internal snake_case key (e.g. medical_equipment). Defaults to lowercased name with underscores.",
        )

    def handle(self, *args, **options):
        name = options["name"]
        key = options.get("key")
        if not key:
            # Default key to snake_case version of name
            key = re.sub(r"[^a-zA-Z0-9]+", "_", name).strip("_").lower()

        self.stdout.write(
            self.style.NOTICE(f"Creating asset module: {name} (Key: {key})")
        )

        # Get base paths
        base_dir = Path(__file__).resolve().parent.parent.parent
        modules_dir = base_dir / "modules"
        new_module_dir = modules_dir / key

        # 1. Create directory structure
        if new_module_dir.exists():
            raise CommandError(f"Module directory already exists: {new_module_dir}")

        directories_to_create = [
            new_module_dir,
            new_module_dir / "api",
            new_module_dir / "selectors",
            new_module_dir / "serializers",
            new_module_dir / "services",
        ]

        for d in directories_to_create:
            d.mkdir(parents=True, exist_ok=True)
            # Create an empty __init__.py for submodules
            if d != new_module_dir:
                (d / "__init__.py").touch()

        # 2. Generate __init__.py for the main module
        init_content = f'''from assets.modules.types import ModuleDefinition

MODULE = ModuleDefinition(
    key="{key.replace("_", "-")}",
    label="{name}",
)

WORKSPACE_TEMPLATE = {{
    "categories": [],
    "service_types": [],
    "items": [],
    "employee_categories": [],
    "team_members": [],
    "default_location": {{"site": "", "name": "", "room": ""}},
}}
'''
        with open(new_module_dir / "__init__.py", "w", encoding="utf-8") as f:
            f.write(init_content)

        self.stdout.write(self.style.SUCCESS(f"Created directory structure for {key}."))

        # 3. Auto-register in registry.py
        registry_path = modules_dir / "registry.py"
        if not registry_path.exists():
            raise CommandError(f"Registry file not found at {registry_path}")

        with open(registry_path, "r", encoding="utf-8") as f:
            registry_content = f.read()

        # Find MODULE_PACKAGE_NAMES list and append to it
        # Assuming the list looks like:
        # MODULE_PACKAGE_NAMES = [
        #     "vehicle_assets",
        #     ...
        # ]

        list_match = re.search(
            r"(MODULE_PACKAGE_NAMES\s*=\s*\[)([\s\S]*?)(\])", registry_content
        )
        if list_match:
            start_decl = list_match.group(1)
            inner_content = list_match.group(2)
            end_decl = list_match.group(3)

            # Check if already registered
            if f'"{key}"' in inner_content or f"'{key}'" in inner_content:
                self.stdout.write(
                    self.style.WARNING(f"Module {key} is already in registry.py.")
                )
            else:
                # Append to the end of the list (before the closing bracket)
                # Ensure it's formatted nicely (add trailing comma to existing content if needed)
                clean_inner = inner_content.rstrip()
                if clean_inner and not clean_inner.endswith(","):
                    clean_inner += ","

                new_entry = f'\n    "{key}",\n'
                new_content = start_decl + clean_inner + new_entry + end_decl

                registry_content = (
                    registry_content[: list_match.start()]
                    + new_content
                    + registry_content[list_match.end() :]
                )

                with open(registry_path, "w", encoding="utf-8") as f:
                    f.write(registry_content)
                self.stdout.write(
                    self.style.SUCCESS(f"Successfully registered {key} in registry.py.")
                )
        else:
            self.stdout.write(
                self.style.ERROR(
                    "Could not find MODULE_PACKAGE_NAMES in registry.py. You will need to register it manually."
                )
            )

        self.stdout.write(
            self.style.SUCCESS(f'\\nModule "{name}" successfully created!')
        )
        self.stdout.write(f"You can find it at: {new_module_dir}")
