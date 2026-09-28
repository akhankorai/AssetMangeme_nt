from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from security.models import UserAccessPolicy

User = get_user_model()

@receiver(post_save, sender=User)
def create_or_update_user_access_policy(sender, instance, created, **kwargs):
    """
    Automatically creates a UserAccessPolicy whenever a new User is created.
    """
    if created:
        UserAccessPolicy.objects.get_or_create(user=instance)
