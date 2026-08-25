#!/usr/bin/env node

/**
 * Script de synchronisation et de montée de version sémantique (SemVer).
 * 
 * Synchronise les fichiers :
 * - dame-pwa.php (en-tête Version et constante DAME_PWA_VERSION)
 * - package.json (version et script de build/pack si applicable)
 * - block.json (fichiers de blocs Gutenberg dans src/ et blocks/ le cas échéant)
 * - CHANGELOG.md (gestion de la section ## [Unreleased] -> ## [X.Y.Z] - YYYY-MM-DD)
 * - PWA (vite.config.ts / manifests / package-lock racine / pwa package)
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const mainPhpFile = path.join(rootDir, 'dame-pwa.php');
const packageJsonFile = path.join(rootDir, 'package.json');
const changelogFile = path.join(rootDir, 'CHANGELOG.md');

// 1. Détection et validation de la version cible
const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

let targetVersion = process.argv[2] ? process.argv[2].trim() : null;

if (!targetVersion) {
	if (fs.existsSync(packageJsonFile)) {
		try {
			const pkg = JSON.parse(fs.readFileSync(packageJsonFile, 'utf8'));
			targetVersion = pkg.version;
		} catch (e) {
			// fallback PHP
		}
	}

	if (!targetVersion && fs.existsSync(mainPhpFile)) {
		const phpContent = fs.readFileSync(mainPhpFile, 'utf8');
		const match = phpContent.match(/Version:\s*([^\s\r\n]+)/);
		if (match) {
			targetVersion = match[1].trim();
		}
	}
}

if (!targetVersion) {
	console.error('❌ Erreur : Impossible de déterminer la version cible.');
	process.exit(1);
}

if (!semverRegex.test(targetVersion)) {
	console.error(`❌ Erreur : La version "${targetVersion}" n'est pas un format SemVer valide (ex: 1.2.3 ou 1.2.3-beta.1).`);
	process.exit(1);
}

console.log(`🚀 Synchronisation SemVer vers la version : \x1b[32m${targetVersion}\x1b[0m\n`);

const updatedFiles = [];

// Helper de mise à jour de fichier
function updateFile(filePath, updater) {
	if (!fs.existsSync(filePath)) {
		return false;
	}
	const original = fs.readFileSync(filePath, 'utf8');
	const modified = updater(original);
	if (original !== modified) {
		fs.writeFileSync(filePath, modified, 'utf8');
		const relPath = path.relative(rootDir, filePath);
		updatedFiles.push(relPath);
		console.log(`  ✓ Mis à jour : \x1b[36m${relPath}\x1b[0m`);
		return true;
	}
	const relPath = path.relative(rootDir, filePath);
	console.log(`  - Inchangé : ${relPath}`);
	return false;
}

// 2. Fichier PHP principal du plugin WordPress (dame-pwa.php)
console.log('📄 1. Fichier PHP principal du plugin');
updateFile(mainPhpFile, (content) => {
	let res = content;
	// Header standard WordPress : * Version: X.Y.Z
	res = res.replace(/(\*\s*Version:\s*)([^\r\n]+)/i, `$1${targetVersion}`);
	// Constante PHP de version : define( 'DAME_PWA_VERSION', 'X.Y.Z' );
	res = res.replace(/(define\(\s*['"]DAME_PWA_VERSION['"]\s*,\s*['"])([^'"]+)(['"]\s*\);)/g, `$1${targetVersion}$3`);
	return res;
});

// 3. Fichier package.json
console.log('\n📦 2. Fichier package.json');
updateFile(packageJsonFile, (content) => {
	try {
		const pkg = JSON.parse(content);
		pkg.version = targetVersion;
		return JSON.stringify(pkg, null, 2) + '\n';
	} catch (e) {
		console.error(`❌ Erreur de parsing JSON pour ${packageJsonFile}:`, e.message);
		return content;
	}
});

// 4. Blocs Gutenberg (block.json) dans src/ et blocks/
console.log('\n🧩 3. Blocs Gutenberg (block.json)');
function findBlockJsonFiles(dir, fileList = []) {
	if (!fs.existsSync(dir)) return fileList;
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'vendor') {
				findBlockJsonFiles(fullPath, fileList);
			}
		} else if (entry.isFile() && entry.name === 'block.json') {
			fileList.push(fullPath);
		}
	}
	return fileList;
}

const blockDirs = [path.join(rootDir, 'src'), path.join(rootDir, 'blocks'), path.join(rootDir, 'pwa', 'src')];
const blockJsonFiles = [];
for (const dir of blockDirs) {
	findBlockJsonFiles(dir, blockJsonFiles);
}

if (blockJsonFiles.length === 0) {
	console.log('  - Aucun fichier block.json détecté.');
} else {
	for (const blockFile of blockJsonFiles) {
		updateFile(blockFile, (content) => {
			try {
				const block = JSON.parse(content);
				if (block.version) {
					block.version = targetVersion;
					return JSON.stringify(block, null, 2) + '\n';
				}
				return content;
			} catch (e) {
				return content;
			}
		});
	}
}

// 5. Fichier CHANGELOG.md (Keep a Changelog standard)
console.log('\n📝 4. Fichier CHANGELOG.md');
updateFile(changelogFile, (content) => {
	// Date au format YYYY-MM-DD
	const today = new Date();
	const yyyy = today.getFullYear();
	const mm = String(today.getMonth() + 1).padStart(2, '0');
	const dd = String(today.getDate()).padStart(2, '0');
	const dateStr = `${yyyy}-${mm}-${dd}`;

	const unreleasedRegex = /##\s*\[Unreleased\]/i;
	const versionRegex = new RegExp(`##\\s*\\[${targetVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'i');

	// Si la section de la version cible existe déjà, on ne touche pas au CHANGELOG
	if (versionRegex.test(content)) {
		return content;
	}

	// Si la section [Unreleased] est présente, on la transforme
	if (unreleasedRegex.test(content)) {
		const newSection = `## [Unreleased]\n\n## [${targetVersion}] - ${dateStr}`;
		return content.replace(unreleasedRegex, newSection);
	}

	return content;
});

// 6. Fichiers et configurations de la PWA
console.log('\n📱 5. Composants et configuration PWA');
// - package-lock.json si présent à la racine pour synchroniser la version du package racine
const packageLockFile = path.join(rootDir, 'package-lock.json');
if (fs.existsSync(packageLockFile)) {
	updateFile(packageLockFile, (content) => {
		try {
			const lock = JSON.parse(content);
			let changed = false;
			if (lock.version && lock.version !== targetVersion) {
				lock.version = targetVersion;
				changed = true;
			}
			if (lock.packages && lock.packages[''] && lock.packages[''].version !== targetVersion) {
				lock.packages[''].version = targetVersion;
				changed = true;
			}
			return changed ? JSON.stringify(lock, null, 2) + '\n' : content;
		} catch (e) {
			return content;
		}
	});
}

// - PWA subpackage.json si un sous-projet pwa/package.json existe
const pwaPackageJsonFile = path.join(rootDir, 'pwa', 'package.json');
if (fs.existsSync(pwaPackageJsonFile)) {
	updateFile(pwaPackageJsonFile, (content) => {
		try {
			const pkg = JSON.parse(content);
			pkg.version = targetVersion;
			return JSON.stringify(pkg, null, 2) + '\n';
		} catch (e) {
			return content;
		}
	});
}

// 7. Récapitulatif
console.log('\n========================================');
console.log(`🎉 Synchronisation terminée avec succès : \x1b[32mv${targetVersion}\x1b[0m`);
console.log(`📊 Fichiers modifiés (${updatedFiles.length}) :`);
if (updatedFiles.length > 0) {
	updatedFiles.forEach((file) => console.log(`   - ${file}`));
} else {
	console.log('   (Aucun fichier n\'a nécessité de modification)');
}
console.log('========================================\n');

process.exit(0);
