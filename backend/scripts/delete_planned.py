import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'asset_management.settings')
django.setup()

from assets.models import ScheduleTask

count, details = ScheduleTask.objects.filter(stage='planned').delete()
print(f"SUCCESS: Deleted {count} planned tasks. Details: {details}")
