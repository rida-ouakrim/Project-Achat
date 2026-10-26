# 📘 Guide Utilisateur — Espace Demandeur
### Système Officiel de Gestion des Demandes d'Achat (SEFAMAR • SOMABUS • CKD)

---

Ce document est destiné à tous les collaborateurs ayant le rôle de **Demandeur** (Atelier, Magasin, ADV, Moyens Généraux, Commercial, Services Techniques...). Il explique pas à pas comment vous connecter, créer une demande d'achat, ajouter des pièces jointes et suivre vos commandes jusqu'à la livraison.

---

## 📑 Sommaire
1. [Accès et Connexion](#1-accès-et-connexion)
2. [Vue Générale de l'Espace Demandeur](#2-vue-générale-de-lespace-demandeur)
3. [Créer une Demande d'Achat](#3-créer-une-demande-dachat)
4. [Cycle de Vie d'une Demande (Workflow)](#4-cycle-de-vie-dune-demande-workflow)
5. [Suivre l'État de Mes Demandes](#5-suivre-létat-de-mes-demandes)
6. [Notifications et Alertes](#6-notifications-et-alertes)
7. [Foire Aux Questions (FAQ) & Bonnes Pratiques](#7-foire-aux-questions-faq--bonnes-pratiques)

---

## 1. Accès et Connexion

### Étapes de connexion :
1. Rendez-vous sur l'adresse Web de l'application (ex : `http://34.155.134.201` ou votre adresse locale).
2. Saisissez votre **Nom d'utilisateur** ou votre **Adresse Email professionnelle** (ex : `n.fatine@somabt.ma`).
3. Saisissez votre **Mot de passe**.
4. Cliquez sur le bouton bleu **`→ Se Connecter`**.

> **Note :** Vous pouvez vous connecter indifféremment avec votre nom d'utilisateur ou avec votre adresse e-mail complète.

> **Mot de passe oublié ?** Contactez votre administrateur ou la direction de votre entreprise pour réinitialiser immédiatement votre mot de passe depuis l'espace de gestion des utilisateurs.

---

## 2. Vue Générale de l'Espace Demandeur

Une fois connecté, votre écran d'accueil s'affiche :

L'écran est structuré en 3 zones principales :
1. **La barre latérale gauche (Menu)** : Indique votre rôle actif (**Demandeur**).
2. **Le formulaire "Nouvelle Demande" (Haut)** : Permet de rédiger et soumettre un nouveau besoin d'achat.
3. **Le tableau "Mes Demandes" (Bas)** : Affiche l'historique complet de vos demandes et leur avancement en temps réel.

---

## 3. Créer une Demande d'Achat

Pour enregistrer un besoin d'achat, remplissez le formulaire situé sous l'intitulé **"Nouvelle Demande"** :

### 3.1. Informations automatiques
- **Numéro de commande** : *Généré automatiquement* par le système dès l'envoi de la demande (ex: `SOM-2026-0042` ou `SEF-2026-0015`).
- **Demandeur** : Votre nom / email est détecté et renseigné automatiquement.
- **Date** : Date du jour automatique.

---

### 3.2. Saisie des informations de la demande

| Champ | Obligatoire ? | Description & Exemples |
| :--- | :---: | :--- |
| **Affectation** | **Oui** | Indiquez la destination du matériel ou de la prestation.<br>• *Exemples :* `Camion MAN TGX S62`, `Atelier Carrosserie Somabus`, `SAV Engins`, `Client Trans-Maghreb`. |
| **Articles demandés** | **Oui** | Saisissez le nom précis ou la référence de la pièce + la quantité souhaitée.<br>• *Exemple :* `Filtre à air MAN 51.08400.7020` — Quantité : `2`. |
| **Ajouter un article** | *Optionnel* | Cliquez sur `+ Ajouter un article` si votre commande contient plusieurs pièces différentes sur le même bon. |
| **Observation** | *Optionnel* | Précisez toute information utile pour l'équipe Achats :<br>• *Urgence de dépannage*, marque souhaitée, motif de panne, etc. |
| **Fichier / Document joint** | *Optionnel* | Joignez des photos de la pièce usée/cassée, une fiche technique, un devis préalable ou un bon papier (Formats : **JPG, PNG, PDF**). |

---

### 3.3. Envoi de la demande
Une fois tous les champs complétés :
1. Cliquez sur le bouton bleu **`Envoyer la demande`** en bas à droite du formulaire.
2. Un message vert de confirmation vous confirme l'enregistrement immédiat.
3. La demande est transmise **instantanément à votre validateur attitré** (ou à l'équipe de validation de votre société).

> **Important :** Une fois envoyée, une demande ne peut pas être modifiée directement afin de préserver l'intégrité de la traçabilité. Si vous devez apporter une correction, contactez directement votre validateur ou l'équipe Achats.

---

## 4. Cycle de Vie d'une Demande (Workflow)

```
[ 👤 Demandeur ] ──▶ [ 📤 Demande envoyée ]
                             │
                             ▼
                 [ 🔍 Validateur Responsable ]
                             │
             ┌───────────────┴───────────────┐
             ▼                               ▼
       [ ✅ Validée ]                  [ ❌ Refusée ]
             │                               │
             ▼                               ▼
[ 🛒 Équipe Achats ]             [ 🔴 Motif notifié au demandeur ]
             │
             ▼
[ 📑 Bon de commande émis ]
             │
             ▼
[ 📦 Réception magasin / atelier ]
```

1. **Émission** : Le demandeur saisit son besoin.
2. **Validation Métier** : Le responsable direct (ou le directeur de la filiale : SEFAMAR, SOMABUS, CKD) valide ou refuse avec un motif explicatif.
3. **Achats & Sourcing** : L'équipe achats consulte les fournisseurs, compare les devis et passe commande.
4. **Réception** : Le matériel arrive au magasin/atelier et le statut passe à `Reçu`.

---

## 5. Suivre l'État de Mes Demandes

Dans la section inférieure **"Mes Demandes"**, retrouvez toutes vos demandes avec leur avancement :

### 5.1. Filtrer les demandes
Utilisez le menu déroulant **Statut** en haut à droite du tableau pour filtrer :
- **Tous** : Affiche l'intégralité de vos commandes.
- **En attente** : Demandes en cours de validation ou d'achat.
- **Commandé** : Demandes validées dont le bon de commande a été émis.
- **Reçu** : Commandes livrées à votre société.
- **Refusé** : Demandes non approuvées par le validateur.

---

### 5.2. Comprendre les colonnes du tableau

- **VALIDATION** :
  - 🟡 **En attente** : Votre responsable n'a pas encore traité la demande.
  - 🟢 **Validé** : Votre responsable a autorisé la commande.
  - 🔴 **Refusé** : Cliquez sur le statut pour lire le motif du refus laissé par votre responsable.
- **STATUT ACHAT** :
  - ⏳ **En attente** : L'équipe Achats prépare la commande.
  - 🛒 **Commandé** : Le bon de commande a été passé auprès du fournisseur.
  - ✅ **Reçu** : La commande a été réceptionnée au magasin / atelier.
- **DÉTAILS** :
  - Cliquez sur le bouton de détails pour ouvrir la fiche complète, voir les pièces jointes ou imprimer le bon format papier.

---

## 6. Notifications et Alertes

En haut à droite de l'écran se trouve l'icône de **cloche** 🔔 :
- Une pastille rouge apparaît dès qu'un événement survient sur vos demandes.
- Cliquez sur la cloche pour voir :
  - *La validation de votre demande par votre responsable.*
  - *L'émission de la commande par le service Achats.*
  - *Le motif éventuel de refus.*
- Le bouton **Actualiser** en haut à droite permet de rafraîchir manuellement vos données à tout moment.

---

## 7. Foire Aux Questions (FAQ) & Bonnes Pratiques

### ❓ Puis-je joindre une photo prise avec mon smartphone ?
> **Oui.** Le champ *Fichier ou document joint* accepte les photos (`.jpg`, `.jpeg`, `.png`) ainsi que les documents `.pdf`. C'est très recommandé pour identifier les pièces d'usure ou étiquettes moteurs !

### ❓ Comment savoir qui doit valider ma demande ?
> Selon l'organisation de votre société (**SOMABUS**, **SEFAMAR** ou **CKD**), vous avez un ou plusieurs validateurs attitrés (ex : Chef d'atelier, Responsable magasin, Directeur). Dès l'envoi de votre formulaire, votre validateur reçoit une notification instantanée.

### ❓ Combien d'articles puis-je ajouter dans une seule demande ?
> Il n'y a pas de limite ! Cliquez sur **`+ Ajouter un article`** autant de fois que nécessaire si tous les articles concernent la même affectation (ex: révision complète d'un même véhicule).

### ❓ Comment me déconnecter en fin de journée ?
> Cliquez sur l'icône rouge de sortie **`⎋`** située tout en haut à droite de l'écran, à côté de votre adresse email.

---

> **Support & Assistance :** Pour toute question relative aux utilisateurs, mots de passe ou changements de service, adressez-vous à votre service informatique / administrateur système.
