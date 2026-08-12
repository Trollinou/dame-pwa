# Directives Agent & Règles projet — DAME-PWA

## 1. Outillage & MCP
- Interdiction d'utiliser `get_repository_content` sur la racine. Utiliser uniquement `search_code` ou `get_file_content` ciblés.
- Ne JAMAIS réécrire un fichier complet pour une modification. Fournir des diffs ou des fonctions isolées. Pas de disclaimers ni commentaires verbeux.

## 2. Stack Technique
- **Plugin** : `DAME-PWA` | Slug: `dame-pwa` | Prefix: `dame_pwa_` | Namespace: `DAME_PWA\` | Table: `{$wpdb->prefix}dame_pwa_`
- **WordPress** : 7.0.1 (Interactivity API, Transients).
- **PHP** : 8.4 avec `declare(strict_types=1);`. Composer AUTORISÉ en prod (`composer install --no-dev --optimize-autoloader`). Inclure `vendor/autoload.php` + Autoloader SPL natif fallback dans `dame-pwa.php`.
- **JS / CSS** : ES2021 Vanilla (pas de jQuery), SCSS avec BEM. Sources dans `src/`, compilés dans `build/` et `assets/`.

## 3. Architecture & Structure
- **PSR-4 / Namespaces** : Sous-dossiers dans `includes/` en PascalCase (`includes/Admin/`, `includes/CPT/`, `includes/DTO/`). Fichiers/classes en PascalCase.
- **Assets centralisés** : `assets/css/` et `assets/js/`. Naming: `{contexte}-{composant}.{ext}` (ex: `admin-members.js`). Enqueue handles préfixés par `dame-pwa-`.
- **Complexité = Sous-dossier** : Si > 300-400 lignes, découper la classe/module dans un sous-dossier thématique avec le pattern Manager/Components. Une classe = Un fichier.

## 4. Règles Code & Sécurité
- **PHP 8.4** : Promoted properties, Enums typés, DTO `readonly`, strict return types. `$wpdb->prepare` obligatoire.
- **Sécurité WP** : Nonce + Capability checks (`manage_options`) systématiques. Input sanitization + Output escaping (`esc_html`, `esc_attr`).
- **Post Meta** : Attribut `name` HTML sans `_`, mais enregistrement meta BDD avec `_` (ex: `_dame_pwa_identity_name`).
- **Shortcodes** : Capturer `wp_editor()` via `ob_start()` / `ob_get_clean()`.

## 5. QA & Conformité
- Config PHPStan Level 6 (`phpstan.neon`), PHPCS (détection des écarts de standards) et PHPCBF (correction automatique du style) + ESLint WP (`eslint.config.js`).
- Versionning sémantique synchronisé : `dame-pwa.php`, constante `DAME_PWA_VERSION`, `package.json`, `CHANGELOG.md`, `RELEASE.md`.
- **Documentation vivante (Définition de "Fini")** : Toute modification ou ajout de fonctionnalité, hook, shortcode, option de configuration ou commande de build **impose** la mise à jour synchrone de :
  - `README.md` : pour la partie technique, architecture, prérequis, installation et dev.
  - `USING.md` : pour le guide d'utilisation, les workflows administrateur/utilisateur et les captures/exemples de rendu.
  - Une tâche de code n'est considérée comme **terminée** que lorsque sa documentation est à jour.