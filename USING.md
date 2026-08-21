# Guide d'utilisation DAME-PWA

## Module Agenda

Le module Agenda propose deux modes de représentation pour visualiser les événements du club :

1. **Mode Liste ☰** : Liste de roulement avec défilement infini pour consulter l'historique et les événements futurs.
2. **Mode Calendrier (Style iOS) 📅** :
   - Grille mensuelle affichant les numéros de jours du mois.
   - Puces/pastilles de couleur sous les chiffres représentant les catégories des événements prévus.
   - Sélection d'une date pour consulter instantanément les événements du jour sélectionné sous le calendrier (horaires, titre, lieu, et accent de couleur).
   - **Persistance** : Le choix d'affichage (Liste ou Calendrier) est sauvegardé dans le navigateur (`localStorage`) pour être conservé lors des futures sessions.

## Module Apprentissage & Jeu

L'onglet **Apprentissage** permet d'accéder à deux espaces distincts :

1. **Cours & Parcours 🎓** :
   - Présente un ruban diagonal **"En dev"** signalant que le module est en cours de conception.
   - Accessible temporairement aux seuls profils autorisés (administrateurs, entraîneurs).
   - Pour les adhérents et visiteurs non autorisés : un panneau explicatif indique clairement que le module est en développement.
   - Boutons de navigation d'en-tête (pour les profils autorisés) :
     - **Maison** (`homeOutline`) : retour rapide à la liste des cours (`/apprentissage/cours`).
     - **Liste** (`listOutline`) : retour au sommaire du cours actif (`/cours/:id`).

2. **Partie d'Échecs & Échiquier ♟️** :
   - Accessible librement à tous les visiteurs et adhérents.
   - **Mode 1 Joueur (vs Stockfish)** :
     - Choix de la couleur (Blancs, Noirs ou Aléatoire).
     - Choix du niveau Elo (mémorisé pour les prochaines parties).
     - Temps de réflexion dynamique du moteur Stockfish (`Elo * 1.4 ms`).
     - Pour les membres connectés : enregistrement et envoi automatique de la partie PGN vers le plugin ROI.
   - **Mode 2 Joueurs (Pass & Play)** :
     - Jeu local sur le même écran pour deux joueurs humains, moteur d'analyse IA désactivé.

## Module Profil & Personnalisation de l'Échiquier

Dans l'onglet **Profil** (lorsque l'utilisateur est connecté), une section dédiée permet de personnaliser l'apparence de l'échiquier pour l'ensemble de la PWA :

1. **Sélecteur 3D - Style des Pièces** :
   - Carrousel 3D rotatif à 8 faces représentant les styles vectoriels disponibles : *Staunton* (défaut), *Mérida*, *Cburnett*, *Alpha*, *Cardinal*, *Dubrovny*, *Maestro*, *Staunty*.
   - Rotation par glisser/déposer tactile (swipe/drag), boutons fléchés ou clics directs sur les cartes.
2. **Sélecteur 3D - Fond de l'Échiquier** :
   - Carrousel 3D rotatif à 8 faces présentant les nuances et textures d'arrière-plan : *Bois Classique* (défaut), *Bleu Acier*, *Vert Tournoi*, *Style IC*, *Gris Ardoise*, *Violet Lilas*, *Noyer Chaud*, *Érable Doré*.
3. **Prévisualisation en Temps Réel** :
   - Échiquier complet en position initiale actualisé instantanément selon la combinaison sélectionnée.
4. **Validation & Persistance** :
   - Bouton **"Enregistrer mon style d'échiquier"** confirmant l'enregistrement avec notification toast.
   - Bouton **"Rétablir les valeurs par défaut"** pour revenir rapidement à la combinaison classique (Staunton & Bois).
   - Les choix sont immédiatement appliqués sur tous les échiquiers (Partie, Analyse, Diagrammes, Puzzles et Exercices interactifs).
