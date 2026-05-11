from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, PurchaseRequest, SupplierCatalog

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

class PurchaseRequestSerializer(serializers.ModelSerializer):
    requester_name = serializers.ReadOnlyField(source='requester.username')

    class Meta:
        model = PurchaseRequest
        fields = [
            'id', 'order_number', 'requester', 'requester_name', 
            'assignment', 'product', 'qty', 'observation', 
            'date_created', 'status', 'supplier', 'price', 'receipt_pdf', 'refusal_reason'
        ]
        read_only_fields = ['order_number', 'date_created']
