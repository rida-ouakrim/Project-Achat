from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, PurchaseRequestViewSet, SupplierCatalogViewSet

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')
router.register('requests', PurchaseRequestViewSet, basename='request')
router.register('catalog', SupplierCatalogViewSet, basename='catalog')

urlpatterns = [
    path('', include(router.urls)),
]
