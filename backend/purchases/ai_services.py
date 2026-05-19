import os
import io
import json
import pytesseract
import pdfplumber
from PIL import Image
import vertexai
from vertexai.generative_models import GenerativeModel, Tool, grounding
from django.conf import settings
from .company_context import SEFAMAR_CONTEXT

# Initialiser Vertex AI
try:
    vertexai.init(
        project=os.environ.get('GOOGLE_CLOUD_PROJECT', 'chrome-backbone-496013-p4'),
        location=os.environ.get('GOOGLE_CLOUD_REGION', 'us-central1')
    )
except Exception as e:
    print(f"Erreur d'initialisation Vertex AI: {e}")

def get_sourcing_suggestions(product_name, location="Casablanca"):
    """
    Utilise Gemini avec Google Search Grounding pour trouver des fournisseurs réels.
    """
    try:
        # Activer l'outil Google Search
        tool = Tool.from_dict({"google_search": {}})
        model = GenerativeModel("gemini-2.5-flash")
        
        prompt = f"""
        Tu es un assistant d'achat expert mandaté par l'entreprise SEFAMAR S.A. au Maroc.
        
        {SEFAMAR_CONTEXT}
        
        VOTRE MISSION :
        Cherche sur internet de manière exhaustive TOUS les fournisseurs professionnels, fiables et pertinents pour l'activité de SEFAMAR (trouve-en le maximum possible, entre 15 et 25) pour le produit suivant : "{product_name}" dans la ville ou région de "{location}".
        Priorise les fournisseurs qui livrent localement et s'adaptent aux besoins des grands parcs de camions/bus ou des industries lourdes.

        Pour chaque fournisseur, donne : le nom, le numéro de téléphone, l'adresse, le lien du site web (s'il existe) et une courte justification expliquant pourquoi ce fournisseur est pertinent spécifiquement pour SEFAMAR.
        
        Formatte ta réponse EXCLUSIVEMENT en JSON sous la forme suivante :
        [
            {{
                "supplier_name": "Nom de l'entreprise",
                "phone": "+212 5XX XX XX XX",
                "address": "Adresse complète",
                "website": "https://www.site.com",
                "justification": "Pourquoi ce fournisseur est particulièrement pertinent et adapté aux exigences de SEFAMAR"
            }}
        ]
        Ne renvoie que le JSON valide, sans blocs de code Markdown (pas de ```json), ni de texte explicatif avant ou après.
        """
        
        response = model.generate_content(
            prompt,
            tools=[tool],
            generation_config={"temperature": 0.2}
        )
        
        # Extraction ultra-sécurisée : l'accès à .text peut lever ValueError si Google Grounding injecte des citations.
        # Le hasattr renvoie True mais l'accès lève ValueError, donc il faut un try/except individuel par part !
        try:
            text = response.text
        except Exception:
            text = ""
            try:
                for candidate in response.candidates:
                    for part in candidate.content.parts:
                        try:
                            # Chaque part est testée individuellement pour ne pas bloquer les autres
                            part_text = part.text
                            if part_text:
                                text += part_text
                        except Exception:
                            pass # Ignorer les métadonnées de recherche Google qui ne sont pas du texte
            except Exception:
                pass

        text = text.strip()
        
        # Extraction robuste du bloc JSON grâce à Regex (pour éliminer le texte explicatif éventuel)
        import re
        json_match = re.search(r'\[.*\]', text, re.DOTALL)
        if json_match:
            text = json_match.group(0)
            
        # Nettoyage final au cas où des backticks Markdown subsisteraient
        text = text.replace('```json', '').replace('```', '').strip()
            
        suppliers = json.loads(text)
        return {"success": True, "data": suppliers}
    except Exception as e:
        print(f"Vertex AI Sourcing Error: {e}")
        # Afficher le texte reçu pour debug si la conversion JSON échoue
        if 'text' in locals() and text:
            print(f"Texte reçu de Gemini qui a échoué à l'analyse: {text[:500]}")
        return {"success": False, "error": str(e)}

def extract_text_from_file(file_obj, filename):
    """
    Extrait le texte d'un fichier en utilisant pdfplumber pour les PDF textuels,
    et pytesseract pour les images.
    """
    text = ""
    ext = filename.split('.')[-1].lower()
    
    try:
        if ext == 'pdf':
            with pdfplumber.open(file_obj) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            # Si le PDF est vide de texte (scanné), on pourrait utiliser pdf2image + tesseract
            # Mais pour simplifier, on s'attend à des PDF numériques ou on compte sur pdfplumber.
        elif ext in ['png', 'jpg', 'jpeg']:
            try:
                # Rembobiner le fichier pour le lire à partir du début
                file_obj.seek(0)
                file_bytes = file_obj.read()
                
                from vertexai.generative_models import Part
                mime_type = "image/png" if ext == "png" else "image/jpeg"
                image_part = Part.from_data(data=file_bytes, mime_type=mime_type)
                
                # Gemini 2.5 Flash lit directement les images avec une précision extrême et sans perte de structure
                model = GenerativeModel("gemini-2.5-flash")
                prompt = "Extrais tout le texte, les prix, les modèles, les garanties, et les spécifications détaillées de cette image de devis de manière exhaustive, structurée et très précise."
                response = model.generate_content([prompt, image_part])
                text = response.text
            except Exception as gemini_err:
                print(f"Échec de l'extraction Gemini Multimodal pour {filename}: {gemini_err}")
                text = f"[Erreur de lecture du fichier {filename}]"
    except Exception as e:
        print(f"Erreur d'extraction générale pour {filename}: {e}")
        text = f"[Erreur de lecture du fichier {filename}]"
        
    return text

def compare_quotes(files_data):
    """
    files_data = [{"filename": "devis1.pdf", "text": "contenu extrait..."}, ...]
    """
    try:
        model = GenerativeModel("gemini-2.5-flash")
        
        context = ""
        for file in files_data:
            context += f"\n--- DEBUT DU DOCUMENT : {file['filename']} ---\n"
            context += file['text']
            context += f"\n--- FIN DU DOCUMENT : {file['filename']} ---\n"
            
        prompt = f"""
        Tu es un analyste achats expert mandaté par l'entreprise SEFAMAR S.A. au Maroc.
        
        {SEFAMAR_CONTEXT}
        
        Voici le contenu brut extrait de plusieurs devis et/ou fiches techniques :
        {context}
        
        VOTRE MISSION & EXIGENCES DE FORMAT :
        Ne perds pas de jetons à rédiger des descriptions individuelles ou des listes de détails pour chaque produit/devis séparément.
        
        Va DIRECTEMENT à l'essentiel en structurant ton rapport exclusivement ainsi :
        1. ## 📊 Tableau Comparatif Synthétique (Génère directement un grand tableau Markdown clair pour confronter toutes les offres : Caractéristiques, Prix unitaire MAD, Garantie, Connectivité, Points Forts, Points Faibles, et Observations pour SEFAMAR).
        2. ## 💡 Recommandation Stratégique Justifiée (Explique clairement quelle offre est la plus avantageuse pour SEFAMAR S.A., son réseau national, ses ateliers et ses contraintes).
        3. ## ⚠️ Points de Vigilance et Risques (Signale les garanties manquantes, les délais de livraison, la connectivité réseau wifi/ethernet manquante ou toute autre anomalie commerciale).
        """
        
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.1,
                "max_output_tokens": 8192
            }
        )
        return {"success": True, "markdown": response.text}
    except Exception as e:
        print(f"Vertex AI Compare Error: {e}")
        return {"success": False, "error": str(e)}
