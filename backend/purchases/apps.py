import os
from django.apps import AppConfig
from django.db.models.signals import post_migrate

def setup_sefacar_account(sender, **kwargs):
    from django.contrib.auth.models import User
    from .models import Profile
    
    # Sécurité : Utiliser des variables d'environnement
    username = os.environ.get('SEFACAR_INITIAL_USER', 'Ahmed@sefacar.ma')
    init_password = os.environ.get('SEFACAR_INITIAL_PASSWORD', 'ahmed123')
    
    try:
        user, created = User.objects.get_or_create(username=username)
        if created:
            user.set_password(init_password)
            user.save()
            Profile.objects.create(user=user, role='ai_tools')
        else:
            profile, _ = Profile.objects.get_or_create(user=user)
            if profile.role != 'ai_tools':
                profile.role = 'ai_tools'
                profile.save()
    except Exception as e:
        print("Initialisation compte SEFACAR:", e)

class PurchasesConfig(AppConfig):
    name = 'purchases'

    def ready(self):
        post_migrate.connect(setup_sefacar_account, sender=self)
