# Guide d'utilisation DAME-PWA

## Page d'Accueil & Ergonomie Mobile

L'application Web Progressive (PWA) est calibrée avec une ergonomie unifiée (mode iOS standard) et une adaptation dynamique en hauteur (`vh` / `clamp`), assurant un affichage synthétique « en 1 coup d'œil » sur tous les appareils (iOS, Samsung, Xiaomi et Google Pixel) :
- **Carte Préinscription Saison** : Accès direct et contextuel au formulaire de préinscription ou de réinscription des adhérents et représentants légaux avec bouton tactile à hauteur confortable.
- **Dernières Nouvelles** : Affichage des 3 actualités les plus récentes du club avec grandes vignettes (`68px`) et dates formatées.
- **Prochains Événements** : Liste des 3 prochains rendez-vous de l'agenda avec badge signalant les événements en cours.
- **Appel à Bénévoles** : Consultation des besoins actifs pour les compétitions et manifestations du club.
- **Barre de Navigation Inférieure** : Accès instantané aux onglets *Accueil*, *Le Club*, *Apprentissage* et *Connexion / Profil* avec libellés nets (`12.5px`), icônes tactiles (`26px`) et hauteur de barre fluide (`58px`).

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
     - **En-tête unifié (`ExerciseHeader`)** : Affiche le titre de l'étape, le type d'exercice, la consigne contextualisée à la question active et le badge d'étape interactive (`Carte X / Y`).
     - **Échiquiers & Palettes normalisés** : Rendu visuel homogène, dimensionnement stable et constant sur chaque appareil (non altéré par l'apparition de commentaires ou de boutons de choix), ratio carré parfait (1:1), orientation dynamique en fonction du trait (Noirs en bas si trait aux Noirs).
     - **Exercices Pop'Echecs (Type 2)** :
       - Série de 4 diagrammes avec consigne propre à chaque position.
       - Masquage des annotations/formes initiales pendant la phase de réflexion.
       - Clic sur la case cible : placement de la pièce, validation instantanée, révélation des flèches/formes du diagramme complet.
       - Retrait automatique avec feedback rouge en cas d'erreur de case.
     - **Exercices ABCDaire Tactique (Type 3)** :
       - Série de 4 Mini-PGN contenant 1 ou plusieurs coups (attaque, défense, mat, gain matériel).
       - Orientation automatique de l'échiquier selon le trait de la position initiale (Blancs ou Noirs en bas).
       - Masquage des formes pendant la recherche et le jeu du coup.
       - Déplacement direct sur l'échiquier du meilleur coup attendu :
         - En cas de mauvais coup : annulation immédiate et possibilité de réessayer sans limite.
         - En cas de bon coup : si l'exercice comporte des coups intermédiaires, l'ordinateur joue sa réplique scriptée (délai de 500ms) et l'apprenant rejoue jusqu'au coup final.
       - Révélation & Relecture PGN : à l'issue de la variante réussie, les commandes de navigation PGN pas-à-pas sont débloquées (Début, Précédent, Suivant) avec affichage des commentaires et des shapes (cases et flèches de l'entraîneur), sans bouton d'avance rapide à la fin afin de garantir la lecture pas-à-pas des explications.
     - **Exercices La Partie dont tu es le Héros (Type 4)** :
       - Saisie simplifiée d'une étude PGN complète dans le CMS auteur (partie commentée avec flèches et variantes).
       - Découpage dynamique côté client en étapes séquentielles : défilement PGN commenté pas-à-pas (boutons Début, Précédent, Suivant, sans saut direct à la fin pour garantir l'assimilation des coups et commentaires) et embranchements QCM interactifs.
       - Moments de choix QCM identifiés par les 3 flèches indicatrices `[%cal ...]` et les 2 variantes associées au coup principal.
       - Choix QCM présentés en notation française (R, D, T, F, C) sans numéro de coup parasite.
       - Sélection interactive d'un coup parmi les 3 choix :
         - Choix d'une variante : feedback rouge avec l'explication spécifique du mauvais coup rédigée par l'auteur.
         - Choix du coup principal : feedback vert avec l'explication du bon coup, coup joué sur l'échiquier et déblocage de l'étape suivante.
       - Reprise de la séquence PGN post-QCM directement sur la position résultante (un demi-coup plus tard) avec restitution du commentaire et des formes du coup validé.
       - Progression fluide avec `ExerciseHeader` et `SeriesCardFooter` jusqu'au coup final de la partie et validation de la progression.
     - **Navigation en Série (`SeriesCardFooter`)** : Badge d'étape (`Carte X / Y` ou `Étape X / Y`), zone de feedback visuel fixe (succès/erreur) et bouton d'avancement débloqué dès la validation de la position.
     - **Chronométrage & Validation finale** : Mesure en temps réel du temps passé sur la leçon ou l'exercice, puis transmission atomique de la durée (`time_spent`) lors de la validation de la réussite dans la progression de l'adhérent.

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

Dans l'onglet **Profil** (lorsque l'utilisateur est connecté), un panneau dépliable (accordéon) permet de personnaliser l'apparence de l'échiquier pour l'ensemble de la PWA :

1. **Panneau Dépliable & Résumé en Direct** :
   - En état replié, affiche le style actif en cours (ex. *« Style actif : CBurnett • Bois Classique »*).
   - Un clic sur l'en-tête déplie les contrôles et l'échiquier sans encombrer la page.
2. **Sélecteur de Pièces (Rouleau Wheel-Picker)** :
   - Rouleau rotatif présentant les 10 styles vectoriels disponibles : *CBurnett* (défaut), *Mérida*, *Alpha*, *Cardinal*, *Dubrovny*, *Fantasy*, *Firi*, *Maestro*, *Tatiana*, *Staunty*.
3. **Sélecteur de Fond d'Échiquier (Rouleau Wheel-Picker)** :
   - Rouleau rotatif présentant les 9 nuances et textures d'arrière-plan : *Brown (Bois)* (défaut), *Bleu Acier*, *Vert Tournoi*, *Style IC*, *Gris Ardoise*, *Violet Lilas*, *Noyer Chaud*, *Bois Veiné HD*, *Érable Doré*.
4. **Prévisualisation en Temps Réel** :
   - Échiquier complet en position initiale actualisé instantanément selon la combinaison sélectionnée.
5. **Validation & Persistance** :
   - Bouton **"Enregistrer mon style d'échiquier"** confirmant l'enregistrement avec notification toast.
   - Bouton **"Rétablir les valeurs par défaut"** pour revenir rapidement à la combinaison par défaut (CBurnett & Brown).
   - Les choix sont immédiatement appliqués sur tous les échiquiers (Partie, Analyse, Diagrammes, Puzzles et Exercices interactifs).
