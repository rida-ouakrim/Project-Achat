from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import UserViewSet, PurchaseRequestViewSet, SupplierCatalogViewSet, ai_chat, ai_sourcing, ai_compare_quotes, SourcingHistoryViewSet, QuoteComparisonHistoryViewSet, NotificationViewSet

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')
router.register('requests', PurchaseRequestViewSet, basename='request')
router.register('catalog', SupplierCatalogViewSet, basename='catalog')
router.register('sourcing-history', SourcingHistoryViewSet, basename='sourcing-history')
router.register('quote-comparison-history', QuoteComparisonHistoryViewSet, basename='quote-comparison-history')
router.register('notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('chat/', ai_chat, name='ai-chat'),
    path('ai/sourcing/', ai_sourcing, name='ai-sourcing'),
    path('ai/compare-quotes/', ai_compare_quotes, name='ai-compare-quotes'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),
]
