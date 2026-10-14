const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const targetDir = path.join(rootDir, 'pwa', 'public', 'stockfish');

const candidateDirs = [
    path.join(rootDir, 'node_modules', 'eg-chessboard', 'dist'),
    path.join(rootDir, '..', 'eg-chessboard', 'dist'),
];

let sourceDir = null;
for (const dir of candidateDirs) {
    if (fs.existsSync(path.join(dir, 'stockfish.js')) && fs.existsSync(path.join(dir, 'stockfish.wasm'))) {
        sourceDir = dir;
        break;
    }
}

if (!sourceDir) {
    console.warn('⚠️  Avertissement : Binaires stockfish introuvables dans eg-chessboard (node_modules ou ../eg-chessboard).');
    process.exit(0);
}

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

const filesToSync = ['stockfish.js', 'stockfish.wasm'];
let updated = false;

for (const file of filesToSync) {
    const srcFile = path.join(sourceDir, file);
    const destFile = path.join(targetDir, file);

    let needsCopy = true;
    if (fs.existsSync(destFile)) {
        const srcStat = fs.statSync(srcFile);
        const destStat = fs.statSync(destFile);
        if (srcStat.size === destStat.size) {
            needsCopy = false;
        }
    }

    if (needsCopy) {
        fs.copyFileSync(srcFile, destFile);
        console.log(`  ✓ ${file} synchronisé depuis ${path.relative(rootDir, srcFile)} (${(fs.statSync(destFile).size / 1024).toFixed(1)} Ko)`);
        updated = true;
    }
}

// Vérification de la présence du .htaccess pour le type MIME WASM
const htaccessFile = path.join(targetDir, '.htaccess');
if (!fs.existsSync(htaccessFile)) {
    fs.writeFileSync(htaccessFile, 'AddType application/wasm .wasm\n', 'utf8');
    console.log('  ✓ .htaccess généré dans pwa/public/stockfish/');
}

if (!updated) {
    console.log('ℹ️  Binaires Stockfish déjà à jour dans pwa/public/stockfish/.');
}
