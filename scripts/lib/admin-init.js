'use strict';

const fs = require('fs');
const path = require('path');

function findServiceAccountKey(repoRoot) {
  if (process.env.SERVICE_ACCOUNT_KEY_PATH) {
    return path.resolve(process.env.SERVICE_ACCOUNT_KEY_PATH);
  }
  const explicit = path.join(repoRoot, 'serviceAccountKey.json');
  if (fs.existsSync(explicit)) return explicit;
  const candidates = fs.readdirSync(repoRoot).filter(f => /firebase-adminsdk.*\.json$/i.test(f));
  if (candidates.length) return path.join(repoRoot, candidates[0]);
  return null;
}

function initFirestore(repoRoot) {
  const keyPath = findServiceAccountKey(repoRoot);
  if (!keyPath) {
    console.error('サービスアカウント鍵が見つかりません。');
    console.error(`  ${repoRoot} 直下に serviceAccountKey.json を置くか、`);
    console.error('  環境変数 SERVICE_ACCOUNT_KEY_PATH でパスを指定してください。');
    process.exit(1);
  }

  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
  }
  console.log(`サービスアカウント鍵: ${keyPath}`);
  return admin.firestore();
}

module.exports = { findServiceAccountKey, initFirestore };
