from django.apps import AppConfig
from django.db.models.signals import post_migrate

def setup_sefacar_account(sender, **kwargs):
    from django.contrib.auth.models import User
    from .models import Profile
    try:
        user, created = User.objects.get_or_create(username='Ahmed@sefacar.ma')
        if created:
            user.set_password('ahmed123')
            user.save()
            Profile.objects.create(user=user, role='ai_tools')
        else:
            profile, _ = Profile.objects.get_or_create(user=user)
            profile.role = 'ai_tools'
            profile.save()
    except Exception as e:
        print("Erreur initialisation compte SEFACAR:", e)

class PurchasesConfig(AppConfig):
    name = 'purchases'

    def ready(self):
        post_migrate.connect(setup_sefacar_account, sender=self)
