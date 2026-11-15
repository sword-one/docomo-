# -*- coding: utf-8 -*-
"""
店頭（ドコモショップ）の端末割引を、ドコモ公式の
  5G WELCOME割   https://www.docomo.ne.jp/campaign_event/5g-welcome_wari/
  端末購入割引   https://www.docomo.ne.jp/campaign_event/direct_wari/
の表（「ドコモショップ」の列）から取り、機種データに store として付ける。
  store = { mnp|shinki|kihen: { name: 割引名, amt: 割引額(税込), cond: 適用条件（無条件なら ""） } }
オンラインショップの割引額とは違う機種があるため、見積ツールは店頭の割引で計算する。
"""
import html, re, urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"}
PAGES = [("5G WELCOME割", "https://www.docomo.ne.jp/campaign_event/5g-welcome_wari/"),
         ("端末購入割引", "https://www.docomo.ne.jp/campaign_event/direct_wari/")]


def _text(t):
    t = re.sub(r"<script.*?</script>|<style.*?</style>|<!--.*?-->", "", t, flags=re.S)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", t))).strip()


def _get(url):
    b = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
    m = re.search(rb'charset=["\']?([A-Za-z0-9_-]+)', b[:3000])
    return b.decode(m.group(1).decode() if m else "utf-8", errors="ignore")


def _num(s):
    m = re.search(r"([\d,]+)\s*円", s or "")
    return int(m.group(1).replace(",", "")) if m else None


def parse(t, campaign):
    """→ rows: [(contract, 機種名, 割引名, ドコモショップの割引額)], conds: {割引名: 条件}"""
    heads = [(m.start(), _text(m.group(1))) for m in re.finditer(r"<h[2-5][^>]*>(.*?)</h[2-5]>", t, re.S)]

    def section(pos):
        p = None
        for s, h in heads:
            if s > pos: break
            if h.startswith("他社からのお乗り換え"): p = "mnp"
            elif h.startswith("新規契約"): p = "shinki"
            elif h.startswith("機種変更"): p = "kihen"
            elif h.startswith("割引名称別"): p = "cond"
        return p
    rows, conds = [], {}
    for m in re.finditer(r"<table.*?</table>", t, re.S):
        p = section(m.start())
        for tr in re.findall(r"<tr.*?</tr>", m.group(0), re.S):
            c = [_text(x) for x in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", tr, re.S)]
            if p == "cond":
                if len(c) >= 2: conds[re.sub(r"\s+", "", c[0])] = c[1]
                continue
            if p is None or len(c) < 3 or c[0] == "対象機種" or "割引名称" in c[0]: continue
            if len(c) >= 5:      # 機種／ショップの割引名／額／量販店の割引名／額
                name, amt = re.sub(r"\s+", "", c[1]), _num(c[2])
            else:                # 機種／ショップの額／量販店の額（端末購入割引）
                name, amt = campaign, _num(c[1])
            if amt: rows.append((p, c[0], name, amt))
    return rows, conds


def norm(s):
    s = s.replace("（店頭のみ）", "").replace("（", "(").replace("）", ")").replace("(R)", "").replace("®", "")
    s = re.sub(r"^Samsung\s+", "", s.strip(), flags=re.I)
    return re.sub(r"[\s()]", "", s).lower()


def strip_cap(s):
    return re.sub(r"[（(]?\s*\d+\s*(GB|TB)\s*[)）]?", "", s, flags=re.I)


def fetch():
    rows, conds = [], {}
    for camp, url in PAGES:
        r, c = parse(_get(url), camp)
        rows += r; conds.update(c)
    if len(rows) < 20: raise RuntimeError("店頭割引の表が読めません（%d行）" % len(rows))
    return rows, conds


def attach(devices, rows, conds):
    """devices（見積ツールの機種リスト）に store を付ける。戻り値：販売中リストに無かった行"""
    by_full, by_base = {}, {}
    for d in devices:
        d.pop("store", None)
        by_full.setdefault(norm(d["name"]), []).append(d)
        by_base.setdefault(norm(strip_cap(d["name"])), []).append(d)
    unmatched = []
    for contract, model, name, amt in rows:
        has_cap = re.search(r"\d+\s*(GB|TB)", model, re.I)
        ds = by_full.get(norm(model)) or ([] if has_cap else by_base.get(norm(model), []))
        if not ds:
            unmatched.append((contract, model)); continue
        cond = conds.get(name, "")
        for d in ds:
            d.setdefault("store", {})[contract] = {"name": name.replace("5GWELCOME割", "5G WELCOME割"), "amt": amt, "cond": "" if cond in ("-", "－", "—", "") else cond}
    return unmatched
