import os
from django.apps import AppConfig
from django.db.models.signals import post_migrate

def setup_default_accounts(sender, **kwargs):
    from django.contrib.auth.models import User
    from .models import Profile
    
    # 1. Compte Outils IA SEFACAR
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

    # 2. Compte Comptabilité (Demandeur Spécial - Validation sur feuille papier)
    compta_user = os.environ.get('COMPTA_INITIAL_USER', 'comptabilite@sefamar.ma')
    compta_pass = os.environ.get('COMPTA_INITIAL_PASSWORD', 'MAN2026')
    try:
        user, created = User.objects.get_or_create(username=compta_user)
        if created:
            user.set_password(compta_pass)
            user.save()
            Profile.objects.create(user=user, role='requester')
            print("Compte Comptabilité créé avec succès.")
        else:
            profile, _ = Profile.objects.get_or_create(user=user)
            if profile.role != 'requester':
                profile.role = 'requester'
                profile.save()
    except Exception as e:
        print("Initialisation compte Comptabilité:", e)

class PurchasesConfig(AppConfig):
    name = 'purchases'

    def ready(self):
        post_migrate.connect(setup_default_accounts, sender=self)

