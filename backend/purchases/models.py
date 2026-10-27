from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    ROLE_CHOICES = [
        ('requester', 'Demandeur'),
        ('validator', 'Validateur Responsable'),
        ('purchasing', 'Équipe Achats'),
        ('director', 'Directeur (DG)'),
        ('admin', 'Administrateur Superviseur'),
        ('ai_tools', 'Outils IA (Filiale SEFACAR)'),
    ]
    COMPANY_CHOICES = [
        ('SEFAMAR', 'SEFAMAR'),
        ('SOMABUS', 'SOMABUS'),
        ('CKD', 'CKD'),
        ('Succursale', 'Succursale'),
    ]
    CITY_CHOICES = [
        ('', 'Non spécifiée / Siège'),
        ('Agadir', 'Agadir'),
        ('Meknès', 'Meknès'),
        ('Laâyoune', 'Laâyoune'),
        ('Marrakech', 'Marrakech'),
        ('Tanger', 'Tanger'),
        ('Nador', 'Nador'),
        ('Dakhla', 'Dakhla'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=150, blank=True, default='')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='requester')
    company = models.CharField(max_length=50, choices=COMPANY_CHOICES, default='SEFAMAR')
    city = models.CharField(max_length=50, blank=True, default='')
    department = models.CharField(max_length=100, blank=True, default='')
    validator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_requesters')
    validators = models.ManyToManyField(User, blank=True, related_name='supervised_profiles')

    def __str__(self):
        name_str = f"{self.full_name} ({self.user.username})" if self.full_name else self.user.username
        city_str = f" - {self.city}" if self.city else ""
        dept_str = f" - {self.department}" if self.department else ""
        return f"{name_str} ({self.company}{city_str}{dept_str} - {self.get_role_display()})"


class PurchaseRequest(models.Model):
    STATUS_CHOICES = [
        ('En attente', 'En attente'),
        ('Commandé', 'Commandé'),
        ('Reçu', 'Reçu'),
        ('Refusé', 'Refusé'),
    ]
    COMPANY_CHOICES = [
        ('SEFAMAR', 'SEFAMAR'),
        ('SOMABUS', 'SOMABUS'),
        ('CKD', 'CKD'),
        ('Succursale', 'Succursale'),
    ]
    
    order_number = models.CharField(max_length=50, unique=True, editable=False)
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='requests')
    company = models.CharField(max_length=50, choices=COMPANY_CHOICES, default='SEFAMAR')
    city = models.CharField(max_length=50, blank=True, default='')
    department = models.CharField(max_length=100, blank=True, default='')
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
        if self.requester and hasattr(self.requester, 'profile') and self.requester.profile:
            if self.requester.profile.company and (not self.company or (self.company == 'SEFAMAR' and self.requester.profile.company != 'SEFAMAR')):
                self.company = self.requester.profile.company
            if not self.city and self.requester.profile.city:
                self.city = self.requester.profile.city
            if not self.department and self.requester.profile.department:
                self.department = self.requester.profile.department
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
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sourcing_histories', null=True, blank=True)
    product = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    results = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.product} à {self.location} ({self.created_at.strftime('%d/%m/%Y')})"

class QuoteComparisonHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quote_comparisons', null=True, blank=True)
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
