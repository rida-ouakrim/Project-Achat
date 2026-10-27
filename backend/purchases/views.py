from django.db import models
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
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        full_name = str(request.data.get('full_name') or request.data.get('name') or '').strip()
        email = str(request.data.get('email') or '').strip()
        username = str(request.data.get('username') or '').strip()
        password = request.data.get('password')
        role = request.data.get('role', 'requester')
        company = request.data.get('company', 'SEFAMAR')
        city = str(request.data.get('city') or '').strip()
        department = request.data.get('department', '').strip()
        validator_id = request.data.get('validator_id')
        validator_ids = request.data.get('validator_ids') or []
        assigned_requester_ids = request.data.get('assigned_requester_ids') or []

        # Si username non fourni mais email fourni, username devient l'email
        if not username and email:
            username = email
        elif not email and username and '@' in username:
            email = username

        if not username and not email:
            return Response({'error': "L'adresse email est requise."}, status=status.HTTP_400_BAD_REQUEST)
        if not password:
            return Response({'error': "Le mot de passe est requis."}, status=status.HTTP_400_BAD_REQUEST)

        username = str(username).strip()
        if User.objects.filter(username__iexact=username).exists():
            return Response({'error': f"L'utilisateur avec l'identifiant '{username}' existe déjà."}, status=status.HTTP_400_BAD_REQUEST)

        name_parts = full_name.split(' ', 1) if full_name else ['', '']
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''

        user = User.objects.create_user(
            username=username, 
            password=password, 
            email=email,
            first_name=first_name,
            last_name=last_name
        )
        val_obj = None
        if validator_id:
            val_obj = User.objects.filter(id=validator_id).first()
        profile = Profile.objects.create(
            user=user, 
            role=role, 
            company=company, 
            city=city,
            department=department, 
            full_name=full_name,
            validator=val_obj
        )

        if validator_ids:
            profile.validators.set(validator_ids)
            if not val_obj:
                profile.validator_id = validator_ids[0]
                profile.save()
        elif val_obj:
            profile.validators.add(val_obj)

        if assigned_requester_ids:
            for req_id in assigned_requester_ids:
                r_prof = Profile.objects.filter(user_id=req_id).first()
                if r_prof:
                    r_prof.validators.add(user)
                    if not r_prof.validator_id:
                        r_prof.validator = user
                        r_prof.save()
        
        serializer = self.get_serializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post', 'patch', 'put'])
    def update_full(self, request, pk=None):
        user = self.get_object()
        full_name = request.data.get('full_name') if 'full_name' in request.data else request.data.get('name')
        email = request.data.get('email')
        username = request.data.get('username')
        role = request.data.get('role')
        company = request.data.get('company')
        city = request.data.get('city')
        department = request.data.get('department')
        validator_id = request.data.get('validator_id')
        validator_ids = request.data.get('validator_ids')
        assigned_requester_ids = request.data.get('assigned_requester_ids')
        password = request.data.get('password')
        is_active = request.data.get('is_active')

        # Mise à jour email et nom complet
        if email is not None:
            user.email = str(email).strip()
        if full_name is not None:
            name_parts = str(full_name).strip().split(' ', 1)
            user.first_name = name_parts[0] if name_parts else ''
            user.last_name = name_parts[1] if len(name_parts) > 1 else ''

        # Modification du nom d'utilisateur si renseigné et différent
        if username and str(username).strip() and str(username).strip().lower() != user.username.lower():
            new_username = str(username).strip()
            if User.objects.filter(username__iexact=new_username).exclude(id=user.id).exists():
                return Response({'error': "Ce nom d'utilisateur est déjà utilisé par un autre compte."}, status=status.HTTP_400_BAD_REQUEST)
            user.username = new_username

        # Modification du mot de passe si renseigné
        if password and str(password).strip():
            user.set_password(str(password).strip())

        # Modification du statut actif
        if is_active is not None:
            user.is_active = bool(is_active)

        user.save()

        # Mise à jour du profil (nom complet, rôle, entreprise, ville, département/service, validateur)
        profile, _ = Profile.objects.get_or_create(user=user)
        if full_name is not None:
            profile.full_name = str(full_name).strip()
        if role:
            profile.role = role
        if company:
            profile.company = company
        if city is not None:
            profile.city = str(city).strip()
        if department is not None:
            profile.department = str(department).strip()

        # Gestion des validateurs assignés à ce demandeur
        if validator_ids is not None:
            profile.validators.set(validator_ids)
            if validator_ids:
                profile.validator_id = validator_ids[0]
            else:
                profile.validator = None
            profile.save()
        elif 'validator_id' in request.data:
            if validator_id:
                val_user = User.objects.filter(id=validator_id).first()
                profile.validator = val_user
                profile.validators.set([val_user] if val_user else [])
            else:
                profile.validator = None
                profile.validators.clear()
            profile.save()

        # Si ce compte est un validateur et qu'on configure les demandeurs qu'il supervise
        if assigned_requester_ids is not None:
            # 1. Retirer ce validateur des demandeurs qui ne sont plus dans la liste
            for old_p in Profile.objects.filter(models.Q(validator=user) | models.Q(validators=user)).exclude(user_id__in=assigned_requester_ids):
                old_p.validators.remove(user)
                if old_p.validator_id == user.id:
                    remaining = old_p.validators.first()
                    old_p.validator = remaining
                    old_p.save()
            # 2. Ajouter ce validateur à tous les demandeurs de la liste
            for req_id in assigned_requester_ids:
                r_prof = Profile.objects.filter(user_id=req_id).first()
                if r_prof:
                    r_prof.validators.add(user)
                    if not r_prof.validator_id:
                        r_prof.validator = user
                        r_prof.save()

        profile.save()

        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=True, methods=['post', 'patch'])
    def update_role_validator(self, request, pk=None):
        user = self.get_object()
        role = request.data.get('role')
        company = request.data.get('company')
        city = request.data.get('city')
        department = request.data.get('department')
        profile, _ = Profile.objects.get_or_create(user=user)
        if role:
            profile.role = role
        if company:
            profile.company = company
        if city is not None:
            profile.city = str(city).strip()
        if department is not None:
            profile.department = department.strip()
        
        if 'validator_id' in request.data:
            validator_id = request.data.get('validator_id')
            if validator_id:
                val_user = User.objects.filter(id=validator_id).first()
                profile.validator = val_user
            else:
                profile.validator = None
        profile.save()
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.username in ['rouakrim@sefamar.ma', 'achat@sefamar.ma', 'man@sefamar.ma']:
            return Response({'error': "Impossible de supprimer ce compte système principal."}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response({'success': "Utilisateur supprimé avec succès."}, status=status.HTTP_200_OK)

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
        
        username = str(username).strip()
        matched_user = User.objects.filter(username__iexact=username).first()
        if not matched_user:
            matched_user = User.objects.filter(email__iexact=username).first()
        if matched_user:
            username = matched_user.username

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

    def get_queryset(self):
        queryset = super().get_queryset()
        company = self.request.query_params.get('company', None)
        if company and company != 'Tous':
            queryset = queryset.filter(company__iexact=company)
        return queryset

    def create(self, request, *args, **kwargs):
        if hasattr(request.data, 'dict'):
            data = request.data.dict()
        else:
            try:
                data = dict(request.data)
            except Exception:
                data = request.data.copy()

        if 'items' in data and isinstance(data['items'], str):
            import json
            try:
                data['items'] = json.loads(data['items'])
            except json.JSONDecodeError:
                pass

        if hasattr(request, 'FILES') and 'request_pdf' in request.FILES:
            files = request.FILES.getlist('request_pdf')
            if len(files) == 1:
                data['request_pdf'] = files[0]
            elif len(files) > 1:
                # Si plusieurs images sont fournies, les combiner proprement en un seul document PDF
                has_pdf = any(f.name.lower().endswith('.pdf') for f in files)
                if not has_pdf:
                    try:
                        import io
                        import uuid
                        from PIL import Image
                        from django.core.files.uploadedfile import InMemoryUploadedFile

                        pil_images = []
                        for f in files:
                            img = Image.open(f)
                            if img.mode in ('RGBA', 'P', 'LA'):
                                img = img.convert('RGB')
                            elif img.mode != 'RGB':
                                img = img.convert('RGB')
                            pil_images.append(img)

                        if pil_images:
                            pdf_buf = io.BytesIO()
                            first_img = pil_images[0]
                            rest_imgs = pil_images[1:]
                            first_img.save(pdf_buf, format='PDF', save_all=True, append_images=rest_imgs)
                            pdf_buf.seek(0)

                            filename = f"pieces_jointes_{uuid.uuid4().hex[:8]}.pdf"
                            combined_file = InMemoryUploadedFile(
                                pdf_buf,
                                'request_pdf',
                                filename,
                                'application/pdf',
                                pdf_buf.getbuffer().nbytes,
                                None
                            )
                            data['request_pdf'] = combined_file
                    except Exception as e:
                        print("Erreur fusion images en PDF:", e)
                        data['request_pdf'] = files[0]
                else:
                    pdf_file = next((f for f in files if f.name.lower().endswith('.pdf')), files[0])
                    data['request_pdf'] = pdf_file

        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            print("Erreurs validation création demande:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        requester = serializer.validated_data.get('requester')
        req_company = getattr(getattr(requester, 'profile', None), 'company', 'SEFAMAR')
        req_city = getattr(getattr(requester, 'profile', None), 'city', '')
        req_dept = getattr(getattr(requester, 'profile', None), 'department', '')
        instance = serializer.save(
            company=req_company if req_company else 'SEFAMAR',
            city=serializer.validated_data.get('city') or req_city,
            department=serializer.validated_data.get('department') or req_dept
        )
        
        # 1. Vérifier si le demandeur appartient à l'équipe comptabilité (validation sur feuille papier)
        is_accounting = (
            instance.requester.username == 'comptabilite@sefamar.ma' or 
            'compta' in instance.requester.username.lower()
        )
        if is_accounting:
            # Ne pas notifier les validateurs électroniques : validation déjà faite sur feuille papier
            purchasing_users = User.objects.filter(profile__role='purchasing')
            for p_user in purchasing_users:
                Notification.objects.create(
                    user=p_user,
                    message=f"Nouvelle demande {instance.order_number} de la Comptabilité (validée sur feuille papier) prête pour achat."
                )
        # 2. Check if the requester is a validator or commercial (auto-validation)
        elif instance.requester.username in ['man@sefamar.ma', 'chadi@sefamar.ma', 'g.benelhassane@sefamar.ma', 'obelkadi.man@sefamar.ma']:
            instance.is_validated = True
            instance.validated_by = instance.requester
            instance.save()
            
            # Display name logic
            if instance.requester.username == "man@sefamar.ma":
                validator_name = "Mme EL MANSOURI"
            elif instance.requester.username == "chadi@sefamar.ma":
                validator_name = "Chadi Ismail"
            elif instance.requester.username == "obelkadi.man@sefamar.ma":
                validator_name = "O. BELKADI (Commercial)"
            else:
                validator_name = "Mme BENELHASSANE"
            
            # Notify the purchasing team
            purchasing_users = User.objects.filter(profile__role='purchasing')
            for p_user in purchasing_users:
                Notification.objects.create(
                    user=p_user,
                    message=f"La demande {instance.order_number} de {validator_name} a été validée automatiquement et est prête pour achat."
                )
        else:
            # Récupérer la société et la ville de la demande
            req_company = instance.company or getattr(getattr(instance.requester, 'profile', None), 'company', 'SEFAMAR')
            req_city = instance.city or getattr(getattr(instance.requester, 'profile', None), 'city', '')
            entity_label = f"{req_company} ({req_city})" if (req_company == 'Succursale' and req_city) else req_company

            # 1. Vérifier si le demandeur a des validateurs attitrés
            assigned_validators = []
            if hasattr(instance.requester, 'profile') and instance.requester.profile:
                prof = instance.requester.profile
                assigned_validators = list(prof.validators.all())
                if prof.validator and prof.validator not in assigned_validators:
                    assigned_validators.append(prof.validator)

            if assigned_validators:
                for assigned_val in assigned_validators:
                    Notification.objects.create(
                        user=assigned_val,
                        message=f"Nouvelle demande {instance.order_number} ({entity_label}) de {instance.requester.username} vous étant assignée en attente de validation."
                    )
                # Notifier la DG si société SEFAMAR
                if req_company == 'SEFAMAR':
                    dg = User.objects.filter(username='man@sefamar.ma').first()
                    if dg and dg not in assigned_validators:
                        Notification.objects.create(
                            user=dg,
                            message=f"Nouvelle demande {instance.order_number} ({entity_label}) de {instance.requester.username} (assignée à {', '.join(v.username for v in assigned_validators)})."
                        )
            else:
                # 2. Pas de validateur spécifique : notifier les validateurs de la MÊME entreprise / même ville !
                if req_company == 'Succursale' and req_city:
                    validators = User.objects.filter(
                        profile__role__in=['validator', 'director'],
                        profile__company__iexact='Succursale',
                        profile__city__iexact=req_city
                    )
                    if not validators.exists():
                        validators = User.objects.filter(
                            profile__company__iexact='Succursale',
                            profile__city__iexact=req_city
                        )
                else:
                    validators = User.objects.filter(
                        profile__role__in=['validator', 'director'],
                        profile__company__iexact=req_company
                    )
                    
                    # Si aucun validateur avec rôle explicite trouvé pour cette entreprise
                    if not validators.exists():
                        if req_company == 'SEFAMAR':
                            validators = User.objects.filter(username__in=['man@sefamar.ma', 'chadi@sefamar.ma', 'g.benelhassane@sefamar.ma'])
                        else:
                            validators = User.objects.filter(profile__company__iexact=req_company)

                for val in validators:
                    Notification.objects.create(
                        user=val,
                        message=f"Nouvelle demande {instance.order_number} ({entity_label}) de {instance.requester.username} en attente de validation."
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
        if validator.username == "man@sefamar.ma":
            validator_name = "Mme EL MANSOURI"
        elif validator.username == "chadi@sefamar.ma":
            validator_name = "Chadi Ismail"
        elif validator.username == "g.benelhassane@sefamar.ma":
            validator_name = "Mme BENELHASSANE"
        else:
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
    user_id = request.data.get('user_id')
    
    if not product:
        return Response({'success': False, 'error': 'Le produit est requis.'}, status=400)
        
    result = get_sourcing_suggestions(product, location)
    if result.get('success'):
        # Save to history for the logged in user
        try:
            user = request.user if request.user and request.user.is_authenticated else None
            if not user and user_id:
                try:
                    user = User.objects.get(id=user_id)
                except User.DoesNotExist:
                    pass

            SourcingHistory.objects.create(
                user=user,
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
    queryset = SourcingHistory.objects.all().order_by('-created_at')
    serializer_class = SourcingHistorySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        try:
            if user_id:
                return self.queryset.filter(user_id=user_id)
            if self.request.user and self.request.user.is_authenticated:
                return self.queryset.filter(user=self.request.user)
            return self.queryset
        except Exception as e:
            print("Erreur filtre historique (migration requise):", e)
            return self.queryset

@api_view(['POST'])
def ai_compare_quotes(request):
    import concurrent.futures

    files = request.FILES.getlist('files')
    instructions = request.data.get('instructions', '')
    user_id = request.data.get('user_id')

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
            user = request.user if request.user and request.user.is_authenticated else None
            if not user and user_id:
                try:
                    user = User.objects.get(id=user_id)
                except User.DoesNotExist:
                    pass

            # Enregistrer dans l'historique
            QuoteComparisonHistory.objects.create(
                user=user,
                filenames=[f.name for f in files],
                markdown_result=result.get('markdown', '')
            )
        except Exception as err:
            print(f"Failed to save comparison history: {err}")
            
        return Response(result)
    else:
        return Response(result, status=500)

class QuoteComparisonHistoryViewSet(viewsets.ModelViewSet):
    queryset = QuoteComparisonHistory.objects.all().order_by('-created_at')
    serializer_class = QuoteComparisonHistorySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        try:
            if user_id:
                return self.queryset.filter(user_id=user_id)
            if self.request.user and self.request.user.is_authenticated:
                return self.queryset.filter(user=self.request.user)
            return self.queryset
        except Exception as e:
            print("Erreur filtre historique (migration requise):", e)
            return self.queryset

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
