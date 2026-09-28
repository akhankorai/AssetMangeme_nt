from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create or update a global admin user with full access to all modules."

    def add_arguments(self, parser):
        parser.add_argument(
            "--username", default="admin", help="Admin username (default: admin)"
        )
        parser.add_argument("--email", default="admin@example.com", help="Admin email")
        parser.add_argument("--password", default="Admin@12345", help="Admin password")

    def handle(self, *args, **options):
        user_model = get_user_model()
        username = options["username"]
        email = options["email"]
        password = options["password"]

        user, created = user_model.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "is_staff": True,
                "is_superuser": True,
            },
        )

        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save(update_fields=["email", "is_staff", "is_superuser", "password"])

        if created:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created admin user '{username}' with full module access."
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Updated admin user '{username}' with full module access."
                )
            )
