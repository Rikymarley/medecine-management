# SOP — Medecine Management (FR)

Version: 1.0  
Date: 06/04/2026  
Objet: Procédure standard d’utilisation de l’application pour les rôles **Administrateur**, **Médecin**, **Pharmacie**, **Patient**.

## 1) Objectif
Ce SOP définit les étapes opérationnelles pour:
- gérer les comptes (approbation, blocage, vérification licence),
- créer et traiter les ordonnances,
- suivre la disponibilité des médicaments,
- assurer la traçabilité (historique médical, audit, statuts).

## 2) Périmètre
Applicable à tous les utilisateurs de la plateforme:
- Administrateur
- Médecin
- Pharmacie
- Patient (principal et membres de famille)

## 3) Prérequis
- Compte actif
- Accès Internet (mode hors-ligne disponible pour certaines actions)
- Profil minimum complété selon le rôle
- Pour médecins/pharmacies: données de licence et profil professionnel à jour

## 4) Gouvernance des statuts
### 4.1 Statut du compte
- **En attente**: accès limité
- **Approuvé**: accès autorisé
- **Bloqué**: accès suspendu

### 4.2 Vérification de licence (médecin/pharmacie)
- **Non vérifiée**: limitations métier (selon règles en vigueur)
- **Vérifiée**: droits métier complets

### 4.3 Traçabilité
Toujours conserver:
- `approved_by`, `approved_at`
- `verified_by`, `verified_at`
- `blocked_by`, `blocked_at`
- `delegated_by`, `delegated_at`

## 5) Procédure Administrateur
1. Ouvrir `admin/doctors`, `admin/pharmacies`, `admin/patients`.
2. Vérifier identité et informations de profil.
3. Approuver ou bloquer le compte selon conformité.
4. Vérifier/retirer la vérification de licence pour médecins/pharmacies.
5. Contrôler le journal d’audit avant toute action sensible.

Règle: ne jamais supprimer l’historique d’approbation/vérification lors d’un blocage.

## 6) Procédure Médecin
### 6.1 Gestion patient
1. Ouvrir `doctor/patients`.
2. Rechercher patient existant (nom/téléphone/NINU, normalisation accents).
3. Si absent, créer un patient avec champs de base.
4. Éviter doublons via validation avant création.

### 6.2 Création ordonnance
1. Ouvrir `doctor/create-prescription` ou bouton `Ajouter` depuis patient.
2. Ajouter médicaments (nom, forme, dosage, quantité, notes, dose journalière).
3. Publier l’ordonnance.
4. Vérifier code ordonnance généré (référence).

### 6.3 Historique médical
1. Depuis dossier patient: créer/modifier entrée historique.
2. Lier une ou plusieurs ordonnances si pertinent.
3. Définir visibilité (`partagé` / `doctor_only`).

## 7) Procédure Pharmacie
### 7.1 Profil pharmacie
1. Compléter profil (adresse, téléphone, GPS, horaires, services, paiements).
2. Mettre à jour ouverture/fermeture.
3. Vérifier affichage logo/vitrine si disponibles.

### 7.2 Traitement ordonnance
1. Ouvrir `pharmacy/prescriptions`.
2. Filtrer par statut.
3. Répondre par médicament avec niveaux stock:
   - 0 rupture
   - 1–10 très faible
   - 11–30 faible
   - 31–100 disponible
   - 100+ stock élevé
4. Conserver cohérence statut global (partielle/disponible).

### 7.3 Hors-ligne
- Les actions de disponibilité peuvent être mises en file d’attente.
- Synchroniser dès retour Internet.

## 8) Procédure Patient
### 8.1 Consultation ordonnance
1. Ouvrir `patient/prescriptions`.
2. Voir pharmacies avec couverture > 0.
3. Sélectionner médicaments achetés et quantités.
4. Marquer complétée (online/offline sync).

### 8.2 Urgence et famille
1. Gérer `Contacts d’urgence`.
2. Gérer `Membres famille` (profil, archive, réactivation).
3. Accéder au dossier d’un membre depuis `patient/family-members/<id>`.

### 8.3 Réclamation de compte
1. Depuis login: `Réclamer un compte`.
2. Scanner QR claim token.
3. Définir mot de passe.

## 9) Règles de sécurité
- Contrôle d’accès strict par rôle et ownership.
- Les patients ne modifient/suppriment que leurs propres entrées.
- Les médecins ne voient/modifient que ce qui est autorisé par lien patient et visibilité.
- Journaliser toutes les actions critiques.

## 10) Gestion incidents
- Erreur CORS/connexion: vérifier backend Laravel, URL API, serveur Vite.
- Données non visibles: recharger après mutation ou invalider cache local.
- Problème upload: vérifier `storage:link` et permissions.
- En cas de divergence, prioriser source DB + audit.

## 11) KPI recommandés
- Taux de réponse pharmacie
- Temps moyen de réponse
- Taux d’ordonnances complétées
- % profils complets par rôle
- % comptes approuvés / bloqués

## 12) Révision SOP
- Revue mensuelle en phase pilote
- Revue trimestrielle en production
- Versionner chaque changement (date + owner)
