// backend/tests/security_remediation.test.js
// Security regression suite for the owner-password / PII-leak remediation.
//
// These are STATIC source checks (no database, no network, no dependencies),
// so the suite runs on a clean checkout:
//     node backend/tests/security_remediation.test.js

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// STRINGS ARE BUILT AT RUNTIME ON PURPOSE
// ---------------------------------------------------------------------------
// The legacy field name and the personal phone number must not appear as
// literals anywhere under backend/ — including in this file. Building them
// from fragments lets the suite scan itself without matching.
const LEGACY_FIELD = ['plain', 'Password'].join('');
const LEGACY_SELECT = `.select('+${LEGACY_FIELD}')`;
const LEGACY_POPULATE = `populate('owner', 'name email')`;
const PERSONAL_PHONE = ['9199755', '26627'].join('');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(__dirname, '../..');

let totalPassed = 0;
let totalFailed = 0;

function report(testName, passed, detail = '') {
    if (passed) {
        totalPassed++;
        console.log(`  [PASS] ${testName}${detail ? ' -> ' + detail : ''}`);
    } else {
        totalFailed++;
        console.error(`  [FAIL] ${testName}${detail ? ' -> ' + detail : ''}`);
    }
}

function run() {
    console.log('================================================================================');
    console.log('SECURITY REMEDIATION VERIFICATION (owner password + public PII leak)');
    console.log('================================================================================\n');

    // --------------------------------------------------------------------------------
    // COLLECT EVERY SOURCE FILE UNDER backend/
    // --------------------------------------------------------------------------------
    const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

    const collectSourceFiles = (dir, acc = []) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) {
                if (IGNORED_DIRS.has(entry.name)) continue;
                collectSourceFiles(path.join(dir, entry.name), acc);
            } else if (entry.isFile() && /\.(js|mjs|cjs|jsx)$/.test(entry.name)) {
                acc.push(path.join(dir, entry.name));
            }
        }
        return acc;
    };

    const sourceFiles = collectSourceFiles(BACKEND_ROOT);
    const readFile = (file) => fs.readFileSync(file, 'utf8');
    const rel = (file) => path.relative(REPO_ROOT, file).replace(/\\/g, '/');

    console.log(`--- SOURCE TREE SCAN (${sourceFiles.length} files under backend/) ---`);

    // --------------------------------------------------------------------------------
    // TASK 1: THE LEGACY PLAINTEXT PASSWORD FIELD IS GONE COMPLETELY
    // --------------------------------------------------------------------------------
    console.log('\n--- TASK 1: LEGACY PLAINTEXT PASSWORD FIELD ---');

    const filesWithLegacyField = sourceFiles.filter(file => readFile(file).includes(LEGACY_FIELD));

    report(
        `No source file under backend/ contains the string "${LEGACY_FIELD}"`,
        filesWithLegacyField.length === 0,
        filesWithLegacyField.length === 0
            ? `Scanned ${sourceFiles.length} files, 0 matches`
            : `Found in: ${filesWithLegacyField.map(rel).join(', ')}`
    );

    // The User schema must not declare the legacy field any more
    const userModelPath = path.join(BACKEND_ROOT, 'models', 'User.js');
    const userModel = readFile(userModelPath);
    report(
        'models/User.js does not declare the legacy field',
        !userModel.includes(LEGACY_FIELD),
        'User schema is clean'
    );

    // The User schema must carry the new "must change password" flag
    report(
        'models/User.js declares a mustChangePassword flag',
        /mustChangePassword\s*:\s*\{[\s\S]*?type\s*:\s*Boolean/.test(userModel),
        'mustChangePassword: { type: Boolean, ... }'
    );

    // The password hash itself must not be returned by default any more
    report(
        'models/User.js marks the password hash as select: false',
        /password\s*:\s*\{[\s\S]*?select\s*:\s*false/.test(userModel),
        'password is never selected by default'
    );

    // --------------------------------------------------------------------------------
    // TASK 2: NO PASSWORD IS EVER RETURNED BY THE OWNER ENDPOINTS
    // --------------------------------------------------------------------------------
    console.log('\n--- TASK 2: OWNER ENDPOINTS NEVER RETURN A PASSWORD ---');

    const ownerControllerPath = path.join(BACKEND_ROOT, 'controllers', 'ownerController.js');
    const ownerController = readFile(ownerControllerPath);
    const authControllerPath = path.join(BACKEND_ROOT, 'controllers', 'authController.js');
    const authController = readFile(authControllerPath);

    const filesWithLegacySelect = sourceFiles.filter(file => readFile(file).includes(LEGACY_SELECT));

    report(
        `No source file under backend/ contains "${LEGACY_SELECT}"`,
        filesWithLegacySelect.length === 0,
        filesWithLegacySelect.length === 0
            ? 'No explicit selection of the legacy field'
            : `Found in: ${filesWithLegacySelect.map(rel).join(', ')}`
    );

    report(
        'ownerController.js listOwners explicitly excludes the password hash',
        /const listOwners[\s\S]*?\.select\('-password'\)/.test(ownerController),
        "listOwners uses .select('-password')"
    );

    report(
        'ownerController.js getOwnerById explicitly excludes the password hash',
        /const getOwnerById[\s\S]*?\.select\('-password'\)/.test(ownerController),
        "getOwnerById uses .select('-password')"
    );

    report(
        'ownerController.js generates the temporary password with crypto.randomBytes',
        /crypto\.randomBytes/.test(ownerController) && /require\('crypto'\)/.test(ownerController),
        'crypto.randomBytes is used for the one-time temporary password'
    );

    report(
        'ownerController.js returns the one-time temporary password only in create/reset',
        /const buildTemporaryPasswordPayload[\s\S]*?temporaryPassword\s*[,:]/.test(ownerController) &&
            /const createOwner[\s\S]*?buildTemporaryPasswordPayload\(/.test(ownerController) &&
            /const resetOwnerPassword[\s\S]*?buildTemporaryPasswordPayload\(/.test(ownerController) &&
            (ownerController.match(/const buildTemporaryPasswordPayload/g) || []).length === 1 &&
            (ownerController.match(/buildTemporaryPasswordPayload\(/g) || []).length === 2,
        'Helper defined once, used once in createOwner and once in resetOwnerPassword'
    );

    report(
        'ownerController.js flags created/reset accounts with mustChangePassword',
        /mustChangePassword\s*:\s*true/.test(ownerController),
        'mustChangePassword: true on create + reset'
    );

    report(
        'authController.js clears mustChangePassword when the user sets their own password',
        /mustChangePassword\s*=\s*false/.test(authController),
        'updatePassword sets mustChangePassword = false'
    );

    report(
        'authController.js selects the password hash explicitly for the login comparison',
        /findOne\(\{ email \}\)[\s\S]{0,200}\.select\('\+password[^']*'\)/.test(authController),
        "loginUser uses .select('+password ...')"
    );

    // --------------------------------------------------------------------------------
    // TASK 3: THE PUBLIC PROPERTY ENDPOINTS DO NOT LEAK PII
    // --------------------------------------------------------------------------------
    console.log('\n--- TASK 3: PUBLIC PROPERTY PII LEAK ---');

    const propertyControllerPath = path.join(BACKEND_ROOT, 'controllers', 'propertyController.js');
    const propertyController = readFile(propertyControllerPath);

    report(
        'propertyController.js does not populate the owner email address',
        !propertyController.includes(LEGACY_POPULATE),
        `Literal "${LEGACY_POPULATE}" is absent`
    );

    report(
        'propertyController.js defines a public owner projection with the name only',
        /const OWNER_FIELDS_PUBLIC\s*=\s*'name'/.test(propertyController),
        "OWNER_FIELDS_PUBLIC = 'name'"
    );

    report(
        'propertyController.js redacts the address for public responses',
        /redactPropertyForPublic/.test(propertyController) &&
            /PUBLIC_REDACTED_PROPERTY_FIELDS\s*=\s*\[[^\]]*'address'/.test(propertyController),
        "PUBLIC_REDACTED_PROPERTY_FIELDS includes 'address'"
    );

    report(
        'propertyController.js redacts owner contact details for public responses',
        /PUBLIC_REDACTED_OWNER_FIELDS[\s\S]*?'email'[\s\S]*?'phone'/.test(propertyController),
        'owner email + phone are stripped from public payloads'
    );

    report(
        'propertyController.js applies the redaction to the public list endpoint',
        /const getProperties[\s\S]*?redactPropertyForPublic/.test(propertyController),
        'getProperties redacts before responding'
    );

    report(
        'propertyController.js applies the redaction to the public detail endpoint',
        /const getPropertyBySlug[\s\S]*?redactPropertyForPublic/.test(propertyController),
        'getPropertyBySlug redacts before responding'
    );

    // --------------------------------------------------------------------------------
    // TASK 4: NO HARD-CODED PERSONAL PHONE NUMBER IN THE BACKEND
    // --------------------------------------------------------------------------------
    console.log('\n--- TASK 4: HARD-CODED PERSONAL PHONE NUMBER ---');

    const siteSettingsPath = path.join(BACKEND_ROOT, 'models', 'SiteSettings.js');
    const siteSettings = readFile(siteSettingsPath);

    report(
        'models/SiteSettings.js does not contain the personal phone number',
        !siteSettings.includes(PERSONAL_PHONE),
        'No personal number baked into the schema default'
    );

    const backendFilesWithPhone = sourceFiles.filter(file => readFile(file).includes(PERSONAL_PHONE));

    report(
        'No source file under backend/ contains the personal phone number',
        backendFilesWithPhone.length === 0,
        backendFilesWithPhone.length === 0
            ? `Scanned ${sourceFiles.length} files, 0 matches`
            : `Found in: ${backendFilesWithPhone.map(rel).join(', ')}`
    );

    // --------------------------------------------------------------------------------
    // TASK 5: THE MIGRATION SCRIPT EXISTS AND IS IDEMPOTENT
    // --------------------------------------------------------------------------------
    console.log('\n--- TASK 5: PLAINTEXT PASSWORD PURGE MIGRATION SCRIPT ---');

    const migrationPath = path.join(BACKEND_ROOT, 'scripts', 'purge-plaintext-passwords.js');

    report(
        'backend/scripts/purge-plaintext-passwords.js exists',
        fs.existsSync(migrationPath),
        rel(migrationPath)
    );

    if (fs.existsSync(migrationPath)) {
        const migration = readFile(migrationPath);

        report(
            'The migration script unsets the legacy field on every user document',
            /updateMany\(\s*\{\s*\},\s*\{\s*\$unset/.test(migration) &&
                migration.includes(`{ $unset: { [LEGACY_FIELD]: "" } }`),
            `updateMany({}, { $unset: { ${LEGACY_FIELD}: "" } })`
        );

        report(
            'The migration script uses the repository MONGODB_URI convention',
            migration.includes('process.env.MONGODB_URI'),
            'process.env.MONGODB_URI'
        );

        report(
            'The migration script reports how many users were affected',
            /modifiedCount/.test(migration) && /affectedBefore/.test(migration),
            'Prints affected + modified document counts'
        );

        report(
            'The migration script carries the "safe to re-run" header comment',
            /Run once against the production MongoDB to remove the legacy plaintext\s+password field\. Safe to re-run\./.test(migration),
            'Header comment present'
        );
    }

    // --------------------------------------------------------------------------------
    // TASK 6: THE BACKEND STILL LOADS (no syntax errors introduced)
    // --------------------------------------------------------------------------------
    console.log('\n--- TASK 6: MODULE LOAD SMOKE TEST ---');

    const modulesToLoad = [
        'models/User.js',
        'models/SiteSettings.js',
        'controllers/ownerController.js',
        'controllers/authController.js',
        'controllers/propertyController.js'
    ];

    for (const relPath of modulesToLoad) {
        const filePath = path.join(BACKEND_ROOT, relPath);
        let loaded = false;
        let errorMessage = '';
        try {
            require(filePath);
            loaded = true;
        } catch (error) {
            errorMessage = error.message;
        }
        report(`backend/${relPath} loads without error`, loaded, loaded ? 'module loaded' : errorMessage);
    }

    // --------------------------------------------------------------------------------
    // BEHAVIOURAL CHECK: THE REDACTION HELPER ACTUALLY REMOVES THE PII
    // --------------------------------------------------------------------------------
    console.log('\n--- TASK 7: REDACTION BEHAVIOUR ---');

    const propertyControllerModule = require(propertyControllerPath);
    const redactionHelper = propertyControllerModule.redactPropertyForPublic;

    report(
        'propertyController.js exports the redaction helper for testing',
        typeof redactionHelper === 'function',
        'redactPropertyForPublic is exported'
    );

    if (typeof redactionHelper === 'function') {
        const sampleProperty = {
            _id: 'prop-1',
            name: 'Surya Villa',
            address: 'C54, B-Wing, 4th floor',
            location: 'Pawna Lake',
            googleMapsLink: 'https://maps.app.goo.gl/example',
            owner: { _id: 'owner-1', name: 'Surya', email: 'suryavilla@gmail.com', phone: '9999999999' }
        };

        const redacted = redactionHelper(sampleProperty);

        report(
            'The redaction helper removes the property address',
            redacted.address === undefined,
            'address is undefined after redaction'
        );

        report(
            'The redaction helper removes the owner email address',
            redacted.owner && redacted.owner.email === undefined,
            'owner.email is undefined after redaction'
        );

        report(
            'The redaction helper removes the owner phone number',
            redacted.owner && redacted.owner.phone === undefined,
            'owner.phone is undefined after redaction'
        );

        report(
            'The redaction helper keeps the public-safe fields',
            redacted.name === 'Surya Villa' && redacted.location === 'Pawna Lake' &&
                redacted.owner && redacted.owner.name === 'Surya',
            'name / location / owner.name are preserved'
        );

        try {
            assert.strictEqual(redacted.address, undefined);
            assert.strictEqual(redacted.owner.email, undefined);
            report('assert() confirms the redacted payload carries no owner email / address', true);
        } catch (err) {
            report('assert() confirms the redacted payload carries no owner email / address', false, err.message);
        }
    }

    // --------------------------------------------------------------------------------
    // SUMMARY
    // --------------------------------------------------------------------------------
    console.log('\n================================================================================');
    console.log(`SECURITY REMEDIATION TEST SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED out of ${totalPassed + totalFailed} TESTS`);
    console.log('================================================================================');

    if (totalFailed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

run();
