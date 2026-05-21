from django.contrib import admin
from .models import Profile, PurchaseRequest, SupplierCatalog, PurchaseItem, SourcingHistory, QuoteComparisonHistory

class PurchaseItemInline(admin.TabularInline):
    model = PurchaseItem
    extra = 1

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role']
    list_filter = ['role']

@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'requester', 'status', 'date_created']
    list_filter = ['status', 'date_created']
    search_fields = ['order_number', 'requester__username']
    inlines = [PurchaseItemInline]

@admin.register(SupplierCatalog)
class SupplierCatalogAdmin(admin.ModelAdmin):
    list_display = ['product_name', 'supplier_name', 'price', 'updated_at']
    search_fields = ['product_name', 'supplier_name']

@admin.register(SourcingHistory)
class SourcingHistoryAdmin(admin.ModelAdmin):
    list_display = ['product', 'location', 'created_at']
    list_filter = ['created_at', 'location']
    search_fields = ['product', 'location']

@admin.register(QuoteComparisonHistory)
class QuoteComparisonHistoryAdmin(admin.ModelAdmin):
    list_display = ['display_filenames', 'created_at']
    list_filter = ['created_at']
    
    def display_filenames(self, obj):
        return ", ".join(obj.filenames)
    display_filenames.short_description = "Fichiers comparés"

