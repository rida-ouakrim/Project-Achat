from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, PurchaseRequestViewSet, SupplierCatalogViewSet, ai_chat

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')
router.register('requests', PurchaseRequestViewSet, basename='request')
router.register('catalog', SupplierCatalogViewSet, basename='catalog')

urlpatterns = [
    path('chat/', ai_chat, name='ai-chat'),
    path('', include(router.urls)),
]
