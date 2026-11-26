// お手続きに必要なもの：公式ページの毎朝チェック結果（update/docs.py が書き出し）
const DOCS_STATUS = {
 "checked_at": "2026-11-26 11:37",
 "verified": "2026-11-22",
 "changed": [],
 "failed": [],
 "pages": [
  {
   "key": "id",
   "name": "本人確認書類",
   "url": "https://www.docomo.ne.jp/support/identification/",
   "ok": true,
   "same": true
  },
  {
   "key": "mnp",
   "name": "のりかえ（MNP）",
   "url": "https://www.docomo.ne.jp/support/mnp_subscribe/",
   "ok": true,
   "same": true
  },
  {
   "key": "kihen",
   "name": "機種変更（店頭）",
   "url": "https://www.docomo.ne.jp/support/switch_shop/",
   "ok": true,
   "same": true
  },
  {
   "key": "bunkatsu",
   "name": "分割払い",
   "url": "https://www.docomo.ne.jp/support/payment_installment/",
   "ok": true,
   "same": true
  }
 ],
 "live": {
  "idDocs": [
   "マイナンバーカード（個人番号カード）",
   "運転免許証",
   "身体障がい者手帳",
   "精神障がい者保健福祉手帳（障がい者手帳）",
   "療育手帳"
  ],
  "mynaPw": "6～16桁",
  "mnpDays": 15,
  "jimu": 4950,
  "jimuKihen": 4950
 }
};
