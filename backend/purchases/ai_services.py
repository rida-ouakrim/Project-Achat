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
        
        # Extraction sécurisée car le helper .text crash parfois quand Google Grounding injecte des métadonnées riches
        try:
            text = response.text
        except Exception:
            text = ""
            try:
                for candidate in response.candidates:
                    for part in candidate.content.parts:
                        if hasattr(part, 'text') and part.text:
                            text += part.text
            except Exception:
                pass

        text = text.strip()
        # Nettoyer les éventuels backticks Markdown
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
            
        suppliers = json.loads(text.strip())
        return {"success": True, "data": suppliers}
    except Exception as e:
        print(f"Vertex AI Sourcing Error: {e}")
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
            image = Image.open(file_obj)
            text = pytesseract.image_to_string(image, lang='fra')
    except Exception as e:
        print(f"Erreur d'extraction OCR pour {filename}: {e}")
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
        
        VOTRE ANALYSE :
        Analyse ces documents en détail à la lumière des besoins de SEFAMAR (camions, logistique, pièces détachées lourdes).
        1. Identifie précisément les produits/services proposés, quantités, prix unitaires, totaux et fournisseurs.
        2. Génère un tableau comparatif détaillé en Markdown pour confronter objectivement les offres.
        3. Formule une recommandation argumentée et stratégique sur l'offre la plus compatible et avantageuse pour SEFAMAR.
        4. Signale tout risque ou manque d'information cruciale (ex: garantie constructeur, délais de livraison, conformité MAN...).
        
        Formatte ta réponse en beau Markdown structuré et professionnel (utilises des listes, des titres ##, et un tableau Markdown pur).
        """
        
        response = model.generate_content(prompt, generation_config={"temperature": 0.1})
        return {"success": True, "markdown": response.text}
    except Exception as e:
        print(f"Vertex AI Compare Error: {e}")
        return {"success": False, "error": str(e)}
