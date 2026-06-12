import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from purchases.models import Profile

users = [
    {'username': 'man@sefamar.ma', 'pass': 'MAN2026', 'role': 'director'},
    {'username': 'chadi@sefamar.ma', 'pass': 'MAN2026', 'role': 'requester'},
    {'username': 'achat@sefamar.ma', 'pass': 'MAN2026', 'role': 'purchasing'},
    {'username': 'demandeur@sefamar.ma', 'pass': 'MAN2026', 'role': 'requester'},
]

for u in users:
    # Check if already exists
    user_obj = User.objects.filter(username=u['username']).first()
    if not user_obj:
        user_obj = User.objects.create_user(username=u['username'], password=u['pass'])
        print(f"Created user {u['username']}")
    else:
        user_obj.set_password(u['pass'])
        user_obj.save()
        print(f"Updated user {u['username']}")
    
    # Link profile
    Profile.objects.update_or_create(user=user_obj, defaults={'role': u['role']})
    print(f"Assigned role {u['role']} to {u['username']}")

print("DONE!")
