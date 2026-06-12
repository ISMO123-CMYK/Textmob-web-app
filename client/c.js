import fs from 'fs';
import path from 'path';

// Adjust this folder path if your source files are located elsewhere
const SRC_DIR = './src';
const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

const exportCache = {};
const importErrors = [];

function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(file));
        } else if (EXTENSIONS.includes(path.extname(file))) {
            results.push(file);
        }
    });
    return results;
}

function resolvePath(currentFile, importPath) {
    if (!importPath.startsWith('.')) return null; // Skip third-party packages
    let fullPath = path.resolve(path.dirname(currentFile), importPath);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) return fullPath;
    for (const ext of EXTENSIONS) {
        if (fs.existsSync(fullPath + ext)) return fullPath + ext;
        if (fs.existsSync(path.join(fullPath, 'index' + ext))) return path.join(fullPath, 'index' + ext);
    }
    return null;
}

function analyzeExports(filePath) {
    if (exportCache[filePath]) return exportCache[filePath];
    const content = fs.readFileSync(filePath, 'utf8');

    const exports = { hasDefault: false, named: [] };
    if (content.includes('export default')) exports.hasDefault = true;

    const namedMatches = content.matchAll(/export\s+(const|let|var|function|class|type|interface)\s+([a-zA-Z0-9_]+)/g);
    for (const match of namedMatches) {
        exports.named.push(match[2]);
    }

    const trailingMatches = content.match(/export\s*\{([^}]+)\}/);
    if (trailingMatches) {
        trailingMatches[1].split(',').forEach(item => {
            const name = item.trim().split(/\s+as\s+/).pop().trim();
            if (name === 'default') exports.hasDefault = true;
            else if (name) exports.named.push(name);
        });
    }

    exportCache[filePath] = exports;
    return exports;
}

function checkImports() {
    const files = getFiles(SRC_DIR);
    console.log(`Scanning ${files.length} files for import/export mismatches...\n`);

    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        // Match standard import statements
        const importMatches = content.matchAll(/import\s+([\w\s{},*]+)\s+from\s+['"]([^'"]+)['"]/g);

        for (const match of importMatches) {
            const importClause = match[1].trim();
            const importPath = match[2];
            const targetFile = resolvePath(file, importPath);

            if (!targetFile) continue;
            const targetExports = analyzeExports(targetFile);

            // Case 1: Check default import
            const defaultMatch = importClause.match(/^([\w]+)/);
            if (defaultMatch && !targetExports.hasDefault) {
                importErrors.push(`❌ Default Import Mismatch:\n   File: ${file}\n   Attempts to default-import '${defaultMatch[1]}' from '${importPath}'\n   Fix: The destination file has NO default export.\n`);
            }

            // Case 2: Check named imports
            const namedBrackets = importClause.match(/\{([^}]+)\}/);
            if (namedBrackets) {
                const importedNames = namedBrackets[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim());
                importedNames.forEach(name => {
                    if (name && !targetExports.named.includes(name)) {
                        importErrors.push(`❌ Named Import Mismatch:\n   File: ${file}\n   Attempts to import { ${name} } from '${importPath}'\n   Fix: Component '${name}' is not exported from that file.\n`);
                    }
                });
            }
        }
    });

    if (importErrors.length === 0) {
        console.log("✅ No clear import/export mismatches found in your local files!");
    } else {
        console.log(`Found ${importErrors.length} potential issues:\n`);
        importErrors.forEach(err => console.log(err));
    }
}

checkImports();
