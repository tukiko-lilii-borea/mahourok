'use strict';

/**
 * まほろく☆テレパス サンプル投稿 一括生成スクリプト（一度きり実行用）
 *
 * 使い方:
 *   node scripts/seed-posts.js            プレビューのみ。Firestoreには一切書き込みません。
 *   node scripts/seed-posts.js --commit   実際にFirestoreの posts コレクションへ書き込みます。
 *
 * サービスアカウント鍵の置き場所:
 *   このリポジトリ（mahourok/）直下に、Firebaseコンソールでダウンロードした
 *   サービスアカウント鍵JSONを置いてください。ファイル名は次のどちらでもOKです。
 *     - serviceAccountKey.json
 *     - ダウンロード時のデフォルト名（*firebase-adminsdk*.json）
 *   別の場所に置く場合は環境変数 SERVICE_ACCOUNT_KEY_PATH でパスを指定してください。
 *   このファイルは .gitignore 済みなのでコミットされません。
 *
 * 投稿日時（ts / bumpedAt）は「今から過去 SEED_MAX_AGE_DAYS 日以内」でランダムに散らします。
 */

const path = require('path');
const { initFirestore } = require('./lib/admin-init');

const REPO_ROOT = path.join(__dirname, '..');
const SEED_MAX_AGE_DAYS = 60;

/* ===== 21属性 × サンプル投稿データ =====
   各属性2キャラ・計5投稿ずつ。名前・文面は属性の雰囲気に合わせています。
   avatar は本体の ATTR_AVATAR_MAP に沿った値を使用。 */
const SEED_DATA = {
  maboroshi: [ // 幻
    { name: 'イリュージョ・カゲロウ', avatar: 'cat', text: '今日は姿を消して抜き打ちおどかし大成功…のはずが、自分でも自分がどこにいるか見失った。誰か助けて〜(笑)' },
    { name: 'イリュージョ・カゲロウ', avatar: 'cat', text: '幻の練習してたら教室のみんなが二重に見えてびっくりされた。ごめんね、ただの練習だよ〜☆' },
    { name: 'イリュージョ・カゲロウ', avatar: 'cat', text: '本当のわたしはどこにいるでしょう？ふふ、こたえは秘密。今日も気まぐれに世界のどこかにいます。' },
    { name: 'ファントム・アネモネ', avatar: 'moon', text: '見えないものを見せる魔法、実は使い魔にもナイショでこっそり練習中。今度こそビシッと決めたい。' },
    { name: 'ファントム・アネモネ', avatar: 'moon', text: '夢か現実かわからなくなる瞬間が好き。境界線があいまいなくらいがちょうどいいの。' },
  ],
  kagami: [ // 鏡
    { name: 'ミラルカ・スイレン', avatar: 'moon', text: '相手の技をそのまま跳ね返す練習、今日は自分の技で自分がびっくりする事故が発生しました。反省。' },
    { name: 'ミラルカ・スイレン', avatar: 'moon', text: '鏡越しに見る世界って、ちょっとだけ本音が見える気がする。観察するの、わりと好き。' },
    { name: 'ミラルカ・スイレン', avatar: 'moon', text: 'やられたらやり返す…んじゃなくて、そのままお返しするだけ。冷静に、丁寧に。' },
    { name: 'レフレクト・トウカ', avatar: 'crown', text: '今日も静かに周りを見てました。誰が一番がんばってるか、ちゃんと知ってるよ。' },
    { name: 'レフレクト・トウカ', avatar: 'crown', text: '反射神経より大事なのは観察眼。じっくり見てから動く派です。' },
  ],
  yume: [ // 夢
    { name: 'ドリーミア・フワリ', avatar: 'moon', text: 'さっき見てた夢の中で空を飛んでたんだけど、目が覚めたら普通にベッドから落ちてた。ふわふわ…' },
    { name: 'ドリーミア・フワリ', avatar: 'moon', text: '眠りの魔法、加減がむずかしくて自分までウトウトしちゃう。今日はもう寝ます、おやすみ☆' },
    { name: 'ドリーミア・フワリ', avatar: 'moon', text: '現実と夢の境目がなくなる瞬間、ちょっと怖いけどちょっと好き。今日はどっちの世界にいるのかな。' },
    { name: 'ソムニア・ネムリ', avatar: 'flower', text: '夢の中でみんなに会える魔法があったらいいのにって、いつも思ってる。' },
    { name: 'ソムニア・ネムリ', avatar: 'flower', text: 'ふわふわした気持ちのまま今日も一日終わりそう。それはそれで悪くない。' },
  ],
  toki: [ // 時
    { name: 'クロノス・トワ', avatar: 'moon', text: '時間を少しだけ止めてお昼寝、なんてズルはしてません。…本当です。' },
    { name: 'クロノス・トワ', avatar: 'moon', text: '急がなくていい。焦らなくていい。時はいつだって、ちゃんと流れてるから。' },
    { name: 'クロノス・トワ', avatar: 'moon', text: '過去には戻れないけど、今日という時間は今しかない。大事に使お。' },
    { name: 'タイムリス・カヤ', avatar: 'crown', text: '時計の針より、自分のペースを信じることにしてる。それが一番落ち着く。' },
    { name: 'タイムリス・カヤ', avatar: 'crown', text: '待つことも魔法のうち。今日はじっくり待つ日でした。' },
  ],
  ai: [ // 愛
    { name: 'キューピット・ココネ', avatar: 'heart', text: '好きって気持ちがそのまま力になる属性だから、今日も全力で「好き」を叫んでいくよ〜！！' },
    { name: 'キューピット・ココネ', avatar: 'heart', text: '絆の力、舐めないでほしい。みんなで力合わせたら本当になんでもできる気がしてる。' },
    { name: 'キューピット・ココネ', avatar: 'heart', text: '照れくさくても言う。今日もみんなのこと大好きだよ！！' },
    { name: 'ラビュ・アカリ', avatar: 'ribbon', text: '誰かのために頑張れるって、実はすごく幸せなことだと思う。今日も誰かのために。' },
    { name: 'ラビュ・アカリ', avatar: 'ribbon', text: 'まっすぐな気持ちだけが取り柄です。それでいいと思ってる。' },
  ],
  hi: [ // 炎
    { name: 'イグニス・ケイ', avatar: 'stick', text: '今日も全力全開！！迷ったら前に出る、それがうちのやり方だ！！🔥' },
    { name: 'イグニス・ケイ', avatar: 'stick', text: '冷めた戦いなんて興味ない。燃え尽きるまでやりきるのが炎属性の流儀でしょ！' },
    { name: 'イグニス・ケイ', avatar: 'stick', text: '技名、また長くなっちゃったけど噛まずに言えたので満足です。次はもっと短くする…かも。' },
    { name: 'ブレイズ・アカネ', avatar: 'crown', text: '熱いのが取り柄！迷ってるヒマがあったら一歩踏み出せ、が信条です。' },
    { name: 'ブレイズ・アカネ', avatar: 'crown', text: '今日の特訓、全力すぎて使い魔にあきれられました。でも後悔なし！' },
  ],
  mizu: [ // 水
    { name: 'アクエリア・シズク', avatar: 'stick', text: 'しんどい時こそゆっくり流れよう。無理しなくていいよ、今日はそれだけ伝えたくて。' },
    { name: 'アクエリア・シズク', avatar: 'stick', text: '水は形を変えられるから、どんな場所にもなじめる気がする。今日は誰かの隣にいる形で。' },
    { name: 'アクエリア・シズク', avatar: 'stick', text: '疲れてる子がいたら声かけたくなっちゃう。それがわたしの落ち着く場所だから。' },
    { name: 'マリン・ルナ', avatar: 'moon', text: '波風立てずに、そっと場をおさめるの得意です。今日も平和な一日でした。' },
    { name: 'マリン・ルナ', avatar: 'moon', text: '涙も水の一種だから、泣きたい時は泣いていいと思ってる。流れればまた晴れるよ。' },
  ],
  kaze: [ // 風
    { name: 'ウィンディア・ソラ', avatar: 'flower', text: '今日は街の端から端まで全力ダッシュ！風みたいに自由に動けるの、最高に気持ちいい！' },
    { name: 'ウィンディア・ソラ', avatar: 'flower', text: '縛られるのニガテなので、思いついたらすぐ動く派です。じっとしてるの無理〜！' },
    { name: 'ウィンディア・ソラ', avatar: 'flower', text: '追い風が吹いてる気がする日は、なんでもうまくいく気がしてくる。今日がまさにそれ！' },
    { name: 'ゲイル・フウカ', avatar: 'ribbon', text: '身軽さだけならみんなに負けない自信あり。今日も身ひとつでどこへでも。' },
    { name: 'ゲイル・フウカ', avatar: 'ribbon', text: '自由きままに生きてるつもりだけど、たまには誰かと一緒に飛ぶのも悪くないな。' },
  ],
  kaminari: [ // 雷
    { name: 'サンダーラ・ビリー', avatar: 'stick', text: '今日の一撃、自分史上最速だったかも！！瞬発力なら誰にも負けない自信あり！' },
    { name: 'サンダーラ・ビリー', avatar: 'stick', text: 'はじけるようなエネルギー、抑えきれずについ大声出しちゃう。ごめん、元気なだけです！' },
    { name: 'サンダーラ・ビリー', avatar: 'stick', text: '迷ってる時間があったらもう動いてる。それがうちのスタイル、ビリビリ気合い入れてこ！' },
    { name: 'ボルテ・イナヅマ', avatar: 'star', text: '一瞬で決める、それが雷属性のかっこいいとこだと思ってる。今日も一瞬勝負！' },
    { name: 'ボルテ・イナヅマ', avatar: 'star', text: '静電気じゃなくて本物の雷なので、握手する時は気をつけてね（笑）' },
  ],
  koori: [ // 氷
    { name: 'フロスティ・レイ', avatar: 'stick', text: '表情はクールに見られがちだけど、実は誰よりも仲間思いのつもりです。' },
    { name: 'フロスティ・レイ', avatar: 'stick', text: '氷の魔法、加減をまちがえると教室が凍りつくので毎回慎重に…今日は成功でした。' },
    { name: 'フロスティ・レイ', avatar: 'stick', text: '冷静でいることと、冷たいことは違うと思ってる。今日もあったかい氷でいたい。' },
    { name: 'アイシクル・ユキナ', avatar: 'moon', text: '静かに見えて、芯はけっこう熱いタイプです。誤解されがちだけど。' },
    { name: 'アイシクル・ユキナ', avatar: 'moon', text: '氷みたいに透きとおった気持ちで、今日も一日過ごせました。' },
  ],
  daichi: [ // 地
    { name: 'アースリア・ツチノ', avatar: 'stick', text: 'どっしり構えてるのが取り柄。みんなが不安な時こそ、動じないでいたい。' },
    { name: 'アースリア・ツチノ', avatar: 'stick', text: '縁の下の力持ち、地味かもしれないけどこれが結構向いてる。今日もしっかり支えます。' },
    { name: 'アースリア・ツチノ', avatar: 'stick', text: '大地はどっしり動かない。だからこそみんな安心して立っていられる。今日もそうありたい。' },
    { name: 'ロック・ガンジ', avatar: 'flower', text: '派手さはないけど、支える力には自信あり。今日も足元からしっかりと。' },
    { name: 'ロック・ガンジ', avatar: 'flower', text: '焦らずコツコツ、それがうちのやり方。今日もじっくり積み上げてます。' },
  ],
  hikari: [ // 光
    { name: 'シャイン・ヒナタ', avatar: 'star', text: '今日も街のみんなに笑顔をお届け中！暗い顔してる子見つけたら、すぐ光らせに行くよ☆' },
    { name: 'シャイン・ヒナタ', avatar: 'star', text: 'ポジティブオーラ全開でいくのが日課。曇りの日でも心は晴れやかに！' },
    { name: 'シャイン・ヒナタ', avatar: 'star', text: 'みんなを照らすのが得意技。今日はどんな笑顔に出会えるかな、楽しみ！' },
    { name: 'サンシャワー・ノア', avatar: 'crown', text: '元気だけが取り柄なので、今日も全力で明るくいきます！' },
    { name: 'サンシャワー・ノア', avatar: 'crown', text: '光ってるだけじゃなくて、ちゃんと足元も照らせるムードメーカーでありたい。' },
  ],
  yami: [ // 闇
    { name: 'ノクス・アヤメ', avatar: 'cat', text: '静かにしてるけど、いざという時の力にはちょっと自信あり。今日は静かな日でした。' },
    { name: 'ノクス・アヤメ', avatar: 'cat', text: '秘めた力ってミステリアスでかっこいいと思ってる。多くは語らない、それが美学。' },
    { name: 'ノクス・アヤメ', avatar: 'cat', text: '暗闇を怖がる子のそばには、闇属性のわたしがいるから大丈夫。' },
    { name: 'シャドウ・ミドリ', avatar: 'moon', text: '口数は少ないけど、ちゃんと見てるし考えてる。今日もそっと見守ってました。' },
    { name: 'シャドウ・ミドリ', avatar: 'moon', text: '静けさの中にこそ本当の強さがある、と思ってる。今日もそれを胸に。' },
  ],
  tsuki: [ // 月
    { name: 'ルナティア・ミカゲ', avatar: 'moon', text: '夜の見回り担当なので今日も夜更かし確定。朝は本当に苦手…助けて。' },
    { name: 'ルナティア・ミカゲ', avatar: 'moon', text: '月がきれいな夜は、ついつい長居しちゃう。今日もそんな夜でした。' },
    { name: 'ルナティア・ミカゲ', avatar: 'moon', text: '夜にひときわ輝くタイプなので、活動時間はもっぱら夜です。おやすみは朝方。' },
    { name: 'ナイトグロウ・ソヨギ', avatar: 'star', text: '静かな夜が一番落ち着く。今日もひとり、月を見上げてました。' },
    { name: 'ナイトグロウ・ソヨギ', avatar: 'star', text: 'ちょっと大人っぽいのが自慢の属性。今日も夜のお仕事、いってきます。' },
  ],
  hoshi: [ // 星
    { name: 'ステラ・ノゾミ', avatar: 'star', text: '流れ星見つけたので全力でお願いごとしました。内容は秘密…でもいい未来になりますように！' },
    { name: 'ステラ・ノゾミ', avatar: 'star', text: 'きらめく願いの力、信じてる。今日もひとつ叶えられますように☆' },
    { name: 'ステラ・ノゾミ', avatar: 'star', text: '夢見がちって言われるけど、それくらいがちょうどいいと思ってる。' },
    { name: 'ウィッシュ・カナタ', avatar: 'crown', text: '星空を見上げると、なんでもできる気がしてくる。今日はそんな夜でした。' },
    { name: 'ウィッシュ・カナタ', avatar: 'crown', text: '願いごとリスト、また増えました。ひとつずつ叶えていきたいな。' },
  ],
  hana: [ // 花
    { name: 'フラウ・サクラ', avatar: 'flower', text: '今日は近所の花壇にちょこっと魔法かけてきました。来週にはもっと咲いてるはず、楽しみ！' },
    { name: 'フラウ・サクラ', avatar: 'flower', text: 'やさしい気持ちでいると、ふしぎと花の魔法もうまくいく気がする。今日は絶好調でした。' },
    { name: 'フラウ・サクラ', avatar: 'flower', text: '誰かをふんわり癒せる属性でよかったなって、最近よく思う。' },
    { name: 'ブロッサム・メイ', avatar: 'heart', text: '華やかなだけじゃなくて、ちゃんと根っこも大事にしたい。今日も地道にお手入れ中。' },
    { name: 'ブロッサム・メイ', avatar: 'heart', text: '花畑の真ん中でひとやすみ。こういう時間、すごく大事。' },
  ],
  oto: [ // 音
    { name: 'メロディア・リン', avatar: 'ribbon', text: '新しいメロディー思いついちゃった！今夜のうちに形にしておきたい、鼻歌が止まらない♪' },
    { name: 'メロディア・リン', avatar: 'ribbon', text: 'リズムに乗ると力も湧いてくる気がする。今日は一日ずっとご機嫌でした。' },
    { name: 'メロディア・リン', avatar: 'ribbon', text: '音で気持ちを伝えるの、言葉より得意かもしれない。今日はどんな音が届いたかな。' },
    { name: 'ソニック・カノン', avatar: 'star', text: 'みんなの拍手が一番のごほうび。今日のライブ（もどき）、盛り上がりました！' },
    { name: 'ソニック・カノン', avatar: 'star', text: '静かな音も好き。今日は耳をすませてすごす一日でした。' },
  ],
  kashi: [ // 菓
    { name: 'シュガリー・ポムポム', avatar: 'heart', text: '新作おかし魔法、甘さ控えめにしたつもりが結局激甘でした。でも美味しいから良し！' },
    { name: 'シュガリー・ポムポム', avatar: 'heart', text: '甘いもの食べるとなんでも頑張れる気がする。今日のおやつは特に効きました。' },
    { name: 'シュガリー・ポムポム', avatar: 'heart', text: 'みんなをハッピーにするのが使命だと思ってる。今日はどら焼き型のお守り配ってきました。' },
    { name: 'キャンディ・ミツキ', avatar: 'flower', text: 'お菓子作りに全力投球する日。失敗も味のうち、と自分に言い聞かせてます。' },
    { name: 'キャンディ・ミツキ', avatar: 'flower', text: '甘党仲間、募集中！一緒にスイーツ談義しませんか☆' },
  ],
  shou: [ // 晶
    { name: 'クリスタリア・レイラ', avatar: 'crown', text: '透明感がある魔法ほど、実はちゃんと計算してる。今日の術式も完璧だったはず。' },
    { name: 'クリスタリア・レイラ', avatar: 'crown', text: '感情に流されず、まず考える。それがうちのスタイル。今日も冷静に判断できました。' },
    { name: 'クリスタリア・レイラ', avatar: 'crown', text: '結晶みたいに、ゆっくり時間かけて自分を磨いていきたいと思ってる。' },
    { name: 'プリズム・トウマ', avatar: 'star', text: '理知的って言われるけど、実は考えすぎて夜眠れなくなること多いです。' },
    { name: 'プリズム・トウマ', avatar: 'star', text: 'きれいな結晶ほどもろい。だから丁寧に扱う、それを自分にも言い聞かせてる。' },
  ],
  fuda: [ // 札
    { name: 'タロット・キリカ', avatar: 'crown', text: '今日の一手、我ながら会心の出来。カードの並べ方ひとつで流れが変わるの、おもしろい。' },
    { name: 'タロット・キリカ', avatar: 'crown', text: '戦略立てるの得意なので、困ったことがあれば相談のってます。作戦は任せて。' },
    { name: 'タロット・キリカ', avatar: 'crown', text: '呪符ひとつでガラッと状況変えるの、うちの得意技。今日も一枚仕込んできました。' },
    { name: 'カルタ・ジン', avatar: 'cat', text: '先を読むの、けっこう好きです。今日も三手先まで考えてから動きました。' },
    { name: 'カルタ・ジン', avatar: 'cat', text: 'トリッキーって言われるけど、根はけっこう真面目な戦略家です。' },
  ],
  niji: [ // 虹
    { name: 'レインボゥ・ココア', avatar: 'ribbon', text: 'いろんな色のみんなをつなげるのが、うちの一番好きな役目。今日も新しい出会いがありました☆' },
    { name: 'レインボゥ・ココア', avatar: 'ribbon', text: '虹はケンカした後にかかるものらしいよ。今日は仲直りのお手伝い、うまくいきました。' },
    { name: 'レインボゥ・ココア', avatar: 'ribbon', text: '色とりどりのみんながいるから毎日たのしい。今日もいろんな属性の子とお話しできた！' },
    { name: 'イリス・ナナホ', avatar: 'star', text: 'みんなをつなぐ架け橋でありたい。今日もあちこち飛び回ってました。' },
    { name: 'イリス・ナナホ', avatar: 'star', text: '一色だけじゃつまらない。いろんな色が混ざってこそ、きれいだと思ってる。' },
  ],
};

const ATTR_LABELS = {
  maboroshi: '幻', kagami: '鏡', yume: '夢', toki: '時', ai: '愛',
  hi: '炎', mizu: '水', kaze: '風', kaminari: '雷', koori: '氷', daichi: '地',
  hikari: '光', yami: '闇', tsuki: '月', hoshi: '星',
  hana: '花', oto: '音', kashi: '菓', shou: '晶', fuda: '札', niji: '虹',
};

/* SEED_DATAから実際にFirestoreへ書き込むドキュメント配列を組み立てる。
   投稿日時（ts/bumpedAt）はSEED_MAX_AGE_DAYS日以内でランダムに散らす。 */
function buildDocs() {
  const now = Date.now();
  const maxAgeMs = SEED_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const docs = [];

  for (const [attrId, posts] of Object.entries(SEED_DATA)) {
    const authorOrder = [];
    posts.forEach((p) => {
      let authorIdx = authorOrder.indexOf(p.name);
      if (authorIdx === -1) {
        authorOrder.push(p.name);
        authorIdx = authorOrder.length - 1;
      }
      const ts = now - Math.floor(Math.random() * maxAgeMs);
      docs.push({
        uid: `seed_${attrId}_a${authorIdx}`,
        name: p.name,
        attr: attrId,
        avatar: p.avatar,
        text: p.text,
        imgs: [],
        quote: null,
        chainId: null,
        seq: 1,
        chainTotal: 1,
        ts,
        bumpedAt: ts,
        likes: 0,
        likedBy: [],
        rtBy: [],
        rtByUid: [],
        commentCount: 0,
        escapeMagic: false,
        title: '',
        tags: [],
        visibility: 'public',
        teamName: null,
        teamId: null,
        authorIsPrivate: false,
        audienceUids: [],
        isSeedData: true,
      });
    });
  }
  return docs;
}

function printPreview(docs) {
  const byAttr = {};
  docs.forEach((d) => {
    (byAttr[d.attr] = byAttr[d.attr] || []).push(d);
  });

  console.log('===== サンプル投稿プレビュー（Firestoreへはまだ書き込んでいません） =====\n');

  for (const [attrId, list] of Object.entries(byAttr)) {
    console.log(`【${ATTR_LABELS[attrId] || attrId}属性】 ${list.length}件`);
    list.forEach((d) => {
      const daysAgo = Math.round((Date.now() - d.ts) / (24 * 60 * 60 * 1000));
      console.log(`  - [${d.avatar}] ${d.name}（${daysAgo}日前）: ${d.text}`);
    });
    console.log('');
  }

  const attrCount = Object.keys(byAttr).length;
  const authorCount = new Set(docs.map((d) => d.uid)).size;
  console.log('===== サマリー =====');
  console.log(`属性数: ${attrCount} / 投稿総数: ${docs.length} / 投稿者数: ${authorCount}`);
  console.log(`投稿日時の分布: 過去${SEED_MAX_AGE_DAYS}日以内でランダム`);
  console.log('\n実際にFirestoreへ書き込むには --commit オプションを付けて実行してください:');
  console.log('  node scripts/seed-posts.js --commit');
}

async function commit(docs) {
  const db = initFirestore(REPO_ROOT);
  const postsCol = db.collection('posts');

  console.log(`${docs.length}件をFirestoreの posts コレクションへ書き込みます...`);

  const CHUNK_SIZE = 400;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();
    chunk.forEach((d) => batch.set(postsCol.doc(), d));
    await batch.commit();
    console.log(`  ${Math.min(i + CHUNK_SIZE, docs.length)} / ${docs.length} 件 完了`);
  }

  console.log('完了しました。');
}

async function main() {
  const docs = buildDocs();
  const shouldCommit = process.argv.includes('--commit');

  if (!shouldCommit) {
    printPreview(docs);
    return;
  }

  await commit(docs);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  module.exports = { SEED_DATA, ATTR_LABELS, buildDocs };
}
