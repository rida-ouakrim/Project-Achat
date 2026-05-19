# 📘 Guide de Déploiement & Workflow de Production
### Projet : Achat SEFAMAR (Django / React / Google Cloud)

Ce guide récapitule le workflow professionnel à suivre pour effectuer des modifications locales et les envoyer en production sur votre VM Google Cloud **sans jamais écraser vos configurations critiques** (SSL/HTTPS, Clés API Google, Mots de passe).

---

## 🛑 Pourquoi le site a planté (Le problème d'origine)
Dans le passé, la configuration SSL (`frontend/nginx.conf`) et les ports de production (`docker-compose.yml`) n'existaient que sur votre serveur Google Cloud, mais **pas** dans votre dépôt Git local.
En effectuant une synchronisation forcée (`git reset --hard`), Git a écrasé les modifications exclusives du serveur par la configuration par défaut locale, désactivant le SSL.

---

## 🛡️ 1. La Nouvelle Règle d'Or (Sauvegarde Git)
Désormais, **vos configurations de production sont sauvegardées en local et suivies par Git**. 
- Le fichier `docker-compose.yml` local contient maintenant les ports `80` / `443` et le montage SSL.
- Le fichier `frontend/nginx.conf` local contient la configuration `mantruck.duckdns.org` et le HTTPS.

> [!IMPORTANT]
> **La sécurité est préservée :** Les mots de passe réels et les clés d'accès privées ne sont JAMAIS poussés sur GitHub car ils résident exclusivement dans `.env` et `credentials.json` (tous deux inscrits dans `.gitignore`).

---

## 🔄 2. Workflow Officiel : Du Local vers le Serveur
Pour toute future mise à jour (modification de design, ajout d'IA, correction de bug), suivez scrupuleusement ces **4 étapes** :

### Étape 1 : Enregistrez et Poussez depuis votre PC Windows 💻
Ouvrez votre terminal sur votre ordinateur local (`C:\Users\RIDA OUAKRIM\Desktop\rida\Project-Achat`) et tapez :
```powershell
# 1. Enregistrer les modifications locales
git add .

# 2. Créer la version (remplacez le texte par votre modification)
git commit -m "Mise à jour : Ajout des correctifs IA et robustesse"

# 3. Pousser sur GitHub
git push origin main
```

### Étape 2 : Récupérer le code sur la VM Google Cloud ☁️
Connectez-vous à la console de votre VM Google Cloud et naviguez dans le dossier :
```bash
cd ~/Project-Achat
git pull origin main
```
*(Grâce à notre nouveau workflow, cela mettra à jour le code SANS toucher à votre configuration SSL ni à votre fichier `.env`).*

### Étape 3 : Vérification des Clés de Sécurité (Si nécessaire) 🔐
Si et seulement si vous avez ajouté de nouvelles clés dans `.env` ou si vous changez de compte de service Google Cloud :
1. Modifiez le `.env` sur la VM : `nano .env`
2. Modifiez les clés sur la VM : `nano backend/credentials.json`

### Étape 4 : Relancer et Compiler proprement 🚀
C'est l'étape finale pour appliquer le nouveau code sans interruption :
```bash
# 1. Reconstruire et relancer les conteneurs en arrière-plan (prend 1 à 2 min)
docker-compose up -d --build

# 2. Mettre à jour la structure de la base de données (Toujours le faire en dernier)
docker-compose exec backend python manage.py migrate
```

---

## 📝 Checklist de Secours en cas de Problème en Production

| Symptôme | Cause probable | Solution |
| :--- | :--- | :--- |
| **"Ce site est inaccessible"** | Ports fermés ou conteneurs arrêtés | Vérifier le statut avec `docker ps` |
| **L'adresse HTTPS ne marche plus** | Montage de volume Let's Encrypt manquant | Vérifier les `volumes` dans `docker-compose.yml` |
| **"Impossible de charger les demandes"** | La base de données n'est pas à jour | Lancer `docker-compose exec backend python manage.py migrate` |
| **"Échec connexion Assistant Sourcing"** | Authentification Google Cloud ou Format | Consulter les logs avec `docker-compose logs --tail=50 backend` |
| **"Fichiers lourds / Échec upload devis"** | Cache Nginx de la VM non mis à jour | Relancer `docker-compose up -d --build` pour appliquer le `client_max_body_size 50M` |
| **Erreurs de lecture OCR en local** | Tesseract absent de Windows local | Rien à faire ! L'application bascule automatiquement et de manière transparente sur l'analyse d'images via Gemini 2.5 Flash Multimodal. |

---
*Ce guide a été mis à jour par votre Assistant IA et est enregistré à la racine de votre projet pour votre présentation.*
