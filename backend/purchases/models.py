from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    ROLE_CHOICES = [
        ('requester', 'Demandeur'),
        ('purchasing', 'Équipe Achats'),
        ('director', 'Directeur (DG)'),
        ('ai_tools', 'Outils IA (Filiale SEFACAR)'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='requester')

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"


class PurchaseRequest(models.Model):
    STATUS_CHOICES = [
        ('En attente', 'En attente'),
        ('Commandé', 'Commandé'),
        ('Reçu', 'Reçu'),
        ('Refusé', 'Refusé'),
    ]
    
    order_number = models.CharField(max_length=50, unique=True, editable=False)
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='requests')
    assignment = models.TextField(blank=True, default='')
    observation = models.TextField(blank=True, null=True)
    date_created = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='En attente')
    is_validated = models.BooleanField(default=False)
    validated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='validated_requests')
    
    # Saisis ultérieurement par les achats (Fichiers joints globaux)
    receipt_pdf = models.FileField(upload_to='receipts/', blank=True, null=True)
    request_pdf = models.FileField(upload_to='requests_pdf/', blank=True, null=True)
    refusal_reason = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.order_number:
            import datetime
            year = datetime.datetime.now().year
            last_request = PurchaseRequest.objects.filter(order_number__contains=f"CMD-{year}").order_by('-id').first()
            if last_request:
                try:
                    last_num = int(last_request.order_number.split('-')[-1])
                    new_num = last_num + 1
                except ValueError:
                    new_num = 1
            else:
                new_num = 1
            self.order_number = f"CMD-{year}-{new_num:03d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.order_number}"

class PurchaseItem(models.Model):
    request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name='items')
    product = models.CharField(max_length=200)
    qty = models.IntegerField()
    # Saisis ultérieurement par les achats par article
    supplier = models.CharField(max_length=150, blank=True, null=True)
    price = models.CharField(max_length=50, blank=True, null=True) # Ex: "4500 MAD"

    def __str__(self):
        return f"{self.product} (x{self.qty})"

class SupplierCatalog(models.Model):
    product_name = models.CharField(max_length=200)
    supplier_name = models.CharField(max_length=150)
    price = models.CharField(max_length=50) # Dernier prix connu saisi
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('product_name', 'supplier_name')
        verbose_name = "Catalogue Fournisseur"
        verbose_name_plural = "Catalogue Fournisseurs"

    def __str__(self):
        return f"{self.supplier_name} -> {self.product_name} ({self.price})"

class SourcingHistory(models.Model):
    product = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    results = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.product} à {self.location} ({self.created_at.strftime('%d/%m/%Y')})"

class QuoteComparisonHistory(models.Model):
    filenames = models.JSONField()
    markdown_result = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        files_str = ", ".join(self.filenames[:2])
        if len(self.filenames) > 2:
            files_str += "..."
        return f"Comparaison: {files_str} ({self.created_at.strftime('%d/%m/%Y')})"

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notif {self.user.username}: {self.message[:30]}"
