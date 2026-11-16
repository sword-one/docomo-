// ドコモ料金データ（2026年12月1日以降の新規受付向け・税込・月額）
// 出典：ドコモ公式 https://www.docomo.ne.jp/charge/ 各プランページ、2026/9/25報道発表、/charge/plan_renewal2026/js/price.json
// 料金が変わったらこのファイルだけ直せば見積書に反映されます。
const DATA_AS_OF = "2026年12月1日改定後の料金（2026年11月確認）";

// count: みんなドコモ割の回線数に数える（音声プラン。キッズケータイ・データプランは数えない）
// family: みんなドコモ割 {2回線, 3回線以上} / dcard: dカードお支払割 {gold, general} / hikari: 光・home5Gセット割 / denki: でんきセット割 / choki: 長期利用割の対象
const PLANS = [
  { id: "max", logo: "https://www.docomo.ne.jp/flcache_data/charge/index/logo_docomo_max.png", color: "#cc0033", count: true, name: "ドコモ MAX", group: "MAX",
    tiers: [{ label: "〜1GB", price: 5698 }, { label: "1GB超〜3GB", price: 6798 }, { label: "3GB超〜無制限", price: 8448 }],
    family: [550, 1210], dcard: [550, 220], hikari: 1210, denki: 110, choki: true, voice: "std", tokuten: 2 },
  { id: "poimax", logo: "https://www.docomo.ne.jp/flcache_data/charge/index/logo_docomo_poikatsu_max.png", color: "#bc9500", count: true, name: "ドコモ ポイ活 MAX", group: "ポイ活",
    tiers: [{ label: "無制限", price: 11748 }], note: "ポイント還元 上限5,000pt",
    family: [550, 1210], dcard: [550, 220], hikari: 1210, denki: 110, choki: true, voice: "std", tokuten: 2 },
  { id: "poi20", logo: "https://www.docomo.ne.jp/flcache_data/charge/index/logo_docomo_poikatsu_20.png", color: "#bc9500", count: true, name: "ドコモ ポイ活 20", group: "ポイ活",
    tiers: [{ label: "〜20GB", price: 7898 }, { label: "20GB超〜無制限", price: 9570 }], note: "ポイント還元 上限2,500pt",
    family: [550, 1210], dcard: [550, 220], hikari: 1210, denki: 110, choki: false, voice: "std" },
  { id: "mini2", logo: "https://www.docomo.ne.jp/flcache_data/charge/docomo_mini2/images/logo_two_step_plan.svg", color: "#0068b7", count: true, name: "ドコモ mini2", group: "mini",
    tiers: [{ label: "〜6GB", price: 3278 }, { label: "6GB超〜12GB", price: 4598 }], note: "12GB超は月末まで128kbps",
    family: [550, 550], dcard: [550, 220], hikari: 1210, denki: 110, choki: false, voice: "std", senior60Kakeho: true },
  { id: "ahamo", logo: "https://www.docomo.ne.jp/flcache_data/charge/index/logo_ahamo.png", color: "#040000", count: true, name: "ahamo", group: "ahamo",
    tiers: [{ label: "40GB以下", price: 3135 }, { label: "40GB超〜60GB", price: 4125 }, { label: "60GB超〜120GB", price: 5115 }], note: "5分以内の国内通話無料つき",
    family: null, dcard: null, hikari: 0, denki: 0, choki: false, voice: "ahamo" },
  { id: "u15", color: "#cc0033", count: true, name: "ドコモ スマホデビュープラン U15", group: "特殊",
    tiers: [{ label: "〜5GB", price: 2508 }, { label: "5GB超〜20GB", price: 3278 }], note: "利用者5〜15歳",
    family: null, dcard: [550, 220], hikari: 0, denki: 0, choki: false, voice: "std", oyako: [1100, 1870] },
  { id: "keitai2", color: "#555555", count: true, name: "ケータイプラン２", group: "特殊",
    tiers: [{ label: "100MB", price: 1617 }], family: null, dcard: [187, 187], hikari: 0, denki: 0, choki: false, voice: "std" },
  { id: "kids3", color: "#e58a00", count: false, name: "キッズケータイプラン３", group: "特殊",
    tiers: [{ label: "-", price: 660 }], family: null, dcard: null, hikari: 0, denki: 0, choki: false, voice: "none" },
  { id: "dataplus", color: "#555555", count: false, name: "5Gデータプラス（タブレット等）", group: "特殊",
    tiers: [{ label: "データシェア", price: 1210 }], family: null, dcard: null, hikari: 0, denki: 0, choki: false, voice: "none" },
  // ===== 旧プラン（新規受付は終了。機種変更などで今のプランを続ける方向け）=====
  // 料金は 2026/12/1 改定後（公式の改定表 /charge/plan_renewal2026/js/price.json）。割引は各プランの提供条件書・公式の割引ページで確認（2026/11/16）。
  // hikari は段階ごとに額が違うプランは配列。noDiscTiers＝その段階は dカードお支払割なし・家族の回線数にも数えない。optLike＝オプションの出し方を合わせるプラン
  { id: "eximo", legacy: true, color: "#b97850", count: true, name: "eximo", group: "旧プラン",
    tiers: [{ label: "〜1GB", price: 5115 }, { label: "1GB超〜3GB", price: 6215 }, { label: "3GB超〜無制限", price: 7865 }],
    family: [550, 1100], dcard: [187, 187], hikari: 1100, denki: 0, choki: false, voice: "std", optLike: "max" },
  { id: "eximo_poikatsu", legacy: true, color: "#b97850", count: true, name: "eximo ポイ活", group: "旧プラン",
    tiers: [{ label: "無制限", price: 11165 }], note: "ポイント還元 上限5,000pt",
    family: [550, 1100], dcard: [187, 187], hikari: 1100, denki: 0, choki: false, voice: "std", optLike: "max" },
  { id: "irumo", legacy: true, logo: "https://cache.irumo.cilite.docomo.ne.jp/assets/images/common/logo.svg", color: "#00b496", count: true, name: "irumo", group: "旧プラン",
    tiers: [{ label: "0.5GB", price: 660 }, { label: "3GB", price: 2497 }, { label: "6GB", price: 3157 }, { label: "9GB", price: 3707 }], note: "0.5GBは割引なし・家族の回線数にも数えません",
    family: null, dcard: [187, 187], hikari: [0, 1100, 1100, 1100], denki: 0, choki: false, voice: "std", noDiscTiers: [0], optLike: "mini2" },
  { id: "mini", legacy: true, logo: "https://www.docomo.ne.jp/flcache_data/charge/index/logo_docomo_mini.png", color: "#0068b7", count: true, name: "ドコモ mini", group: "旧プラン",
    tiers: [{ label: "4GB", price: 2750 }, { label: "10GB", price: 3850 }], note: "2026/11/30で新規受付終了。4GB⇔10GBの変更も12/1以降はできません",
    family: null, dcard: [550, 220], hikari: 1210, denki: 110, choki: false, voice: "std", optLike: "mini2" },
  { id: "giga5g", legacy: true, color: "#333333", count: true, name: "5Gギガホ", group: "旧プラン",
    tiers: [{ label: "無制限", price: 8965 }],
    family: [550, 1100], dcard: [187, 187], hikari: 1100, denki: 0, choki: false, voice: "std", optLike: "max" },
  { id: "gigapremier5g", legacy: true, color: "#333333", count: true, name: "5Gギガホ プレミア", group: "旧プラン",
    tiers: [{ label: "〜3GB", price: 6215 }, { label: "3GB超〜無制限", price: 7865 }],
    family: [550, 1100], dcard: [187, 187], hikari: 1100, denki: 0, choki: false, voice: "std", optLike: "max" },
  { id: "gigalite5g", legacy: true, color: "#333333", count: true, name: "5Gギガライト", group: "旧プラン",
    tiers: [{ label: "〜1GB", price: 3795 }, { label: "1GB超〜3GB", price: 4895 }, { label: "3GB超〜5GB", price: 5995 }, { label: "5GB超〜7GB", price: 7095 }],
    family: [550, 1100], dcard: [187, 187], hikari: [0, 550, 1100, 1100], denki: 0, choki: false, voice: "std", optLike: "max" },
  { id: "hajimete", legacy: true, color: "#e4007f", count: true, name: "はじめてスマホプラン", group: "旧プラン",
    tiers: [{ label: "1GB", price: 2090 }], note: "5分以内の国内通話無料つき。はじめてスマホ割（▲550円・最大12か月）が適用中の方は、手入力のオプション欄にマイナスで入れてください",
    family: null, dcard: [187, 187], hikari: 0, denki: 0, choki: false, voice: "hajimete", autoDisc: [["はじめてスマホISP割", 165]], optLike: "u15" },
  { id: "u15hajimete", legacy: true, color: "#e4007f", count: true, name: "U15はじめてスマホプラン", group: "旧プラン",
    tiers: [{ label: "5GB", price: 2090 }, { label: "10GB", price: 3190 }], note: "5分以内の国内通話無料つき",
    family: null, dcard: [187, 187], hikari: 0, denki: 0, choki: false, voice: "hajimete", autoDisc: [["U15はじめてスマホISP割", 165]], optLike: "u15" },
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

// ハーティ割引（障がい者割引）。plans: 基本料からの割引額。みんなドコモ割・dカードお支払割・オプションパック割引とは併用できない。
// 出典：https://www.docomo.ne.jp/charge/discount/hearty/about/ ・提供条件書 hearty.pdf・charge_plan2.pdf（ahamo は対象外と明記）
const HEARTY = {
  plans: { max: 1980, poimax: 1980, poi20: 1980, u15: 770, keitai2: 407,
    eximo: 1507, eximo_poikatsu: 1507, giga5g: 1507, gigapremier5g: 1507, gigalite5g: 1507, hajimete: 572, u15hajimete: 572 },   // 旧プラン（はじめてスマホ系は基本374＋ISP198。ISP割とは併用不可）
  check: {   // 対象かもしれないが金額が確定できないもの（計算に入れず「要確認」と表示）
    mini2: "mini2がハーティ割引の対象かは公式に記載なし。店頭で確認",
    dataplus: "5Gデータプラスは対象だが、公式資料で割引額が食い違う（22円／220円）ため店頭で確認",
  },
  planNote: { keitai2: "ケータイプラン2の407円は12/1改定前の額（改定後の額は未発表）" },
  service: { rusuden: 132, catch: 88, melody: 44, imadoko: 132, dvaluepack: 616 },   // サービス料金60%引きの後の額
  noOptions: ["optpack"],          // オプションパック割引は併用不可
  initFree: ["support"],           // 初期設定サポート無料
  voice: { "5min": 0, kakeho: 1100 },   // 通話オプションの割引後の金額
  jimuFree: true,                       // 契約事務手数料が無料
};

// 子育てサポート割引（ひとり親世帯など）。plans: 基本料からの割引額（ケータイプラン2は基本料の割引なし・通話オプションのみ）
// 通話オプション（5分通話無料・かけ放題）を契約していれば、さらに880円引き。みんなドコモ割とは併用できない（ハーティ割引が優先）。
// 出典：https://www.docomo.ne.jp/charge/kosodate_wari/ ・提供条件書 docomo_max.pdf／charge_plan2.pdf（mini・ahamoは対象外）
const KOSODATE = {
  plans: { max: 1210, poimax: 1210, poi20: 1210, keitai2: 0, eximo: 1100, eximo_poikatsu: 1100, giga5g: 1100, gigapremier5g: 1100, gigalite5g: 1100 },
  voiceOff: 880,
  cond: "ひとり親世帯など（児童扶養手当受給者証・戸籍謄本などで確認）。契約者1人につき1回線。お子さまが18歳になって最初の3月31日まで",
};

// dカード（2026/11/15 dカード公式で確認）。rate＝ドコモ利用料金1,000円（税抜）ごとのポイント還元率
// 対象は割引後の基本料・通話料など。端末代金・事務手数料などは対象外。ドコモ mini2・ahamo の料金は対象外。
// ※公式に「2026年12月以降、還元率・年会費などを見直し中」の記載あり → 変わったらここを直す
const DCARD = {
  general: { name: "dカード", short: "dカード", rate: 0.01, fee: 0, off: 1 },
  goldu: { name: "dカード GOLD U", short: "GOLD U", rate: 0.05, fee: 3300, off: 0, feeNote: "22歳以下・年30万円以上の利用などで実質無料" },
  gold: { name: "dカード GOLD", short: "GOLD", rate: 0.10, fee: 11000, off: 0 },
  platinum: { name: "dカード PLATINUM", short: "PLATINUM", rate: 0.20, fee: 29700, off: 0, rateNote: "20%は入会初年度。2年目以降はカードのご利用額で10〜20%（月20万円以上20%／10万円以上15%／10万円未満10%）" },
};
const DCARD_NO_POINT = ["mini2", "ahamo", "mini", "irumo"];   // 料金へのポイント還元が対象外のプラン
// ポイ活プランの還元（d払い・dカードでのお買い物に対して。期間・用途限定ポイント）。rates＝お買い物額に対する還元率％
const POIKATSU = {
  poimax: { cap: 5000, rates: { none: 3, general: 3, goldu: 5, gold: 5, platinum: 10 } },
  poi20: { cap: 2500, rates: { none: 1, general: 1, goldu: 2, gold: 2, platinum: 5 } },
};

const VOICE = {
  std: [{ id: "none", name: "なし（22円/30秒）", price: 0 }, { id: "5min", name: "5分通話無料", price: 880 }, { id: "kakeho", name: "かけ放題", price: 1980 }],
  ahamo: [{ id: "none", name: "5分無料（標準）", price: 0 }, { id: "kakeho", name: "かけ放題", price: 1100 }],
  hajimete: [{ id: "none", name: "5分無料（標準）", price: 0 }, { id: "kakeho", name: "かけ放題", price: 1100 }],
  none: [{ id: "none", name: "-", price: 0 }],
};

// 月額オプション。plans＝申し込めるプラン（ここに無いプランを選ぶと画面に出ない）
// 2026/11/14 公式（docomo.ne.jp 各サービスページ・各プランの提供条件書・ahamo.com）で項目ごとに検証済み。
// pnote＝プラン別の注意（画面のオプション名の下に出る）。公式に明記が無く推定のものは「公式未記載」と書く。
const P_ALL = ["max", "poimax", "poi20", "mini2", "ahamo", "u15", "keitai2"];
const P_PHONE = ["max", "poimax", "poi20", "mini2", "ahamo", "u15"];   // スマホのプラン
const P_SMART = ["max", "poimax", "poi20", "mini2", "ahamo", "u15", "dataplus"];
const KEITAI_VIDEO = "ケータイ（ガラケー）で視聴できるかは公式に記載なし。要確認";
const OPTION_GROUPS = ["メール・通話", "補償・あんしん", "動画・サブスク", "ドコモのサービス", "ahamo", "みんスマ"];
// よく案内するオプション（いつも表示）。それ以外は「その他のオプション」を開くと出る
const MAIN_OPTIONS = ["mailopt", "mailmotihakobi", "rusuden", "catch", "smartpack", "hosho", "security", "ahamopoi", "connect", "rakuraku", "adblock", "tentou"];
const OPTIONS = [
  // ---- メール・通話 ----
  { id: "mailopt", group: "メール・通話", name: "ドコモメールオプション", price: 330, plans: ["mini2"],
    need: "mini2でドコモメールを使うなら必要（プラン変更と同時に申し込まないとアドレスが消える）" },
  { id: "mailmotihakobi", group: "メール・通話", name: "ドコモメール持ち運び", price: 330, plans: ["ahamo"],
    need: "ahamoでドコモメールを使うなら必要。ドコモからahamoへ変える時は、変更と同時にしか申し込めない" },
  { id: "rusuden", group: "メール・通話", name: "留守番電話", price: 330, plans: P_ALL, freeWithVoice: true,
    pnote: { ahamo: "ahamoは2026/2/25から利用可。かけ放題に入っても割引なし", mini2: "mini2は通話オプションとの割引が公式未記載のため割引なしで計算（ドコモminiは割引あり）。店頭で確認" }, noVoiceFree: ["mini2", "irumo"] },
  { id: "catch", group: "メール・通話", name: "キャッチホン", price: 220, plans: P_ALL, freeWithVoice: true,
    pnote: { ahamo: "ahamoは2026/2/25から利用可。かけ放題に入っても割引なし", mini2: "mini2は通話オプションとの割引が公式未記載のため割引なしで計算（ドコモminiは割引あり）。店頭で確認" }, noVoiceFree: ["mini2", "irumo"] },
  { id: "melody", group: "メール・通話", name: "メロディコール", price: 110, plans: ["max", "poimax", "poi20", "u15", "keitai2"], need: "通話オプションに入っても割引なし（割引は留守電・キャッチだけ）。初回31日間無料。曲ごとの音源利用料は別" },
  { id: "optpack", group: "メール・通話", name: "オプションパック（留守電・キャッチ・メロディ・転送）", price: 440, plans: ["max", "poimax", "poi20", "u15", "keitai2"], packWithVoice: 110 },
  // ---- 補償・あんしん ----
  { id: "smartpack", group: "補償・あんしん", name: "smartあんしんパック", input: true, hint: "792〜3,342円", plans: ["max", "poimax", "poi20", "mini2", "ahamo", "u15", "dataplus"],
    need: "2022/9/15以降発売の機種。補償＋セキュリティ＋遠隔サポートのセット", pnote: { ahamo: "ahamoはWeb（オンライン）手続きのみ" } },
  { id: "hosho", group: "補償・あんしん", name: "smartあんしん補償", input: true, hint: "330〜2,880円", plans: ["max", "poimax", "poi20", "mini2", "ahamo", "u15", "keitai2", "kids3", "dataplus"],
    need: "2022/9/15以降発売の機種。店頭では機種購入当日のみ申込可（14日以内なら補償センターへ電話）", pnote: { kids3: "キッズケータイは機種により補償の種類・料金が違う（公式の月額料金検索で確認）" } },
  { id: "keitaihosho", group: "補償・あんしん", name: "ケータイ補償サービス", input: true, hint: "363〜1,100円", plans: ["max", "poimax", "poi20", "mini2", "ahamo", "u15", "keitai2", "kids3", "dataplus"],
    need: "2022/8/31以前に発売された機種を買う時だけ入れる", pnote: { kids3: "キッズケータイは機種により補償の種類・料金が違う（公式の月額料金検索で確認）" } },
  { id: "anshinmobile", group: "補償・あんしん", name: "あんしんパック モバイル", input: true, hint: "825〜1,562円", plans: ["max", "poimax", "poi20", "mini2", "ahamo", "u15", "dataplus"],
    need: "ケータイ補償サービスに入る人だけ（2022/8/31以前発売の機種）" },
  { id: "security", group: "補償・あんしん", name: "あんしんセキュリティ", plans: ["max", "poimax", "poi20", "mini2", "ahamo", "u15", "keitai2"],
    choices: [{ l: "", p: 220 }, { l: "スタンダード", p: 550 }, { l: "詐欺対策プラス", p: 999 }, { l: "トータル詐欺対策プラス", p: 1815 }],
    pnote: { ahamo: "迷惑メール対策を使うにはドコモメール持ち運びが必要", keitai2: "ケータイは迷惑電話・迷惑メール対策のみ。補償に入っていると110円" } },
  { id: "enkaku", group: "補償・あんしん", name: "あんしん遠隔サポート", price: 660, plans: ["max", "poimax", "poi20", "mini2", "ahamo", "u15"] },
  { id: "imadoko", group: "補償・あんしん", name: "イマドコサーチ（見守る側が払う）", price: 330, plans: P_ALL, need: "見守る側の回線で申し込む。初回31日間無料" },
  // ---- 動画・サブスク（tokuten＝MAX・ポイ活MAXの「選べる特典」。月額の高い2つが0円） ----
  { id: "lemino", group: "動画・サブスク", name: "Lemino プレミアム", price: 1540, plans: P_ALL, tokuten: true, pnote: { keitai2: KEITAI_VIDEO } },
  { id: "danime", group: "動画・サブスク", name: "dアニメストア", price: 660, plans: P_ALL, tokuten: true, pnote: { keitai2: KEITAI_VIDEO } },
  { id: "dazn", group: "動画・サブスク", name: "DAZN for docomo", price: 4200, plans: P_ALL, tokuten: true, pnote: { keitai2: KEITAI_VIDEO } },
  { id: "nba", group: "動画・サブスク", name: "NBA docomo", price: 2728, plans: P_ALL, tokuten: true, pnote: { keitai2: KEITAI_VIDEO } },
  { id: "dvalue", group: "動画・サブスク", name: "dバリューパス", price: 550, plans: P_ALL },
  { id: "dvaluepack", group: "動画・サブスク", name: "dバリューパスパック", price: 682, plans: P_ALL, hint2: "CHARGESPOT使い放題は2026/12/31まで（2027/1/5から毎月1,000円クーポン2枚）" },
  { id: "amazon", group: "動画・サブスク", name: "Amazonプライム", price: 600, plans: P_ALL,
    promo: { max: 6, poimax: 6, poi20: 6, mini2: 3, ahamo: 3, u15: 3 }, promoAmt: 600, pnote: { keitai2: "ケータイでの特典の対象かは公式に記載なし。要確認" },
    promoNote: "ドコモから初めて登録する場合。割引が終わった後は登録中毎月120pt" },
  { id: "disney", group: "動画・サブスク", name: "Disney+", plans: P_ALL, choices: [{ l: "スタンダード", p: 1250 }, { l: "プレミアム", p: 1670 }],
    promo: { max: 3, poimax: 3, poi20: 3, ahamo: 3 }, promoAmt: 1250, promoNote: "セット割はエントリーが必要", pnote: { keitai2: KEITAI_VIDEO } },
  { id: "netflix", group: "動画・サブスク", name: "Netflix", plans: P_ALL, choices: [{ l: "広告つき", p: 890 }, { l: "スタンダード", p: 1590 }, { l: "プレミアム", p: 2290 }], pnote: { keitai2: KEITAI_VIDEO } },
  // ---- ドコモのサービス（2026/11/15 公式で確認。ケータイプランは公式に記載が無いものは出さない） ----
  { id: "dmagazine", group: "ドコモのサービス", name: "dマガジン", price: 580, plans: P_PHONE, need: "初回31日間無料" },
  { id: "dhealthcare", group: "ドコモのサービス", name: "dヘルスケア（有料プラン）", price: 440, plans: P_PHONE, need: "初回31日間無料（App Store・Google Play経由は480円・無料期間なし）" },
  { id: "dphoto", group: "ドコモのサービス", name: "dフォト（プリントサービス）", price: 594, plans: P_PHONE, need: "初回31日間無料", pnote: { ahamo: "ahamoで写真お預かりを使うには、これかクラウド容量オプションが必要", mini2: "mini系で写真お預かりを使うには、これかクラウド容量オプションが必要（ドコモminiの記載）" } },
  { id: "cloud", group: "ドコモのサービス", name: "クラウド容量オプション", plans: [...P_PHONE, "keitai2"], choices: [{ l: "+10GB", p: 110 }, { l: "+25GB", p: 275 }, { l: "+50GB", p: 440 }], need: "初回最大31日間無料。データ保管BOX・dフォトの容量を追加" },
  { id: "mydaiz", group: "ドコモのサービス", name: "my daiz（有料）", price: 110, plans: P_PHONE, need: "初回31日間無料（無料版もあり）" },
  { id: "dhits", group: "ドコモのサービス", name: "dヒッツ", price: 690, plans: P_PHONE },
  { id: "youtube", group: "ドコモのサービス", name: "YouTube Premium（ドコモ経由）", price: 1280, plans: P_PHONE, need: "個人プラン。初回31日間無料" },
  { id: "spotify", group: "ドコモのサービス", name: "Spotify Premium（ドコモ経由）", price: 1080, plans: P_PHONE, need: "初めての方は3か月割引の特典あり（見積には入れていません）" },
  { id: "googleone", group: "ドコモのサービス", name: "Google One（ドコモ経由）", plans: P_PHONE, choices: [{ l: "ベーシック", p: 290 }, { l: "スタンダード", p: 440 }, { l: "AI Plus 2TB", p: 1450 }], need: "金額はahamoの公式ページの記載" },
  { id: "appleone", group: "ドコモのサービス", name: "Apple One（ドコモ経由）", plans: P_PHONE, choices: [{ l: "個人", p: 1350 }, { l: "ファミリー", p: 2500 }], need: "金額はahamoの公式ページの記載" },
  { id: "jump", group: "ドコモのサービス", name: "デジタル版 週刊少年ジャンプ", price: 980, plans: P_PHONE, need: "金額はahamoの公式ページの記載" },
  { id: "djob", group: "ドコモのサービス", name: "dジョブ スマホワーク", price: 330, plans: P_PHONE, need: "初回31日間無料。金額はahamoの公式ページの記載" },
  // ---- ahamo ----
  { id: "ahamopoi", group: "ahamo", name: "ahamo ポイ活オプション", price: 2200, plans: ["ahamo"], need: "12/1から大盛りオプションへの加入は不要。最大4,000pt還元" },
  // ---- みんスマ商材 ----
  { id: "connect", group: "みんスマ", name: "コネクトα", plans: P_SMART, choices: [{ l: "Plus", p: 550 }, { l: "PLATINUM", p: 870 }, { l: "PLATINUM", p: 1280 }] },
  { id: "rakuraku", group: "みんスマ", name: "らくらくバックアップ", plans: P_SMART, choices: [{ l: "", p: 550 }, { l: "Premium", p: 880 }] },
  { id: "adblock", group: "みんスマ", name: "広告ブロック", plans: P_SMART, choices: [{ l: "", p: 330 }, { l: "Pro", p: 550 }, { l: "Premium", p: 880 }] },
  { id: "tentou", group: "みんスマ", name: "あんしん店頭サポート", plans: P_SMART, choices: [{ l: "ミニ", p: 550 }, { l: "", p: 990 }] },
];

// プランに最初から含まれているもの（オプション欄の上に表示）
const PLAN_INCLUDES = {
  eximo: "ドコモメール・spモード込み（旧プラン）",
  eximo_poikatsu: "ドコモメール・spモード込み（旧プラン）。ポイント還元は上限5,000pt",
  giga5g: "ドコモメール・spモード込み（旧プラン）", gigapremier5g: "ドコモメール・spモード込み（旧プラン）", gigalite5g: "ドコモメール・spモード込み（旧プラン）",
  irumo: "ドコモメールは「ドコモメールオプション（330円）」が必要（旧プラン）",
  mini: "ドコモメールは「ドコモメールオプション（330円）」が必要。メロディコール・オプションパックは使えない",
  hajimete: "5分以内の国内通話無料込み（旧プラン）", u15hajimete: "5分以内の国内通話無料込み（旧プラン）",
  max: "ドコモメール・spモード込み。選べる特典（Lemino・dアニメストア・DAZN・NBAのうち月額の高い2つが0円。各サービスの申込は必要）",
  poimax: "ドコモメール・spモード込み。選べる特典（Lemino・dアニメストア・DAZN・NBAのうち月額の高い2つが0円。各サービスの申込は必要）",
  poi20: "ドコモメール・spモード込み",
  mini2: "ドコモメールは「ドコモメールオプション（330円）」が必要。メロディコール・オプションパックは使えない",
  ahamo: "5分以内の国内通話無料込み。ドコモメールは「ドコモメール持ち運び（330円）」が必要。留守電・キャッチは有料で可、転送でんわ・メロディコール・オプションパックは使えない",
  u15: "ドコモメール・spモード込み",
  keitai2: "spモード込み",
  kids3: "家族間通話無料。通話オプション・ドコモメール・ブラウザは使えない",
  dataplus: "同じ名義のペア回線（ドコモ MAX・ポイ活 MAX・ポイ活 20・ahamo）が必要。mini2・U15・ケータイプラン2とはペアにできない。音声通話・通話オプションは使えない",
};

// 初期費用（店頭）
// when: today＝当日お支払い／next＝翌月のご請求／choose＝お客様が選べる（画面で切り替え。最初は当日）
const INITIAL = [
  { id: "jimu", name: "契約事務手数料", price: 4950, auto: true, when: "next" },
  { id: "iko", name: "データ移行", price: 2200, when: "choose" },
  { id: "ikomini", name: "データ移行mini", price: 1100, when: "choose" },
  { id: "support", name: "店頭サポート", price: 3300, when: "today" },
  { id: "film", name: "フィルム", input: true, when: "today" },
  { id: "case", name: "ケース", input: true, when: "today" },
  { id: "charger", name: "充電器", input: true, when: "today" },
  { id: "coat", name: "ハルトコーティング", choices: [{ l: "片面", p: 5500 }, { l: "両面", p: 6600 }], when: "today" },
];

// 頭金（店頭）のよく使う金額。ボタンで選べて、手入力もできる
const ATAMA_CHOICES = [0, 19800, 22000];

const STORES = ["ドコモショップ平針店", "ドコモショップ刈谷店", "ドコモショップららぽーと名古屋みなとアクルス店", "ドコモショップイオンタウン名西店", "ドコモショップMEGAドン・キホーテUNY小牧店"];

const CONTRACTS = [
  { id: "mnp", name: "のりかえ（MNP）" }, { id: "shinki", name: "新規" }, { id: "kihen", name: "機種変更" }, { id: "plan", name: "プラン変更のみ" },
];
