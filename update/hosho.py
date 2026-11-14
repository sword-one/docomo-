# -*- coding: utf-8 -*-
"""
機種ごとの補償サービス月額（smartあんしん補償／ケータイ補償サービス）を、ドコモ公式の
「補償サービスの月額料金を検索」https://www.docomo.ne.jp/service/smart_anshin_hoshou/charge.html
から全シリーズ分取得して hosho.js を作る。daily_update.py からも呼ばれる。
"""
import html, json, os, re, sys, urllib.parse, urllib.request, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "https://www.docomo.ne.jp/service/smart_anshin_hoshou/charge.html?"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"}
SERIES = ["iphone", "ipad", "2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016",
          "2015_winter", "2015_summer", "2014_winter", "2014_summer", "2013_winter", "2013_summer", "next", "tablet",
          "2022_i", "2019_i", "2018_i", "2016_i", "2015_winter_i", "2015_summer_i", "2014_winter_i", "2014_summer_i",
          "concept", "2xxx", "chromebook_pc", "rakuraku", "kids_junior", "data_card", "5g_home_router"]
# 見積ツールでの分類
CAT = {"iphone": "iPhone", "ipad": "iPad", "tablet": "タブレット等", "chromebook_pc": "タブレット等", "data_card": "タブレット等",
       "5g_home_router": "タブレット等", "kids_junior": "キッズ・ケータイ", "rakuraku": "らくらく", "2xxx": "ケータイ"}


def fetch(series):
    q = urllib.parse.urlencode({"series": series, "maker": "all", "series+maker": series + "_all"})
    b = urllib.request.urlopen(urllib.request.Request(URL + q, headers=UA), timeout=60).read()
    t = b.decode("utf-8", errors="ignore")
    i = t.find('id="result"')
    if i < 0: return []
    seg = t[i:]
    seg = seg[:seg.find("</table>")] if "</table>" in seg else seg
    out = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", seg, re.S):
        tds = [re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", x))).strip() for x in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.S)]
        if len(tds) < 3 or "機種名" in tds[0]: continue
        m = re.search(r"([\d,]+)\s*円", tds[1])
        if not m: continue
        svc = tds[2]
        out.append({"name": tds[0], "price": int(m.group(1).replace(",", "")),
                    "type": "smart" if "smart" in svc else "keitai" if "ケータイ補償" in svc else svc})
    return out


def build():
    seen, rows, counts = set(), [], {}
    for s in SERIES:
        try:
            r = fetch(s)
        except Exception as e:   # noqa
            print("失敗", s, e); r = None
        if r is None: return None
        counts[s] = len(r)
        cat = CAT.get(s) or ("Android" if not s.endswith("_i") else "Android")
        for x in r:
            k = (x["name"], x["type"])
            if k in seen: continue
            seen.add(k)
            x["cat"] = "ケータイ" if cat == "Android" and re.search(r"ケータイ|ガラホ|SH-0[12]L|F-0[12]L", x["name"]) else cat
            x["series"] = s
            rows.append(x)
    return rows, counts


def write(rows, stamp):
    js = "// 機種ごとの補償サービス月額（税込）。ドコモ公式「補償サービスの月額料金を検索」より自動取得\n"
    js += "// type: smart＝smartあんしん補償（2022/9/15以降発売）／keitai＝ケータイ補償サービス（2022/8/31以前発売）\n"
    js += "const HOSHO_AS_OF = " + json.dumps(stamp, ensure_ascii=False) + ";\n"
    js += "const HOSHO = " + json.dumps(rows, ensure_ascii=False, separators=(",", ":")) + ";\n"
    open(os.path.join(ROOT, "hosho.js"), "w", encoding="utf-8").write(js)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    res = build()
    if not res: sys.exit(1)
    rows, counts = res
    print(len(rows), counts)
    write(rows, datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%Y-%m-%d %H:%M") + " 時点")
