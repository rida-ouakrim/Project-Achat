from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, PurchaseRequest, SupplierCatalog, PurchaseItem, SourcingHistory, QuoteComparisonHistory, Notification

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['role']

class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'profile']

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
    validated_by_name = serializers.ReadOnlyField(source='validated_by.username')
    items = PurchaseItemSerializer(many=True)

    class Meta:
        model = PurchaseRequest
        fields = [
            'id', 'order_number', 'requester', 'requester_name', 
            'assignment', 'observation', 
            'date_created', 'status', 'receipt_pdf', 'request_pdf', 'refusal_reason', 'items',
            'is_validated', 'validated_by', 'validated_by_name'
        ]
        read_only_fields = ['order_number', 'date_created']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
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
