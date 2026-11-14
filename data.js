// ドコモ料金データ（2026年12月1日以降の新規受付向け・税込・月額）
// 出典：ドコモ公式 https://www.docomo.ne.jp/charge/ 各プランページ、2026/9/25報道発表、/charge/plan_renewal2026/js/price.json
// 料金が変わったらこのファイルだけ直せば見積書に反映されます。
const DATA_AS_OF = "2026年12月1日改定後の料金（2026年11月確認）";

// count: みんなドコモ割の回線数に数える（音声プラン。キッズケータイ・データプランは数えない）
// family: みんなドコモ割 {2回線, 3回線以上} / dcard: dカードお支払割 {gold, general} / hikari: 光・home5Gセット割 / denki: でんきセット割 / choki: 長期利用割の対象
const PLANS = [
  { id: "max", count: true, name: "ドコモ MAX", group: "MAX",
    tiers: [{ label: "〜1GB", price: 5698 }, { label: "1GB超〜3GB", price: 6798 }, { label: "3GB超〜無制限", price: 8448 }],
    family: [550, 1210], dcard: [550, 220], hikari: 1210, denki: 110, choki: true, voice: "std", tokuten: 2 },
  { id: "poimax", count: true, name: "ドコモ ポイ活 MAX", group: "ポイ活",
    tiers: [{ label: "無制限", price: 11748 }], note: "ポイント還元 上限5,000pt",
    family: [550, 1210], dcard: [550, 220], hikari: 1210, denki: 110, choki: true, voice: "std", tokuten: 2 },
  { id: "poi20", count: true, name: "ドコモ ポイ活 20", group: "ポイ活",
    tiers: [{ label: "〜20GB", price: 7898 }, { label: "20GB超〜無制限", price: 9570 }], note: "ポイント還元 上限2,500pt",
    family: [550, 1210], dcard: [550, 220], hikari: 1210, denki: 110, choki: false, voice: "std" },
  { id: "mini2", count: true, name: "ドコモ mini2", group: "mini",
    tiers: [{ label: "〜6GB", price: 3278 }, { label: "6GB超〜12GB", price: 4598 }], note: "12GB超は月末まで128kbps",
    family: [550, 550], dcard: [550, 220], hikari: 1210, denki: 110, choki: false, voice: "std", senior60Kakeho: true },
  { id: "ahamo", count: true, name: "ahamo", group: "ahamo",
    tiers: [{ label: "40GB以下", price: 3135 }, { label: "40GB超〜60GB", price: 4125 }, { label: "60GB超〜120GB", price: 5115 }], note: "5分以内の国内通話無料つき",
    family: null, dcard: null, hikari: 0, denki: 0, choki: false, voice: "ahamo" },
  { id: "u15", count: true, name: "ドコモ スマホデビュープラン U15", group: "特殊",
    tiers: [{ label: "〜5GB", price: 2508 }, { label: "5GB超〜20GB", price: 3278 }], note: "利用者5〜15歳",
    family: null, dcard: [550, 220], hikari: 0, denki: 0, choki: false, voice: "std", oyako: [1100, 1870] },
  { id: "keitai2", count: true, name: "ケータイプラン２", group: "特殊",
    tiers: [{ label: "100MB", price: 1617 }], family: null, dcard: [187, 187], hikari: 0, denki: 0, choki: false, voice: "std" },
  { id: "kids3", count: false, name: "キッズケータイプラン３", group: "特殊",
    tiers: [{ label: "-", price: 660 }], family: null, dcard: null, hikari: 0, denki: 0, choki: false, voice: "none" },
  { id: "dataplus", count: false, name: "5Gデータプラス（タブレット等）", group: "特殊",
    tiers: [{ label: "データシェア", price: 1210 }], family: null, dcard: null, hikari: 0, denki: 0, choki: false, voice: "none" },
];

// 年齢で使える割引（2026/11/14 ドコモ公式で確認）。plans: プランid → データ量の段階ごとの割引額（税込）
// ボーナスパケット27GB付き：〜1GBの料金で28GBまで、〜3GBの料金で30GBまで使える
const AGE_GROUPS = [
  { id: "none", name: "指定なし" }, { id: "u22", name: "22歳以下" }, { id: "u29", name: "23〜29歳" }, { id: "s60", name: "60歳以上" },
];
const AGE_DISCOUNTS = {
  u22: { name: "ドコモU22割", months: 7, plans: { max: [2728, 3828, 550] }, note: "ボーナス27GB付き（〜1GBの料金で28GB／〜3GBの料金で30GBまで）。同じ利用者で1回線のみ" },
  u29: { name: "ドコモU29割", months: 3, plans: { max: [2728, 3828, 550] }, note: "ボーナス27GB付き（〜1GBの料金で28GB／〜3GBの料金で30GBまで）。同じ利用者で1回線のみ" },
  s60: { name: "ドコモ MAX 60歳以上割", months: 3, plans: { max: [1870, 2970, 550] }, note: "ボーナス27GB付き（〜1GBの料金で28GB／〜3GBの料金で30GBまで）" },
};
// mini2 は60歳以上でかけ放題が990円（AGE s60 で自動）
const SENIOR60_KAKEHO = 990;

// ハーティ割引（障がい者割引）。plans: 基本料からの割引額。みんなドコモ割・dカードお支払割とは併用できない。
// 出典：https://www.docomo.ne.jp/charge/discount/hearty/about/ （mini2・ahamo は記載なし＝対象外として扱う）
const HEARTY = {
  plans: { max: 1980, poimax: 1980, poi20: 1980, u15: 770 },
  voice: { "5min": 0, kakeho: 1100 },   // 通話オプションの割引後の金額
  jimuFree: true,                       // 契約事務手数料が無料
};

const VOICE = {
  std: [{ id: "none", name: "なし（22円/30秒）", price: 0 }, { id: "5min", name: "5分通話無料", price: 880 }, { id: "kakeho", name: "かけ放題", price: 1980 }],
  ahamo: [{ id: "none", name: "5分無料（標準）", price: 0 }, { id: "kakeho", name: "かけ放題", price: 1100 }],
  none: [{ id: "none", name: "-", price: 0 }],
};

// 月額オプション。plans＝申し込めるプラン（ここに無いプランを選ぶと画面に出ない）
// 出典：ドコモ公式の各サービスページ・ahamo.com/services/（2026/11/14確認）
const P_ALL = ["max", "poimax", "poi20", "mini2", "ahamo", "u15", "keitai2"];
const P_DOCOMO = ["max", "poimax", "poi20", "mini2", "u15", "keitai2"];
const P_SMART = ["max", "poimax", "poi20", "mini2", "ahamo", "u15", "dataplus"];
const OPTION_GROUPS = ["メール・通話", "補償・あんしん", "動画・サブスク", "ahamo", "みんスマ"];
const OPTIONS = [
  // メール・通話
  { id: "mailopt", group: "メール・通話", name: "ドコモメールオプション", price: 330, plans: ["mini2"], need: "mini2でドコモメールを使うなら必要（プラン変更と同時に申込まないとアドレスが消える）" },
  { id: "mailmotihakobi", group: "メール・通話", name: "ドコモメール持ち運び", price: 330, plans: ["ahamo"], need: "ahamoでドコモメールを使うなら必要（ahamoへの変更と同時のみ申込可）" },
  { id: "rusuden", group: "メール・通話", name: "留守番電話", price: 330, plans: P_ALL, freeWithVoice: true },
  { id: "catch", group: "メール・通話", name: "キャッチホン", price: 220, plans: P_ALL, freeWithVoice: true },
  { id: "melody", group: "メール・通話", name: "メロディコール", price: 110, plans: ["max", "poimax", "poi20", "u15", "keitai2"] },
  { id: "optpack", group: "メール・通話", name: "オプションパック（留守電・キャッチ・メロディ・転送）", price: 440, plans: ["max", "poimax", "poi20", "u15", "keitai2"] },
  // 補償・あんしん
  { id: "smartpack", group: "補償・あんしん", name: "smartあんしんパック", input: true, hint: "792〜3,342円", plans: P_DOCOMO },
  { id: "hosho", group: "補償・あんしん", name: "smartあんしん補償", input: true, hint: "330〜2,880円", plans: P_ALL },
  { id: "keitaihosho", group: "補償・あんしん", name: "ケータイ補償サービス（2022/8以前の機種）", input: true, hint: "363〜1,100円", plans: P_ALL },
  { id: "anshinmobile", group: "補償・あんしん", name: "あんしんパック モバイル", input: true, hint: "825〜1,562円", plans: P_ALL },
  { id: "security", group: "補償・あんしん", name: "あんしんセキュリティ", price: 220, plans: P_ALL },
  { id: "enkaku", group: "補償・あんしん", name: "あんしん遠隔サポート", price: 660, plans: P_ALL },
  { id: "imadoko", group: "補償・あんしん", name: "イマドコサーチ（見守る側）", price: 330, plans: P_ALL },
  // 動画・サブスク（tokuten＝MAX・ポイ活MAXの「選べる特典」対象。2つまで0円）
  { id: "lemino", group: "動画・サブスク", name: "Lemino プレミアム", price: 1540, plans: P_ALL, tokuten: true },
  { id: "danime", group: "動画・サブスク", name: "dアニメストア", price: 660, plans: P_ALL, tokuten: true },
  { id: "dazn", group: "動画・サブスク", name: "DAZN for docomo", price: 4200, plans: P_ALL, tokuten: true },
  { id: "dvalue", group: "動画・サブスク", name: "dバリューパス", price: 550, plans: P_ALL },
  { id: "dvaluepack", group: "動画・サブスク", name: "dバリューパスパック", price: 682, plans: P_ALL },
  { id: "amazon", group: "動画・サブスク", name: "Amazonプライム", price: 600, plans: P_ALL, promo: { max: 6, poimax: 6, mini2: 3 }, promoAmt: 600 },
  { id: "disney", group: "動画・サブスク", name: "Disney+", plans: P_ALL, choices: [{ l: "スタンダード", p: 1250 }, { l: "プレミアム", p: 1670 }] },
  { id: "netflix", group: "動画・サブスク", name: "Netflix", plans: P_ALL, choices: [{ l: "広告つき", p: 890 }, { l: "スタンダード", p: 1590 }, { l: "プレミアム", p: 2290 }] },
  // ahamo
  { id: "ahamopoi", group: "ahamo", name: "ahamo ポイ活オプション", price: 2200, plans: ["ahamo"] },
  // みんスマ商材
  { id: "connect", group: "みんスマ", name: "コネクトα", plans: P_SMART, choices: [{ l: "Plus", p: 550 }, { l: "PLATINUM", p: 870 }, { l: "PLATINUM", p: 1280 }] },
  { id: "rakuraku", group: "みんスマ", name: "らくらくバックアップ", plans: P_SMART, choices: [{ l: "", p: 550 }, { l: "Premium", p: 880 }] },
  { id: "adblock", group: "みんスマ", name: "広告ブロック", plans: P_SMART, choices: [{ l: "", p: 330 }, { l: "Pro", p: 550 }, { l: "Premium", p: 880 }] },
  { id: "tentou", group: "みんスマ", name: "あんしん店頭サポート", plans: P_SMART, choices: [{ l: "", p: 550 }, { l: "", p: 990 }] },
];

// プランに最初から含まれているもの（オプション欄の上に表示）
const PLAN_INCLUDES = {
  max: "ドコモメール・spモード込み。選べる特典（Lemino・dアニメストア・DAZN・NBAから毎月2つ0円）",
  poimax: "ドコモメール・spモード込み。選べる特典（Lemino・dアニメストア・DAZN・NBAから毎月2つ0円）",
  poi20: "ドコモメール・spモード込み",
  mini2: "ドコモメールは「ドコモメールオプション（330円）」が必要",
  ahamo: "5分以内の国内通話無料込み。ドコモメールは「ドコモメール持ち運び（330円）」が必要。転送でんわ・メロディコールは使えない",
  u15: "ドコモメール・spモード込み",
  keitai2: "spモード込み",
  kids3: "家族間通話無料。ドコモメール・ブラウザは使えない",
  dataplus: "ペア回線（同じ名義）が必要。音声通話は使えない",
};

// 初期費用（店頭）
const INITIAL = [
  { id: "jimu", name: "契約事務手数料（翌月請求）", price: 4950, auto: true },
  { id: "iko", name: "データ移行（当日・翌月請求）", price: 2200 },
  { id: "ikomini", name: "データ移行mini（当日・翌月請求）", price: 1100 },
  { id: "support", name: "店頭サポート", price: 3300 },
  { id: "film", name: "フィルム", input: true },
  { id: "case", name: "ケース", input: true },
  { id: "charger", name: "充電器", input: true },
  { id: "coat", name: "コーティング", input: true },
];

const STORES = ["ドコモショップ平針店", "ドコモショップ刈谷店", "ドコモショップららぽーと名古屋みなとアクルス店", "ドコモショップイオンタウン名西店", "ドコモショップMEGAドン・キホーテUNY小牧店"];

const CONTRACTS = [
  { id: "mnp", name: "のりかえ（MNP）" }, { id: "shinki", name: "新規" }, { id: "kihen", name: "機種変更" }, { id: "plan", name: "プラン変更のみ" },
];
