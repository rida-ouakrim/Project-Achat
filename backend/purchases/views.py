from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import Profile, PurchaseRequest, SupplierCatalog
from .serializers import UserSerializer, PurchaseRequestSerializer, SupplierCatalogSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        role = request.data.get('role', 'requester')

        if not username or not password:
            return Response({'error': "Le nom d'utilisateur et le mot de passe sont requis."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=username).exists():
            return Response({'error': "Cet utilisateur existe déjà."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password)
        Profile.objects.create(user=user, role=role)
        
        serializer = self.get_serializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get('password')
        if not new_password:
            return Response({'error': 'Le nouveau mot de passe est obligatoire'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        return Response({'success': 'Mot de passe mis à jour avec succès !'})

    @action(detail=False, methods=['post'])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        if not username or not password:
            return Response({'error': "Nom d'utilisateur et mot de passe requis."}, status=status.HTTP_400_BAD_REQUEST)
        
        user = authenticate(username=username, password=password)
        if user is not None:
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        return Response({'error': "Identifiants invalides."}, status=status.HTTP_401_UNAUTHORIZED)

class SupplierCatalogViewSet(viewsets.ModelViewSet):
    queryset = SupplierCatalog.objects.all().order_by('-updated_at')
    serializer_class = SupplierCatalogSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        product_name = self.request.query_params.get('product_name', None)
        if product_name is not None:
            # Filtrer par nom de produit exact ou insensible à la casse pour retrouver les précédents fournisseurs
            queryset = queryset.filter(product_name__iexact=product_name)
        return queryset

class PurchaseRequestViewSet(viewsets.ModelViewSet):
    queryset = PurchaseRequest.objects.all().order_by('-id')
    serializer_class = PurchaseRequestSerializer
    permission_classes = [permissions.AllowAny] 

    def perform_update(self, serializer):
        instance = serializer.save()
        # Automatisation : Enregistrer ou mettre à jour le catalogue fournisseur dès qu'un prix est saisi
        if instance.supplier and instance.price:
            SupplierCatalog.objects.update_or_create(
                product_name=instance.product,
                supplier_name=instance.supplier,
                defaults={'price': instance.price}
            )
