# Guide d'utilisation DAME-PWA

## Page d'Accueil & Ergonomie Mobile

L'application Web Progressive (PWA) est calibrée avec une ergonomie unifiée (mode iOS standard) et une adaptation dynamique en hauteur (`vh` / `clamp`), assurant un affichage synthétique « en 1 coup d'œil » sur tous les appareils (iOS, Samsung, Xiaomi et Google Pixel) :
- **Carte Préinscription Saison** : Accès direct et contextuel au formulaire de préinscription ou de réinscription des adhérents et représentants légaux avec bouton tactile à hauteur confortable.
- **Dernières Nouvelles** : Affichage des 3 actualités les plus récentes du club avec grandes vignettes (`68px`) et dates formatées.
- **Prochains Événements** : Liste des 3 prochains rendez-vous de l'agenda avec badge signalant les événements en cours.
- **Appel à Bénévoles** : Consultation des besoins actifs pour les compétitions et manifestations du club.
- **Barre de Navigation Inférieure** : Accès instantané aux onglets *Accueil*, *Le Club*, *Apprentissage* et *Connexion / Profil* avec libellés nets (`12.5px`), icônes tactiles (`26px`) et hauteur de barre fluide (`58px`).

## Module Préinscriptions & Réinscriptions (Adhérents & Familles)

Le module de préinscription (`/pre-inscription`) permet aux nouveaux visiteurs comme aux adhérents existants de préparer leur dossier pour la saison à venir :

1. **Parcours Adhérent Individuel** :
   - Si l'adhérent n'est pas encore inscrit pour la saison active, ses coordonnées sont automatiquement pré-remplies.
   - **Détection de préinscription existante** : Si l'adhérent a déjà transmis son dossier (en attente de validation par les administrateurs du club), le formulaire recharge prioritairement les données de sa préinscription récente plutôt que la fiche de l'année précédente.
   - **Bannière d'état & mise à jour sans doublon** : Une bannière `ℹ️ Préinscription en cours` informe l'adhérent qu'il modifie son dossier existant. Le bouton d'action devient *« Mettre à jour la préinscription »* et actualise directement le dossier sans générer de fiche superflue.

2. **Parcours Responsable Légal & Multi-Adhérents (Fratries)** :
   - Un représentant légal connecté accède à une liste déroulante lui permettant de basculer entre :
     - `-- Nouvelle préinscription (vierge) --` pour inscrire un nouvel enfant.
     - Chacun de ses enfants rattachés (ex. *Lucas*, *Emma*).
   - **Distinction garantie par enfant** : Même si tous les enfants partagent la même adresse e-mail familiale, le système distingue rigoureusement chaque profil via l'identifiant adhérent et le couple prénom/date de naissance.
   - **Statut visuel dans le sélecteur** : Les enfants ayant déjà une préinscription enregistrée affichent l'indicateur `📝 Nom (Enfant/Associé - Préinscription déjà saisie)`.
   - **Reprise et modification unitaire** : Sélectionner un enfant déjà préinscrit recharge immédiatement sa préinscription en cours et permet de la corriger de façon totalement indépendante de ses frères et sœurs.

3. **Signature Électronique Intégrée & Dématérialisation** :
   - Lorsque l'adhérent répond « NON partout » au questionnaire de santé, une zone de signature tactile manuscrite s'affiche directement dans le formulaire.
   - **Majeurs** : Signature de l'adhérent sous l'attestation sur l'honneur.
   - **Mineurs (Option groupée)** : Deux consentements explicites (Attestation de santé sur l'honneur pour l'enfant + Autorisation parentale) validés par une **signature unique** du représentant légal 1.
   - Les documents PDF officiels (attestation de santé FFE et autorisation parentale) sont automatiquement générés, signés et rattachés au dossier sans nécessiter d'impression papier.

4. **Suivi sur la Page d'Accueil** :
   - Lorsque tous les membres du foyer non inscrits ont soumis leur préinscription, la carte d'accueil affiche un message de confirmation rassurant (*« Votre dossier de préinscription a bien été transmis et est en cours de traitement par le club »*) accompagné du bouton d'accès *« Consulter / Modifier ma préinscription »*.

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
   - **Section « Cours assignés » (Prescrits par vos entraîneurs)** : Lorsqu'un ou plusieurs cours sont prescrits spécifiquement à l'adhérent (ou à son groupe d'entraînement) par les entraîneurs, ils sont présentés en tête de liste sous la section dédiée `📌 Cours assignés` avec badge `📌 Assigné`. Ces cours bénéficient d'un déverrouillage immédiat sans prérequis séquentiel. Un badge contextuel `📌 X assigné(s)` est également visible sur la carte du Hub d'Apprentissage.
   - **Section « Méthode EEF » (École d'Échecs à la Française)** : Présente les cours du tronc commun avec déblocage progressif linéaire au fil de la complétion des exercices.
   - **Actualisation Manuelle (Pull-to-refresh) 🔄** : Glisser vers le bas sur la liste des cours ou sur le détail d'un cours permet de forcer l'actualisation immédiate des parcours et de la progression.
   - **Synchronisation Différentielle & Économie Réseau** : Toute modification d'un exercice dans l'administration WordPress est automatiquement détectée grâce à son horodatage `modified`. L'application ne retélécharge que les exercices modifiés ou manquants, garantissant un affichage à jour sans nécessiter de vider le cache et sans surconsommer de données mobiles.
   - Présente un ruban diagonal **"En dev"** signalant que le module est en cours de conception.
   - Accessible temporairement aux seuls profils autorisés (administrateurs, entraîneurs).
   - Pour les adhérents et visiteurs non autorisés : un panneau explicatif indique clairement que le module est en développement.
   - Boutons de navigation d'en-tête (pour les profils autorisés) :
     - **Maison** (`homeOutline`) : retour rapide à la liste des cours (`/apprentissage/cours`).
     - **Liste** (`listOutline`) : retour au sommaire du cours actif (`/cours/:id`).
   - **Structure des Exercices, Vidéos & Leçons** :
      - **En-tête unifié (`ContentHeader`)** : Affiche le titre de l'étape, le type adapté (« Exercice / Type », « Vidéo » ou « Leçon ») et le chapitre/niveau. Pour les Vidéos et Leçons, le deuxième panneau (consigne / question) est masqué automatiquement.
      - **Échiquiers & Palettes normalisés** : Rendu visuel homogène, dimensionnement stable et constant sur chaque appareil (non altéré par l'apparition de commentaires ou de boutons de choix), ratio carré parfait (1:1), orientation dynamique en fonction du trait (Noirs en bas si trait aux Noirs).
      - **Exercices Pop'Echecs (Type 2)** :
        - Série de 4 diagrammes avec consigne propre à chaque position.
        - Masquage des annotations/formes de solution initiales pendant la phase de réflexion, **à l'exception du cercle jaune optionnel** entourant la pièce d'étude (qui reste visible pour guider l'analyse de situation).
        - Clic sur la case cible : placement de la pièce, validation instantanée, révélation des flèches/formes du diagramme complet.
        - Retrait automatique avec feedback rouge en cas d'erreur de case et rétablissement rigoureux de l'échiquier de départ (préservant intactes toutes les pièces existantes).
      - **Exercices ABCDaire Tactique (Type 3)** :
        - Série de 4 Mini-PGN contenant 1 ou plusieurs coups (attaque, défense, mat, gain matériel).
        - Orientation automatique de l'échiquier selon le trait de la position initiale (Blancs ou Noirs en bas).
        - Masquage des flèches et formes tactiques pendant la recherche et le jeu du coup, **avec maintien visible du cercle jaune** sur la pièce d'étude si défini par l'entraîneur à la racine du PGN.
        - Déplacement direct sur l'échiquier du meilleur coup attendu :
        - En cas de mauvais coup : annulation immédiate, maintien du repère jaune et possibilité de réessayer sans limite.
        - En cas de bon coup : si l'exercice comporte des coups intermédiaires, l'ordinateur joue sa réplique scriptée (délai de 500ms) et l'apprenant rejoue jusqu'au coup final.
        - Révélation & Relecture PGN : à l'issue de la variante réussie, les commandes de navigation PGN pas-à-pas sont débloquées (Début, Précédent, Suivant) avec affichage des commentaires et des shapes (cases et flèches de l'entraîneur), sans bouton d'avance rapide à la fin afin de garantir la lecture pas-à-pas des explications. Les boutons *Début* et *Précédent* sont automatiquement grisés/désactivés (`disabled`) sur la position initiale, et le bouton *Suivant* est désactivé une fois parvenu au dernier coup. Le bouton *Carte suivante* ou *Terminer l'exercice* du pied de carte (`SeriesCardFooter`) reste inactif (grisé) jusqu'à ce que l'apprenant ait fait défiler tous les coups du PGN jusqu'au dernier. Sur la dernière carte, la victoire (`🎉 Exercice réussi !` et pluie de confettis) est fêtée uniquement à la fin du PGN d'explication et non dès la résolution de la dernière interrogation tactique.
      - **Exercices La Partie dont tu es le Héros (Type 4)** :
        - Saisie simplifiée d'une étude PGN complète dans le CMS auteur (partie commentée avec flèches et variantes).
        - Découpage dynamique côté client en étapes séquentielles : défilement PGN commenté pas-à-pas (boutons Début, Précédent, Suivant avec désactivation contextuelle au début et à la fin de la séquence, sans saut direct à la fin pour garantir l'assimilation des coups et commentaires) et embranchements QCM interactifs.
        - Moments de choix QCM identifiés par les 3 flèches indicatrices `[%cal ...]` et les 2 variantes associées au coup principal.
        - Choix QCM présentés en notation française (R, D, T, F, C) sans numéro de coup parasite, avec mélange aléatoire (Fisher-Yates) des options garantissant que le bon coup n'apparaît pas systématiquement en première position.
        - Sélection interactive d'un coup parmi les 3 choix :
          - Choix d'une variante : feedback rouge avec l'explication spécifique du mauvais coup rédigée par l'auteur.
          - Choix du coup principal : feedback vert avec l'explication du bon coup, coup joué sur l'échiquier et déblocage de l'étape suivante.
        - Reprise de la séquence PGN post-QCM directement sur la position résultante (un demi-coup plus tard) avec restitution du commentaire et des formes du coup validé.
        - Bulle de commentaires PGN ergonomique : affichage propre des retours à la ligne (`pre-line`) pour préserver les listes pédagogiques, défilement vertical fluide dès que le commentaire dépasse la hauteur réservée, réinitialisation automatique du défilement au début du texte à chaque coup, sans rognage du haut du commentaire.
        - Progression fluide avec `ContentHeader` et `SeriesCardFooter` jusqu'au coup final de la partie et validation de la progression. Lorsque la partie se poursuit après le dernier QCM, la séquence PGN finale exige de visionner l'intégralité des coups jusqu'au terme de la partie pour afficher `🎉 Exercice réussi !` et déclencher la célébration.
      - **Exercices Associ'Plan (Type 6)** :
        - Saisie simplifiée dans le CMS de 4 PGNs purs : chaque PGN porte sa FEN de départ `[FEN "..."]`, ses annotations graphiques `[%csl]/[%cal]` et sa description pédagogique dans son commentaire initial `{ ... }`.
        - Déroulement structuré en **5 cartes séquentielles** avec `ContentHeader` et `SeriesCardFooter` :
          - **Carte 1 (Matching / Association)** : Affichage des 4 échiquiers mélangés à gauche et des 4 descriptions textuelles à droite. **Zoom plein écran tactile** : un appui prolongé (500ms) ou un clic droit sur n'importe quel échiquier ouvre instantanément un aperçu grand format net et immersif (sans perturber la sélection au relâchement). L'apprenant sélectionne et relie chaque échiquier à sa description. Une fois toutes les associations validées sans erreur, l'état résolu est atteint et débloque le passage à la carte suivante.
          - **Cartes 2 à 5 (Visualisation des PGNs 1 à 4)** : Présentation individuelle et ordonnancée de chacun des 4 plans via `PgnViewer`. Pour chaque carte, l'apprenant doit dérouler l'intégralité des coups du PGN pour débloquer le bouton *« Position suivante »* (ou *« Terminer l'exercice »* sur la carte 5).
          - La validation complète de l'exercice, le calcul du temps passé et la célébration confettis ont lieu à l'issue de la consultation du 4e PGN (carte 5/5).
      - **Exercices La Marche du Héros (Type 7)** :
        - Saisie simplifiée de 3 ou 5 séries de parties d'échecs (modes 3x5 ou 5x3) avec détection automatique de l'orientation et prévisualisation interactive.
        - Parcours itératif et progressif par série avec `ContentHeader` et `SeriesCardFooter` :
          - **Étape 1 (Sélection / Tri de la série en grille 2 colonnes)** : Présentation des diagrammes restants dans la banque sous forme d'une grille à 2 colonnes divisant la hauteur de défilement par deux. Chaque position peut être agrandie en plein écran par appui prolongé (500ms) ou clic droit. L'apprenant sélectionne par un clic le nombre requis de diagrammes ($N = 5$ ou $3$). Le décompte des cartes sélectionnées et restantes s'affiche en direct dans l'indication d'attente du `SeriesCardFooter` fixe et immobile. Dès l'atteinte des $N$ cartes, la cohérence de la série est vérifiée : si elles appartiennent à la même partie, le feedback vert s'affiche et le bouton *« Classer la série »* se débloque. Sinon, une indication rouge invite à désélectionner une position erronée.
          - **Étape 2 (Ordre chronologique combiné : glisser-déposer Ionic ou permutation au clic)** : Présentation des cartes de la série en colonne unique avec grands échiquiers lisibles. L'ordre de 1 à $N$ peut être ajusté de deux façons complémentaires : soit en faisant glisser la carte via sa poignée latérale native Ionic (`<ion-reorder-group>`), soit en touchant successivement deux cartes pour permuter leur place (*Tap & Swap* avec surbrillance bleue). Dès que la chronologie est exacte, le bouton *« Coup suivant »* s'active dans le footer. Pour la dernière série, cette étape démarre directement avec les cartes restantes.
          - **Étape 3 (Coup suivant)** : Résolution interactive du coup décisif sur grand échiquier via `PuzzleViewer`. La réussite valide la série et débloque le passage à la série suivante ou la fin de l'exercice avec célébration confettis.
      - **Exercices Parcours (Type 9)** :
        - Série de **3 parcours tactiques séquentiels** avec consignes contextuelles, en-tête unifié `ContentHeader` et pied fixe `SeriesCardFooter`.
        - Chaque parcours est configuré avec sa propre position FEN, sa couleur de jeu, sa case de départ (cercle bleu), sa case cible d'arrivée (cercle vert), ses obstacles/pièges (cercles rouges) et sa variante de règles :
          - **Variante Standard (`standard`)** : Déplacer la pièce jusqu'à la case d'arrivée cible en évitant de s'arrêter sur les cases interdites (rouges). À l'affichage initial, les flèches indicatrices et l'éventuelle pièce d'arrivée sont masquées et ne sont révélées qu'une fois le parcours résolu.
          - **Variante Pacman / Gourmand (`pacman`)** : Obligation de capturer l'intégralité des pièces adverses disséminées sur l'échiquier avant de rejoindre la case d'arrivée verte.
          - **Variante Pas vu, pas pris / Furtif (`stealth`)** : Atteindre la case cible sans jamais s'arrêter sur une case contrôlée/attaquée par les pièces adverses ni sur les cases rouges. À l'affichage initial, les flèches indicatrices et la pièce sur la case d'arrivée sont masquées jusqu'à la résolution.
            - **Parcours en Boucle Fermée (Tour complet d'une pièce)** : Si seul le cercle bleu de départ est configuré (ou si départ = arrivée), le moteur active le mode boucle (*Winding Number*). L'exercice est validé lorsque l'apprenant effectue un tour complet ($\ge 360^\circ$ en cumul angulaire autour de la pièce adverse et passage par les 4 quadrants) sans jamais poser le pied sur une case attaquée et revient sur sa case de départ. Les allers-retours frauduleux sont automatiquement rejetés.
          - **Variante Traces / Déduction de Pièce (`traces`)** : Présentation d'un échiquier sans pièce avec uniquement les cercles de traces (`shapes`). L'apprenant doit déduire quelle pièce blanche (parmi Roi, Dame, Tour, Fou, Cavalier, Pion) a effectué ce déplacement. Dès la bonne pièce sélectionnée dans la palette dédiée, la position complète avec la pièce est révélée sur sa case finale et l'étape est validée.
        - **Architecture de Variantes Extensible** : Moteur de règles modulaire (`parcoursVariants.ts`) permettant l'ajout aisé de nouvelles variantes de jeu.
        - **Ergonomie Mobile & Scaffold** : Retours d'erreurs et de succès intégrés en temps réel dans le `SeriesCardFooter` fixe, indications d'attente dynamiques selon la variante, verrouillage/déblocage fluide du bouton *« Parcours suivant »* et célébration festive confettis sur le 3ᵉ parcours.
      - **Exercices Qui-suis-je ? (Type 12)** :
        - Déroulement structuré en **série de 6 cartes** sous une consigne commune avec `ContentHeader` (titre, consigne générale, badge `Carte X / 6`) et pied fixe `SeriesCardFooter`.
        - Chaque carte affiche des indices et affirmations pédagogiques (avec gestion propre des retours à la ligne).
        - **Variante Pièces (`pieces`)** :
          - Présentation d'une palette tactile des 6 pièces blanches (Roi, Dame, Tour, Fou, Cavalier, Pion).
          - L'apprenant déduit et sélectionne la pièce blanche correspondante.
          - Dès la bonne pièce touchée, un feedback de validation s'affiche et le passage à la carte suivante est débloqué.
        - **Variante Cases (`cases`)** :
          - Présentation d'un échiquier vide interactif.
          - L'apprenant touche la case de l'échiquier déduite des indices.
          - Dès la bonne case touchée, un cercle vert s'affiche sur la case cible avec feedback de succès et déblocage du passage à la carte suivante.
      - **Exercices Cap ou pas Cap ? (Type 14)** :
        - Déroulement en **série de 5 mini-situations** sous une consigne commune avec `ContentHeader` (titre, consigne générale, badge `Carte X / 5`) et pied fixe `SeriesCardFooter`.
        - Saisie auteur en 5 Mini-PGN (position de départ FEN ou coup tactique à analyser, avec flèches/cercles pédagogiques).
        - **Variante QCM Multiple (`qcm_multiple`)** :
          - Présentation de la liste d'affirmations définies pour la série sous l'échiquier.
          - Chaque affirmation dispose d'un **toggle tactile neutre** (position initiale neutre, sélectionnable entre OUI vert et NON rouge).
          - L'échiquier masque initialement toutes les shapes. Dès que toutes les affirmations sont complétées avec la combinaison exacte, les shapes de l'entraîneur sont révélées sur l'échiquier, le feedback vert s'affiche et le bouton *« Carte suivante »* s'active.
        - **Variante QCM Oui/Non (`qcm_oui_non`)** :
          - Une question commune affichée au-dessus d'un grand toggle tactile neutre OUI / NON.
          - Si le mini-PGN comporte un coup initial, celui-ci s'affiche/s'anime pour situer la position. Les shapes sont masquées pendant la réflexion.
          - Dès la bonne réponse sélectionnée, le mini-PGN complet avec ses shapes est révélé et le bouton *« Carte suivante »* se débloque.
        - **Variante Move (`move`)** :
          - Résolution du coup attendu directement sur l'échiquier interactif avec révélation des annotations et validation de l'étape.
          - **Mode Multi-coups** : Si le PGN contient des variantes de coups multiples (ex: *Quels sont les échecs possibles ?*), l'apprenant doit trouver l'ensemble des coups légaux valides. Un badge affiche la progression (`Trouvés : X / Total`), l'échiquier se réinitialise après chaque coup trouvé, et la carte se valide dès que tous les coups ont été découverts.
        - **Variante Notation (`notation`)** :
          - Présentation de la position FEN sur l'échiquier en lecture seule (non interactif).
          - Sous l'échiquier, affichage d'une ligne pour chaque pièce présente avec son icône graphique thématisée selon sa couleur (blanche/noire) et son libellé (ex: *Tour blanche*, *Dame noire*, *Pion blanc*).
          - L'apprenant saisit la notation française exacte de chaque pièce (ex: `Tc2`, `Dd4`, `c3`, `Re1`).
          - La saisie exige une casse exacte (initiale majuscule pour les pièces, minuscules pour les cases et les pions sans lettre), valide en temps réel chaque case avec indicateur visuel (✓ vert / ✗ rouge) et accepte l'ordre interchangeable pour les pièces multiples de même nature (ex: 2 cavaliers).
          - Dès que toutes les pièces ont leurs coordonnées exactes, la carte est validée et le bouton *« Carte suivante »* s'active.
        - **Variante Clic / Sélection (`clic`)** :
          - L'apprenant sélectionne ou désélectionne les pièces et cases directement en les touchant sur l'échiquier (ajout/retrait d'un cercle rouge).
          - **Sous-mode Cibles (`cibles`)** : L'apprenant doit entourer les pièces ou cases précises ciblées par l'exercice (pièces non protégées, attaques ou défenses du coup joué).
          - **Sous-mode Prises possibles puis Meilleur coup (`prises_meilleur_coup`)** :
            - *Convention PGN :* Cercle vert = prise possible et meilleur coup / Cercles rouges = autres prises possibles.
            - *Étape 1 (Clic) :* L'apprenant identifie et entoure toutes les prises possibles des deux camps (cercles rouges et vert).
            - *Étape 2 (Move) :* L'échiquier s'active et l'apprenant joue la meilleure prise sur l'échiquier (la cible verte). La carte est validée dès le bon coup joué et révèle l'ensemble des flèches et cercles explicatifs.
          - **Sous-mode Différentiel de matériel (`materiel`)** : L'apprenant entoure n'importe quelle pièce excédentaire du camp concerné pour désigner l'avantage matériel. Si le matériel est égal entre les deux camps, un bouton *« ⚖️ Pas de différence de matériel »* permet de valider la position d'un simple toucher.
        - **Variante Reconstitution / Setup (`setup`)** :
          - **Sous-mode Mémorisation (`memoire`)** : L'apprenant étudie la position initiale sur l'échiquier puis clique sur *« J'ai mémorisé ! »*. La carte se retourne sur un échiquier vierge accompagné d'une palette de 12 pièces (blanches et noires) et d'un outil gomme pour replacer les pièces de mémoire. Un bouton *« 👁️ Revoir la position »* permet de consulter à nouveau la position sans pénalité, et un bloc *Conseil de l'entraîneur* s'affiche pour guider la réflexion.
          - **Sous-mode Description textuelle (`texte`)** : L'apprenant dispose d'un échiquier vierge et de la palette de pièces pour replacer fidèlement la position décrite textuellement en notation française.
          - Dès que la position posée correspond à la FEN cible, la carte est validée.
      - **Vidéos Pédagogiques FFE / Entraîneurs (`roi_video`)** :
        - Intégration de vidéos officielles issues de la Fédération (École d'Échecs à la Française) ou de vidéos spécifiques recommandées par les entraîneurs (ouvertures, tactiques).
        - **En-tête et Pied Unifiés** : En-tête `ContentHeader` compact (Type « Vidéo ») et pied de page fixe `SeriesCardFooter` (sans zone de feedback inutile).
        - **Lecteur optimisé & Plein écran / Paysage Universel (iOS & Android)** : 
          - Lecteur YouTube responsive 16:9 sans distraction (`enablejsapi=1&playsinline=1`).
          - **Option 1 (Plein écran Hybride & Pseudo-Fullscreen iOS)** : Le bouton « Plein écran / Paysage » utilise l'API Fullscreen native sur Android/Desktop et active un mode *Pseudo-Fullscreen* immersif en CSS (`fixed`, 100vw / 100vh, fond noir et `z-index` supérieur) sur iPhone/Safari où l'API Fullscreen sur élément DOM est absente. Un bouton flottant semi-transparent « Quitter » dans la safe area permet de quitter l'immersion à tout moment.
          - **Option 2 (Bascule Automatique en Paysage)** : Dès que l'apprenant tourne son smartphone à l'horizontale (mode paysage), le lecteur passe automatiquement en immersion plein écran à 100% sans être masqué par l'en-tête ni par `SeriesCardFooter`. Le retour en mode portrait rétablit la disposition normale et les boutons de validation.
        - **Suivi Dynamique & Validation au Seuil de 95%** :
          - L'avancement est mesuré en temps réel en arrière-plan sans encombrer l'écran.
          - Le bouton d'action dans le footer fixe (`SeriesCardFooter`) affiche le pourcentage en direct (`Valider (X% / 95%)`) et reste verrouillé tant que l'élève n'a pas visionné au moins 95% de la vidéo ou atteint son terme.
          - Dès le seuil atteint, le bouton s'active en vert vif (« Valider la vidéo »).
          - Au clic sur « Valider la vidéo », la célébration confettis s'anime et les boutons de navigation (« Cours » et « Terminer le cours » ou « Élément suivant ») apparaissent.
          - Si une vidéo a déjà été validée par le passé, elle s'ouvre directement avec ses boutons de navigation prêts sans rejouer de confettis intempestifs.
      - **Leçons Pédagogiques de Cours (`roi_lecon`)** :
        - Présentation unifiée sous forme d'une carte unique (`1 / 1`) avec `ContentHeader` compact (Type « Leçon », sans sous-panneau redondant).
        - Lecture et hydratation interactive des diagrammes FEN et visualisateurs PGN au fil du texte.
        - **Validation au seuil de défilement (95%)** : Le bouton de validation du footer fixe `SeriesCardFooter` (sans zone de feedback) reste inactif tant que l'élève n'a pas fait défiler au moins 95% du contenu de la leçon (ou débloqué d'emblée si le document est court et ne nécessite pas d'ascenseur).
        - Dès la validation, la célébration confettis se déclenche et permet d'enchaîner directement vers la suite du cours.
      - **Navigation en Série & Fin de Contenu (`SeriesCardFooter`)** : Ancré de manière fixe et permanente au bas de l'écran (Scaffold mobile) sous le pouce de l'utilisateur dès la première carte (portail persistant et téléportation sécurisée), le footer intègre le badge d'étape (`Carte X / Y`, `Étape 1 / 1` ou `Leçon 1 / 1`), la zone de feedback masquable (inactive pour les vidéos et leçons) et le bouton d'avancement débloqué dès la validation de la position (avec support du verrouillage temporaire `disabled` pour imposer la lecture intégrale des explications ou le seuil de 95%). Il respecte scrupuleusement la marge de sécurité basse des smartphones (Home Indicator iOS/Android) pour un confort tactile absolu. La zone de contenu centrale défile en toute fluidité avec un dégagement inférieur automatique (`.has-series-footer`) permettant à l'utilisateur d'amener facilement toutes les questions et les boutons OUI/NON bien au-dessus du footer fixe. Dès la dernière étape résolue, le footer se métamorphose sur place pour proposer le bouton *« Cours »* et le bouton *« Élément suivant »* (ou *« Terminer le cours »*) animé d'une pulsation lumineuse douce, accompagné d'une double gerbe de confettis festifs (`canvas-confetti`) et d'une vibration haptique sur smartphone, pour une ergonomie sans défilement superflu.
      - **Chronométrage & Validation finale** : Mesure en temps réel du temps passé sur la leçon, vidéo ou exercice, puis transmission atomique de la durée (`time_spent`) lors de la validation de la réussite dans la progression de l'adhérent. L'enregistrement de la validation s'exécute immédiatement dès le déclenchement des confettis (avec synchronisation et attente de la promesse lors des navigations), garantissant le déblocage instantané de l'élément suivant dans la playlist de cours.

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

## Informations Système, Mises à Jour & Gestion du Cache

En bas de la page **Profil** (accessible à tous les utilisateurs, connectés ou non), une section dédiée permet de suivre l'état de l'application et de forcer la mise à niveau :

1. **Version Applicative** :
   - Affiche la version courante de la PWA (ex: `Version 1.6.1`), synchronisée avec le plugin WordPress.
2. **Rechercher les mises à jour** :
   - Interroge immédiatement le Service Worker pour vérifier si un nouveau paquet applicatif est disponible sur le serveur.
   - Affiche une notification toast confirmant si l'application est déjà à jour ou si une mise à jour est en cours d'installation.
3. **Vider le cache & actualiser** :
   - Permet de résoudre tout problème de cache persistant (notamment sous iOS en mode écran d'accueil).
   - Purge le `CacheStorage` d'assets et le cache des requêtes tout en **préservant scrupuleusement la session active** (aucun mot de passe à resaisir).
   - Recharge immédiatement l'application pour afficher la dernière version disponible.
