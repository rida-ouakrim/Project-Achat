from django.contrib import admin
from .models import Profile, PurchaseRequest, SupplierCatalog

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role']
    list_filter = ['role']

@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'requester', 'product', 'qty', 'status', 'date_created', 'supplier', 'price']
    list_filter = ['status', 'date_created']
    search_fields = ['order_number', 'product', 'requester__username', 'supplier']

@admin.register(SupplierCatalog)
class SupplierCatalogAdmin(admin.ModelAdmin):
    list_display = ['product_name', 'supplier_name', 'price', 'updated_at']
    search_fields = ['product_name', 'supplier_name']
