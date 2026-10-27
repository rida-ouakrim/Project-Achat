from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, PurchaseRequest, SupplierCatalog, PurchaseItem, SourcingHistory, QuoteComparisonHistory, Notification

from django.db import models

class ProfileSerializer(serializers.ModelSerializer):
    validator_name = serializers.ReadOnlyField(source='validator.username')
    validator_id = serializers.ReadOnlyField(source='validator.id')
    validator_ids = serializers.SerializerMethodField()
    assigned_requester_ids = serializers.SerializerMethodField()
    assigned_requesters = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            'role', 'company', 'city', 'department', 'full_name', 
            'validator', 'validator_id', 'validator_name',
            'validator_ids', 'assigned_requester_ids', 'assigned_requesters'
        ]

    def get_validator_ids(self, obj):
        try:
            ids = list(obj.validators.values_list('id', flat=True))
            if obj.validator_id and obj.validator_id not in ids:
                ids.append(obj.validator_id)
            return ids
        except Exception:
            return []

    def get_assigned_requester_ids(self, obj):
        try:
            user = obj.user
            qs = Profile.objects.filter(models.Q(validator=user) | models.Q(validators=user)).distinct()
            return list(qs.values_list('user_id', flat=True))
        except Exception:
            return []

    def get_assigned_requesters(self, obj):
        try:
            user = obj.user
            qs = Profile.objects.filter(models.Q(validator=user) | models.Q(validators=user)).select_related('user').distinct()
            return [
                {
                    'id': p.user_id,
                    'username': p.user.username,
                    'display_name': p.full_name or p.user.get_full_name() or p.user.username,
                    'email': p.user.email,
                    'department': p.department,
                    'company': p.company,
                    'city': p.city
                }
                for p in qs
            ]
        except Exception:
            return []

class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True, format="%Y-%m-%d %H:%M")
    requests_count = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'display_name', 'profile', 'date_joined', 'is_active', 'requests_count']

    def get_display_name(self, obj):
        if hasattr(obj, 'profile') and obj.profile.full_name:
            return obj.profile.full_name
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else obj.username

    def get_requests_count(self, obj):
        try:
            return obj.requests.count()
        except Exception:
            return 0

class SupplierCatalogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierCatalog
        fields = ['id', 'product_name', 'supplier_name', 'price', 'updated_at']

class PurchaseItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseItem
        fields = ['id', 'product', 'qty', 'supplier', 'price']

class PurchaseRequestSerializer(serializers.ModelSerializer):
    requester_name = serializers.ReadOnlyField(source='requester.username')
    requester_company = serializers.ReadOnlyField(source='requester.profile.company')
    requester_city = serializers.ReadOnlyField(source='requester.profile.city')
    requester_department = serializers.ReadOnlyField(source='requester.profile.department')
    validated_by_name = serializers.ReadOnlyField(source='validated_by.username')
    assigned_validator_id = serializers.ReadOnlyField(source='requester.profile.validator_id')
    assigned_validator_name = serializers.ReadOnlyField(source='requester.profile.validator.username')
    assigned_validator_ids = serializers.SerializerMethodField()
    items = PurchaseItemSerializer(many=True)

    class Meta:
        model = PurchaseRequest
        fields = [
            'id', 'order_number', 'requester', 'requester_name', 'company', 'requester_company',
            'city', 'requester_city',
            'department', 'requester_department',
            'assignment', 'observation', 
            'date_created', 'status', 'receipt_pdf', 'request_pdf', 'refusal_reason', 'items',
            'is_validated', 'validated_by', 'validated_by_name',
            'assigned_validator_id', 'assigned_validator_name', 'assigned_validator_ids'
        ]
        read_only_fields = ['order_number', 'date_created']

    def get_assigned_validator_ids(self, obj):
        try:
            if hasattr(obj.requester, 'profile') and obj.requester.profile:
                prof = obj.requester.profile
                ids = list(prof.validators.values_list('id', flat=True))
                if prof.validator_id and prof.validator_id not in ids:
                    ids.append(prof.validator_id)
                return ids
        except Exception:
            return []

    def validate_company(self, value):
        if value:
            val_clean = str(value).strip()
            if val_clean.upper() in ['SUCCURSALE', 'SUCCURSALES']:
                return 'Succursale'
            if val_clean.upper() == 'SEFAMAR':
                return 'SEFAMAR'
            if val_clean.upper() == 'SOMABUS':
                return 'SOMABUS'
            if val_clean.upper() == 'CKD':
                return 'CKD'
            return val_clean
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        # Hériter obligatoirement de l'entreprise, ville et service du demandeur
        requester = validated_data.get('requester')
        if requester and hasattr(requester, 'profile') and requester.profile:
            if requester.profile.company:
                validated_data['company'] = requester.profile.company
            if requester.profile.city and not validated_data.get('city'):
                validated_data['city'] = requester.profile.city
            if requester.profile.department and not validated_data.get('department'):
                validated_data['department'] = requester.profile.department

        request = PurchaseRequest.objects.create(**validated_data)
        for item_data in items_data:
            PurchaseItem.objects.create(request=request, **item_data)
        return request
    
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        # Update Request fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # We generally won't update items completely from the requester side after creation,
        # but Purchasing will update items individually (supplier/price). 
        # For simplicity in this demo, if items are provided during update, we recreate them or update them.
        if items_data is not None:
            # Simple approach: clear old and recreate
            instance.items.all().delete()
            for item_data in items_data:
                PurchaseItem.objects.create(request=instance, **item_data)
        
        return instance

class SourcingHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SourcingHistory
        fields = '__all__'

class QuoteComparisonHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = QuoteComparisonHistory
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'message', 'is_read', 'created_at']
