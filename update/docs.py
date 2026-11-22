# -*- coding: utf-8 -*-
"""お手続きに必要なもの（本人確認書類など）の公式ページを毎朝チェックする。

見積ツールに載せている必要書類（data.js の DOCS）は、下の公式ページを人が読んで確認した内容。
このスクリプトは毎朝そのページを取りに行き、
  1) 確認した時（docs_baseline.json）から本文が変わっていないかを調べ、
  2) 本人確認書類の一覧・MNP予約番号の有効期間・契約事務手数料を本文から読み取って、
docs.js（DOCS_STATUS）に書き出す。変わっていたら見積ツールに注意が出る。

基準を取り直す（内容を確認し直した後）:  python update/docs.py --baseline
"""
import datetime, hashlib, html, json, os, re, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BASELINE = os.path.join(HERE, "docs_baseline.json")
PAGES = [
    ("id", "本人確認書類", "https://www.docomo.ne.jp/support/identification/"),
    ("mnp", "のりかえ（MNP）", "https://www.docomo.ne.jp/support/mnp_subscribe/"),
    ("kihen", "機種変更（店頭）", "https://www.docomo.ne.jp/support/switch_shop/"),
    ("bunkatsu", "分割払い", "https://www.docomo.ne.jp/support/payment_installment/"),
]
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"


def fetch_text(url, tries=3):
    err = None
    for _ in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ja"})
            with urllib.request.urlopen(req, timeout=40) as r:
                b = r.read()
            t = b.decode("utf-8", errors="ignore")
            m = re.search(r"<main\b.*?</main>", t, re.S | re.I)
            if m: t = m.group(0)
            t = re.sub(r"<(script|style|noscript)\b.*?</\1>", " ", t, flags=re.S | re.I)
            t = re.sub(r"<!--.*?-->", " ", t, flags=re.S)
            t = re.sub(r"<(br|/p|/li|/div|/tr|/h\d|/td|/th|/dt|/dd)\b[^>]*>", "\n", t, flags=re.I)
            t = html.unescape(re.sub(r"<[^>]+>", " ", t))
            t = re.sub(r"[ \t　\xa0]+", " ", t)
            t = "\n".join(x.strip() for x in t.split("\n") if x.strip())
            if len(t) < 500: raise RuntimeError("本文が短すぎます（%d文字）" % len(t))
            return t
        except Exception as e:   # noqa
            err = e
    raise RuntimeError("取得失敗 %s : %r" % (url, err))


def digest(t):
    # 文字の並びだけを比べる（空白・改行の違いでは「変更」としない）
    return hashlib.sha256(re.sub(r"\s+", "", t).encode("utf-8")).hexdigest()[:16]


def extract(texts):
    """本文から、見積ツールで使う値を読み取る。読み取れなかった項目は入れない（ツール側は確認済みの内容を使う）。"""
    live = {}
    t = texts.get("id")
    if t:
        m = re.search(r"個人\s*（成年）(.*?)のいずれか1点", t, re.S)
        if m:
            items = []
            for line in m.group(1).split("\n"):
                line = re.sub(r"（都道府県公安委員会発行.*?）", "", line).strip()
                if re.search(r"カード|免許証|手帳", line) and len(line) <= 30 and "取得・保存" not in line:
                    items.append(line)
            if 3 <= len(items) <= 8: live["idDocs"] = items
        m = re.search(r"署名用電子証明書パスワード（([^）]+)）", t)
        if m: live["mynaPw"] = m.group(1)
    t = texts.get("mnp")
    if t:
        m = re.search(r"MNP予約番号の有効期間は予約当日を含めて(\d+)日間", t)
        if m: live["mnpDays"] = int(m.group(1))
        m = re.search(r"契約事務手数料\s*([\d,]+)円", t)
        if m: live["jimu"] = int(m.group(1).replace(",", ""))
    t = texts.get("kihen")
    if t:
        m = re.search(r"手数料：([\d,]+)円", t)
        if m: live["jimuKihen"] = int(m.group(1).replace(",", ""))
    return live


def run(now=None):
    now = now or datetime.datetime.utcnow() + datetime.timedelta(hours=9)
    base = json.load(open(BASELINE, encoding="utf-8")) if os.path.exists(BASELINE) else {}
    texts, pages, changed, failed = {}, [], [], []
    for key, name, url in PAGES:
        try:
            texts[key] = fetch_text(url)
            h = digest(texts[key])
            same = base.get(key, {}).get("hash") == h
            if not same and key in base: changed.append(name)
            pages.append({"key": key, "name": name, "url": url, "ok": True, "same": same})
        except Exception as e:   # noqa  取得できなかった日は「変更」とはしない
            failed.append(name); pages.append({"key": key, "name": name, "url": url, "ok": False, "same": None})
            print("[docs]", e)
    status = {"checked_at": now.strftime("%Y-%m-%d %H:%M"), "verified": base.get("_verified", ""), "changed": changed, "failed": failed,
              "pages": pages, "live": extract(texts)}
    js = "// お手続きに必要なもの：公式ページの毎朝チェック結果（update/docs.py が書き出し）\nconst DOCS_STATUS = " + json.dumps(status, ensure_ascii=False, indent=1) + ";\n"
    open(os.path.join(ROOT, "docs.js"), "w", encoding="utf-8", newline="\n").write(js)
    return status, texts


def make_baseline():
    now = datetime.datetime.utcnow() + datetime.timedelta(hours=9)
    base = {"_verified": now.strftime("%Y-%m-%d")}
    for key, name, url in PAGES:
        t = fetch_text(url); base[key] = {"name": name, "url": url, "hash": digest(t), "len": len(t)}
    json.dump(base, open(BASELINE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("baseline", base)


if __name__ == "__main__":
    if "--baseline" in sys.argv: make_baseline()
    st, _ = run()
    print(json.dumps(st, ensure_ascii=False, indent=1))
