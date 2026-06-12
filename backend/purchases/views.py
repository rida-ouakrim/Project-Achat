from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Profile, PurchaseRequest, SupplierCatalog, SourcingHistory, QuoteComparisonHistory, Notification
from .serializers import UserSerializer, PurchaseRequestSerializer, SupplierCatalogSerializer, SourcingHistorySerializer, QuoteComparisonHistorySerializer, NotificationSerializer
from .company_context import SEFAMAR_CONTEXT

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
            # Générer les jetons JWT SimpleJWT
            refresh = RefreshToken.for_user(user)
            serializer = self.get_serializer(user)
            
            # Récupérer le rôle à partir du profil associé
            try:
                role = user.profile.role
            except Exception:
                role = 'requester' # Rôle par défaut si profil manquant
                
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': serializer.data,
                'role': role
            })
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

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if 'items' in data and isinstance(data['items'], str):
            import json
            try:
                data['items'] = json.loads(data['items'])
            except json.JSONDecodeError:
                pass
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        instance = serializer.save()
        
        # Check if the requester is a validator (auto-validation)
        if instance.requester.username in ['man@sefamar.ma', 'chadi@sefamar.ma']:
            instance.is_validated = True
            instance.validated_by = instance.requester
            instance.save()
            
            # Display name logic
            validator_name = "Mme EL MANSOURI" if instance.requester.username == "man@sefamar.ma" else "Chadi Ismail"
            
            # Notify the purchasing team
            purchasing_users = User.objects.filter(profile__role='purchasing')
            for p_user in purchasing_users:
                Notification.objects.create(
                    user=p_user,
                    message=f"La demande {instance.order_number} de {validator_name} a été validée automatiquement et est prête pour achat."
                )
        else:
            # Notify validators: Mme EL MANSOURI and Chadi Ismail
            validators = User.objects.filter(username__in=['man@sefamar.ma', 'chadi@sefamar.ma'])
            for val in validators:
                Notification.objects.create(
                    user=val,
                    message=f"Nouvelle demande {instance.order_number} de {instance.requester.username} en attente de validation."
                )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_status = instance.status
        
        data = request.data.copy()
        if 'items' in data and isinstance(data['items'], str):
            import json
            try:
                data['items'] = json.loads(data['items'])
            except json.JSONDecodeError:
                pass
                
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Trigger status update notifications
        updated_instance = self.get_object()
        new_status = updated_instance.status
        if old_status != new_status:
            if new_status == 'Commandé':
                Notification.objects.create(
                    user=updated_instance.requester,
                    message=f"Le statut de votre demande {updated_instance.order_number} est passé à Commandé."
                )
            elif new_status == 'Reçu':
                Notification.objects.create(
                    user=updated_instance.requester,
                    message=f"Le statut de votre demande {updated_instance.order_number} est passé à Reçu."
                )
            elif new_status == 'Refusé':
                reason = updated_instance.refusal_reason or "aucun motif spécifié"
                Notification.objects.create(
                    user=updated_instance.requester,
                    message=f"Votre demande {updated_instance.order_number} a été refusée. Motif : {reason}."
                )
                
        return Response(serializer.data)

    def perform_update(self, serializer):
        instance = serializer.save()
        # Automatisation : Enregistrer ou mettre à jour le catalogue fournisseur dès qu'un prix est saisi
        # Now we check every item in the request
        for item in instance.items.all():
            if item.supplier and item.price:
                SupplierCatalog.objects.update_or_create(
                    product_name=item.product,
                    supplier_name=item.supplier,
                    defaults={'price': item.price}
                )

    @action(detail=True, methods=['post'])
    def validate_request(self, request, pk=None):
        instance = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': "ID de l'utilisateur requis."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validator = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': "Utilisateur non trouvé."}, status=status.HTTP_404_NOT_FOUND)
            
        instance.is_validated = True
        instance.validated_by = validator
        instance.save()
        
        # Display name logic
        validator_name = "Mme EL MANSOURI" if validator.username == "man@sefamar.ma" else "Chadi Ismail"
        if validator.username not in ["man@sefamar.ma", "chadi@sefamar.ma"]:
            validator_name = validator.username
            
        # 1. Notify the requester
        Notification.objects.create(
            user=instance.requester,
            message=f"Votre demande {instance.order_number} a été validée par {validator_name}."
        )
        
        # 2. Notify the purchasing team
        purchasing_users = User.objects.filter(profile__role='purchasing')
        for p_user in purchasing_users:
            Notification.objects.create(
                user=p_user,
                message=f"La demande {instance.order_number} a été validée par {validator_name} et est prête pour achat."
            )
            
        return Response({'success': True, 'validation_badge': f"Validé par {validator_name}"})

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
        items_str = ", ".join([f"{i.product} (Qte {i.qty}, Frn: {i.supplier or 'N/A'}, Prix: {i.price or 'N/A'})" for i in r.items.all()])
        context += f"- ID #{r.order_number}: Demandé par {r.requester.username}, Statut {r.status}, Notes: {r.observation or 'N/A'}\n"
        context += f"  Articles: {items_str}\n"
    
    context += "\nREFERENTIEL FOURNISSEURS :\n"
    for c in catalog:
        context += f"- Prod: {c.product_name}, Vendeur: {c.supplier_name}, Prix: {c.price}\n"

    final_prompt = f"""
Tu es 'L'Assistant Achats Officiel de SEFAMAR S.A.', une Intelligence Artificielle officielle experte du marché marocain et des véhicules industriels (distributeur exclusif MAN Truck & Bus au Maroc).
Réponds toujours en français, de manière professionnelle, polie et claire.

{SEFAMAR_CONTEXT}

Utilise le contexte métier ci-dessous pour répondre précisément. Si ça ne répond pas à la question, utilise tes connaissances approfondies en logistique lourde et tes données générales sur le Maroc.

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

from rest_framework.decorators import api_view
from .ai_services import get_sourcing_suggestions, extract_text_from_file, compare_quotes

@api_view(['POST'])
def ai_sourcing(request):
    product = request.data.get('product')
    location = request.data.get('location', 'Casablanca')
    
    if not product:
        return Response({'success': False, 'error': 'Le produit est requis.'}, status=400)
        
    result = get_sourcing_suggestions(product, location)
    if result.get('success'):
        # Save to history
        try:
            SourcingHistory.objects.create(
                product=product,
                location=location,
                results=result.get('data', [])
            )
        except Exception as save_err:
            print(f"Error saving sourcing history: {save_err}")
            
        return Response(result)
    else:
        return Response(result, status=500)

class SourcingHistoryViewSet(viewsets.ModelViewSet):
    queryset = SourcingHistory.objects.all()
    serializer_class = SourcingHistorySerializer
    permission_classes = [permissions.AllowAny]

@api_view(['POST'])
def ai_compare_quotes(request):
    import concurrent.futures

    files = request.FILES.getlist('files')
    instructions = request.data.get('instructions', '')
    if not files:
        return Response({'success': False, 'error': 'Aucun fichier fourni.'}, status=400)
        
    # Extraction du texte en parallèle pour réduire le temps global d'OCR
    files_data = []
    files_order = [f.name for f in files]
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(files), 6)) as executor:
        future_to_filename = {
            executor.submit(extract_text_from_file, f.file, f.name): f.name
            for f in files
        }
        
        for future in concurrent.futures.as_completed(future_to_filename):
            filename = future_to_filename[future]
            try:
                text = future.result()
            except Exception as exc:
                print(f"Exception lors de l'extraction de {filename}: {exc}")
                text = f"[Erreur de lecture du fichier {filename}]"
            
            files_data.append({
                "filename": filename,
                "text": text
            })
            
    # Garantir la conservation de l'ordre initial des documents
    files_data.sort(key=lambda x: files_order.index(x["filename"]))
        
    result = compare_quotes(files_data, instructions=instructions)
    if result.get('success'):
        try:
            # Enregistrer dans l'historique
            QuoteComparisonHistory.objects.create(
                filenames=[f.name for f in files],
                markdown_result=result.get('markdown', '')
            )
        except Exception as err:
            print(f"Failed to save comparison history: {err}")
            
        return Response(result)
    else:
        return Response(result, status=500)

class QuoteComparisonHistoryViewSet(viewsets.ModelViewSet):
    queryset = QuoteComparisonHistory.objects.all()
    serializer_class = QuoteComparisonHistorySerializer
    permission_classes = [permissions.AllowAny]

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all().order_by('-created_at')
    serializer_class = NotificationSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        if user_id:
            return self.queryset.filter(user_id=user_id)
        if self.request.user and self.request.user.is_authenticated:
            return self.queryset.filter(user=self.request.user)
        return self.queryset

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        user_id = request.data.get('user_id')
        if user_id:
            Notification.objects.filter(user_id=user_id).update(is_read=True)
            return Response({'success': True})
        if request.user and request.user.is_authenticated:
            Notification.objects.filter(user=request.user).update(is_read=True)
            return Response({'success': True})
        return Response({'error': "ID de l'utilisateur manquant."}, status=400)
