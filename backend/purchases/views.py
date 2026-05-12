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

import os
import requests
from rest_framework.decorators import api_view

@api_view(['POST'])
def ai_chat(request):
    user_message = request.data.get('message', '')
    if not user_message:
        return Response({'error': 'Message manquant'}, status=400)

    # 1. Aggregation du contexte local
    reqs = PurchaseRequest.objects.all().order_by('-id')[:30] 
    catalog = SupplierCatalog.objects.all()[:30]
    
    context = "CONTEXTE LOCAL ACTUEL (MAN TRUCK MAROC) :\n"
    context += "COMMANDES RECENTS :\n"
    for r in reqs:
        context += f"- ID #{r.order_number}: Demandé par {r.requester.username}, Produit {r.product}, Qte {r.qty}, Statut {r.status}, Fournisseur {r.supplier or 'Non défini'}, Prix {r.price or 'TBD'}, Notes: {r.observation or 'N/A'}\n"
    
    context += "\nREFERENTIEL FOURNISSEURS :\n"
    for c in catalog:
        context += f"- Prod: {c.product_name}, Vendeur: {c.supplier_name}, Prix: {c.price}\n"

    final_prompt = f"""
Tu es 'L'Assistant Achats MAN', une Intelligence Artificielle officielle experte du marché marocain et des processus achats de MAN Truck & Bus Morocco.
Réponds toujours en français, de manière professionnelle et claire.
Utilise le contexte local ci-dessous pour répondre précisément. Si ça ne répond pas à la question, utilise tes connaissances pour conseiller le marché marocain en général.

{context}
"""

    api_key = os.environ.get('GROQ_API_KEY')
    if not api_key:
         return Response({'reply': "Erreur : La clé API GROQ n'est pas configurée dans le fichier d'environnement."})

    # Utilisation directe de l'API HTTP de Groq (Interface OpenAI compatible)
    target_url = "https://api.groq.com/openai/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama-3.3-70b-versatile", 
        "messages": [
            {"role": "system", "content": final_prompt},
            {"role": "user", "content": user_message}
        ],
        "temperature": 0.7
    }
    
    try:
        r = requests.post(target_url, json=payload, headers=headers, timeout=20)
        data = r.json()
        
        # Navigation dans le format standard OpenAI utilisé par Groq
        if 'choices' in data and len(data['choices']) > 0:
            ai_text = data['choices'][0]['message']['content']
            return Response({'reply': ai_text})
        else:
            return Response({'reply': "Groq a retourné une réponse inattendue ou vide.", 'debug': data})
    except Exception as e:
        return Response({'reply': f"Une erreur technique avec Groq est survenue : {str(e)}"})
