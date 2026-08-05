'use strict';

/**
 * seed-posts.js が作成したサンプル投稿（isSeedData: true）を一括削除する。
 *
 * 使い方:
 *   node scripts/delete-seed-posts.js            プレビューのみ。何も削除しません。
 *   node scripts/delete-seed-posts.js --commit   isSeedData: true の投稿を実際に削除します。
 *
 * サンプル投稿に誰かがコメントを付けていた場合、posts/{id}/comments サブコレクションが
 * 孤立して残らないよう、投稿本体を消す前にそのサブコレクションも削除します。
 */

const path = require('path');
const { initFirestore } = require('./lib/admin-init');

const REPO_ROOT = path.join(__dirname, '..');
const CHUNK_SIZE = 400;

async function deleteSubcollection(ref) {
  const snap = await ref.collection('comments').get();
  if (snap.empty) return 0;
  const batch = ref.firestore.batch();
  snap.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snap.size;
}

async function main() {
  const shouldCommit = process.argv.includes('--commit');
  const db = initFirestore(REPO_ROOT);

  const snap = await db.collection('posts').where('isSeedData', '==', true).get();
  if (snap.empty) {
    console.log('isSeedData: true の投稿は見つかりませんでした。');
    return;
  }

  const byAttr = {};
  snap.forEach((doc) => {
    const attr = doc.get('attr') || '(unknown)';
    byAttr[attr] = (byAttr[attr] || 0) + 1;
  });

  console.log(`isSeedData: true の投稿: ${snap.size}件`);
  Object.entries(byAttr).forEach(([attr, count]) => console.log(`  - ${attr}: ${count}件`));

  if (!shouldCommit) {
    console.log('\n実際に削除するには --commit オプションを付けて実行してください:');
    console.log('  node scripts/delete-seed-posts.js --commit');
    return;
  }

  const docs = snap.docs;
  let deletedComments = 0;
  for (const doc of docs) {
    deletedComments += await deleteSubcollection(doc.ref);
  }
  if (deletedComments) {
    console.log(`コメント ${deletedComments}件も合わせて削除しました。`);
  }

  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();
    chunk.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`  ${Math.min(i + CHUNK_SIZE, docs.length)} / ${docs.length} 件 削除完了`);
  }

  console.log('削除が完了しました。');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
