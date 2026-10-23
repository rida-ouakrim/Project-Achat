import os
from django.apps import AppConfig
from django.db.models.signals import post_migrate

def setup_default_accounts(sender, **kwargs):
    from django.contrib.auth.models import User
    from .models import Profile
    
    # Les comptes et mots de passe sont gérés via variables d'environnement ou directement en base de données.
    # Aucun identifiant ni mot de passe n'est stocké en dur dans le code source.
    admin_user = os.environ.get('ADMIN_INITIAL_USER')
    admin_pass = os.environ.get('ADMIN_INITIAL_PASSWORD')
    if admin_user and admin_pass:
        try:
            user, created = User.objects.get_or_create(username=admin_user)
            if created:
                user.set_password(admin_pass)
            user.is_staff = True
            user.is_superuser = True
            user.save()
            profile, _ = Profile.objects.get_or_create(user=user)
            profile.role = 'admin'
            profile.save()
        except Exception as e:
            print("Configuration compte Admin:", e)

class PurchasesConfig(AppConfig):
    name = 'purchases'

    def ready(self):
        post_migrate.connect(setup_default_accounts, sender=self)
