# Guide d'utilisation DAME-PWA

## Module Le Club (Actualités, Agenda, Tournois, Bénévolat)

Le module **Le Club** propose une navigation par segments adaptée dynamiquement à la taille de l'écran et à l'orientation :

1. **Affichage Split-View (1/3 - 2/3) sur Tablette Paysage et Ordinateur** :
   - **Disposition 1/3 (Gauche)** : Liste fluide des éléments avec carte active mise en valeur lors de la sélection.
   - **Disposition 2/3 (Droite)** : Panneau latéral dédié affichant le contenu complet et les actions associées.
   - **Actualités** : Sélection automatique du premier article.
   - **Agenda (Mode Liste ☰)** : Sélection intelligente par défaut de l'événement courant ou du plus proche à venir.
   - **Tournois** : Consultation instantanée des modalités, règlements et formulaires HelloAsso.
   - **Bénévolat** : Sélection des créneaux horaires, formulaire d'inscription direct pour les adhérents ou vue administration des inscrits.
   - **Double défilement indépendant** : Le scroll de la liste de gauche ne déplace pas le panneau de détail de droite, et inversement.

2. **Affichage Mobile & Portrait** :
   - Liste des éléments en pleine largeur.
   - Le clic sur un élément ouvre la page de détail plein écran avec bouton de retour.

3. **Module Agenda - Mode Calendrier (Style iOS) 📅** :
   - Grille mensuelle affichant les numéros de jours du mois avec swipe tactile horizontal pour changer de mois.
   - Puces/pastilles de couleur sous les chiffres représentant les catégories des événements prévus.
   - Sélection d'une date pour consulter instantanément les événements du jour sélectionné sous le calendrier (ou dans le volet latéral droit en affichage tablette/paysage).
   - **Navigation inter-mois intuitive** : Le clic sur un jour appartenant au mois précédent ou suivant déplace automatiquement l'affichage vers ce mois et sélectionne le jour demandé.
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
   - **Structure des Exercices & Puzzles** :
     - **En-tête unifié** : Affiche le titre de l'étape, le type d'exercice (QCM, Puzzle, etc.) et la consigne claire.
     - **Navigation en Série** : Badge de progression (`Carte X / Y`) et barre d'avancement interactive au bas de chaque étape.
     - **Validation & Feedback instantané** : Message clair de réussite ou d'erreur, permettant de débloquer le bouton d'avancement vers la question suivante.

2. **Partie d'Échecs & Échiquier ♟️** :
   - Accessible librement à tous les visiteurs et adhérents.
   - **Disposition responsive Paysage (iPad & Tablettes)** : L'échiquier et les panneaux de commandes / historique se placent automatiquement côte à côte sur toute la largeur disponible avec un centrage vertical optimal.
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
