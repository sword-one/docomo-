# -*- coding: utf-8 -*-
"""
簡易見積ツール 毎日の自動更新（GitHub Actions から毎朝実行）

1) ドコモ公式「おてがる料金シミュレーション」（＝ドコモオンラインショップの販売価格）から
   全機種 × 新規/のりかえ/機種変更 の価格を取り直して devices.js を作り直す
2) 同じページの料金プラン一覧を見て、
   - 新しいプランが出ていたら updates.js の AUTO_PLANS に自動で追加（画面に「新プラン」として出る）
   - 既存プランの基本料金が変わっていたら PLAN_OVERRIDES で画面の金額を自動で置き換える（2026/12/1以降）
3) 前日との違い（新機種・販売終了・価格変更・新プラン）を updates.js の NEWS に書く（画面上部のお知らせ）

外部ライブラリ不要（Python 3.9+ 標準ライブラリのみ）。
取得に大きく失敗した日は、前日のデータを残して updates.js にエラーだけ書く。
"""
import json, os, re, sys, time, datetime, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # リポジトリ直下（index.html がある場所）
STATE = os.path.join(ROOT, "update", "state")
os.makedirs(STATE, exist_ok=True)
JST = datetime.timezone(datetime.timedelta(hours=9))
NOW = datetime.datetime.now(JST)
TODAY = NOW.strftime("%Y-%m-%d")
SIM = "https://www.docomo.ne.jp/charge/simulation/gigaho_gigalite/?"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"}
PLAN_APPLY_FROM = "2026-12-01"   # これより前はシミュレーションがまだ旧料金のため、プラン金額の自動置き換えはしない


def log(*a):
    print(*a, flush=True)


def get(params, tries=3):
    url = SIM + urllib.parse.urlencode(params)
    err = None
    for i in range(tries):
        try:
            b = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90).read()
            m = re.search(rb'charset=["\']?([A-Za-z0-9_-]+)', b[:3000])
            t = b.decode(m.group(1).decode() if m else "utf-8", errors="ignore")
            s = [x.group(1) for x in re.finditer(r"<script[^>]*>(.*?)</script>", t, re.S) if "setData(" in x.group(1)][0].strip()
            return json.loads(s[len("setData("):s.rfind(")")])
        except Exception as e:   # noqa
            err = e
            time.sleep(3 + i * 5)
    raise RuntimeError("取得失敗 %s : %r" % (url, err))


def num(v):
    if v is None: return None
    if isinstance(v, (int, float)): return int(v)
    v = str(v).replace(",", "").strip()
    return int(v) if re.fullmatch(r"-?\d+", v) else None


def category(p):
    t = p.get("model_type_id", "")
    if t.startswith("iphone"): return "iPhone"
    if t.startswith("ipad"): return "iPad"
    if t in ("smart_phone_5g_model_type", "easy_phone_5g_model_type"): return "Android"
    if t in ("feature_phone_model_type", "easy_feature_phone_model_type"): return "ケータイ"
    if t == "kids_junior_model_type": return "ケータイ" if "KY-41C" in p.get("name", "") else "タブレット等"
    return "タブレット等"


def payment_for(p):
    if p.get("is_zanka2"): return "payment_24_plus"
    if p.get("is_zanka"): return "payment_24"
    return "payment_36"


CONTRACTS = {"shinki": ["new"], "mnp": ["mnp_5g", "mnp"], "kihen": ["switch"]}


def fetch_price(key, p, ck):
    for c in CONTRACTS[ck]:
        d = get({"product": key, "contract": c, "payment": payment_for(p)})
        if "lines" not in d.get("input", {}):
            continue   # この契約種別はシミュレーションに無い（iPadののりかえ等）
        T = d["result"]["lines"][0]["details"].get("terminal")
        if not T: continue
        X = "A" if c in ("new", "mnp_5g", "mnp") else "B"   # 新規・のりかえ=A列、機種変更=B列
        t, tot = T["terminal"], T["total"]
        pa = tot.get("prices_" + X, {})
        disc = t.get("discount") or {}
        e = {"ikkatsu": num(pa.get("1")), "hontai": num(t["prices"].get("1"))}
        ds = sum(disc.values()) if isinstance(disc, dict) else 0
        if ds: e["discount"] = ds
        if t.get("is_zanka"):
            e["kaedoki"] = {"program": "いつでもカエドキプログラム", "monthly": num(pa.get("23")), "months": 23,
                            "zanka": num(t.get("zanka_price_" + X)), "return23": num(t.get("zanka_hutan_price_" + X)), "return12": None}
        elif t.get("is_zanka2"):
            h12, menjo = num(t.get("zanka2_hutan_price_" + X)), num(t.get("zanka2_menjo_price_" + X))
            early, fee = num(t.get("zanka2_gohutan_price")), num(t.get("zanka2_program_price_" + X))
            e["kaedoki"] = {"program": "いつでもカエドキプログラム＋", "monthly": num(pa.get("23")), "months": 23,
                            "zanka": num(t.get("zanka2_price_" + X)),
                            "return23": (h12 + menjo) if None not in (h12, menjo) else None,
                            "return12": (h12 + early + fee) if None not in (h12, early, fee) else None}
        elif t.get("numberOfPayments") == 36:
            e["b36"] = num(pa.get("36"))
        return e
    return None


# ---------------- 1) 機種 ----------------
def crawl_devices():
    first = get({"contract": "new", "payment": "payment_24"})
    master = first["master"]
    products = master["product"]
    log("機種数", len(products))
    jobs = [(k, ck) for k, p in products.items() if p.get("on_sale_flag", True) for ck in CONTRACTS]
    res, errs = {}, []

    def job(a):
        k, ck = a
        try:
            return k, ck, fetch_price(k, products[k], ck), None
        except Exception as e:   # noqa
            return k, ck, None, str(e)

    with ThreadPoolExecutor(3) as ex:   # ドコモのサーバーに負担をかけないよう3並列まで
        for i, (k, ck, e, er) in enumerate(ex.map(job, jobs)):
            if er: errs.append((k, ck, er))
            res.setdefault(k, {})[ck] = e
            if i % 60 == 0: log(" ", i, "/", len(jobs))
    devices = []
    for k, p in products.items():
        if k not in res: continue
        pr = {ck: v for ck, v in res[k].items() if v}
        if not pr: continue
        name = p["name"].replace("\t", " ").strip()
        online = p.get("online_shop_flag", True)
        devices.append({"cat": category(p), "name": name + ("" if online else "（店頭のみ）"), "maker": None,
                        "online": online, "key": k, "prices": pr})
    order = {"iPhone": 0, "Android": 1, "iPad": 2, "タブレット等": 3, "ケータイ": 4}
    devices.sort(key=lambda d: order.get(d["cat"], 9))
    return master, devices, errs, len(jobs)


# ---------------- 2) プラン ----------------
# シミュレーションのプランキー（_dcard/_var を除いたもの）→ 見積ツールのプランid と段階番号
PLAN_MAP = {
    "docomomax_5g_plan_1": ("max", 0), "docomomax_5g_plan_3": ("max", 1), "docomomax_5g_plan_unlimited": ("max", 2),
    "poikatsu_docomomax_5g_plan_unlimited": ("poimax", 0),
    "poikatsu_docomo20_5g_plan_unlimited": ("poi20", 0), "poikatsu_docomo20_5g_plan_20": ("poi20", 1),
    "u15_hajimete_5g_plan": ("u15", 0), "u15_hajimete_5g_10_plan": ("u15", 1),
}
# 既に見積ツールにある（または取り扱わない）プランのタブ
KNOWN_TABS = {"docomomax_5g_plan", "poikatsu_docomo_5g_plan", "docomomini_5g_plan", "hajimete_5g", "u15_hajimete_5g",
              "ahamo", "dataplus_5g", "docomomax_plan", "poikatsu_docomo_plan", "docomomini_plan", "hajimete_plan",
              "u15_hajimete_plan", "kids_keitai_plan", "dataplus", "keitai_plan"}


def norm(s):
    return re.sub(r"[\s・　]", "", s or "").lower()


def plan_snapshot(master):
    tabs = master.get("planTab", {})
    snap = {}
    for k, v in master.get("plan", {}).items():
        base = re.sub(r"_(dcard|var|fix)$", "", k)
        if k.endswith("_fix"): continue
        m0 = (v.get("multiple_0") or {}).get("price")
        if not m0: continue
        tab = v.get("tab_id")
        snap[base] = {"tab": tab, "tab_name": (tabs.get(tab) or {}).get("name", tab), "name": v.get("name"), "gb": v.get("gb"),
                      "m0": m0, "m2": (v.get("multiple_2") or {}).get("price") or 0, "m3": (v.get("multiple_3") or {}).get("price") or 0}
    return snap


def known_plan_names():
    js = open(os.path.join(ROOT, "data.js"), encoding="utf-8").read()
    return {norm(n) for n in re.findall(r'name:\s*"([^"]+)"', js)}


# ---------------- 3) 差分とお知らせ ----------------
def load_json(name, default):
    p = os.path.join(STATE, name)
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else default


def save_json(name, obj):
    json.dump(obj, open(os.path.join(STATE, name), "w", encoding="utf-8"), ensure_ascii=False, indent=0)


def yen(n):
    return "{:,}円".format(n) if isinstance(n, int) else "—"


def main():
    old_updates = load_json("updates_state.json", {"news": [], "auto_plans": [], "plan_overrides": {}})
    news = [n for n in old_updates.get("news", [])
            if n["date"] >= (NOW - datetime.timedelta(days=14)).strftime("%Y-%m-%d")]   # お知らせは2週間分
    status = {"ok": True, "message": ""}
    try:
        master, devices, errs, njobs = crawl_devices()
    except Exception as e:   # noqa
        status = {"ok": False, "message": "ドコモのサイトから取得できませんでした（%s）。前回のデータのまま表示しています。" % str(e)[:120]}
        write_updates(old_updates, news, status)
        log(status["message"]); return 1

    prev = load_json("devices_prev.json", None)
    # 取得失敗が多い日は機種データを上書きしない
    if len(errs) > njobs * 0.2 or (prev and len(devices) < len(prev) * 0.7):
        status = {"ok": False, "message": "機種価格の取得が一部できなかったため、前回のデータのまま表示しています（失敗%d件）。" % len(errs)}
        log(status["message"], errs[:5])
    else:
        if prev:
            pm = {d["key"]: d for d in prev}
            cm = {d["key"]: d for d in devices}
            added = [d["name"] for k, d in cm.items() if k not in pm]
            gone = [d["name"] for k, d in pm.items() if k not in cm]
            changed = []
            for k, d in cm.items():
                if k not in pm: continue
                for ck, lab in (("mnp", "のりかえ"), ("shinki", "新規"), ("kihen", "機種変更")):
                    a, b = (pm[k]["prices"].get(ck) or {}).get("ikkatsu"), (d["prices"].get(ck) or {}).get("ikkatsu")
                    if a != b and a is not None and b is not None:
                        changed.append("%s（%s）%s→%s" % (d["name"], lab, yen(a), yen(b)))
            if added: news.append({"date": TODAY, "kind": "new", "text": "新しい機種：" + "、".join(added)})
            if gone: news.append({"date": TODAY, "kind": "gone", "text": "シミュレーションから消えた機種（販売終了など）：" + "、".join(gone)})
            if changed:
                news.append({"date": TODAY, "kind": "price", "text": "機種代金の変更 %d件：" % len(changed) + "／".join(changed[:12]) + (" ほか" if len(changed) > 12 else "")})
        # 店頭（ドコモショップ）の割引を付ける。取れなかった日は前回の割引を引き継ぐ
        try:
            sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            import store_discount
            rows, conds = store_discount.fetch()
            un = store_discount.attach(devices, rows, conds)
            log("店頭割引", len(rows), "行／販売中リストに無い機種", len(set(m for c, m in un)))
            if prev:
                pm = {d["key"]: d.get("store") or {} for d in prev}
                ch = []
                for d in devices:
                    if d["key"] not in pm: continue
                    for ck, lab in (("mnp", "のりかえ"), ("shinki", "新規"), ("kihen", "機種変更")):
                        a, b = (pm[d["key"]].get(ck) or {}).get("amt"), ((d.get("store") or {}).get(ck) or {}).get("amt")
                        if a != b: ch.append("%s（%s）%s→%s" % (d["name"], lab, yen(a) if a else "なし", yen(b) if b else "なし"))
                if ch and any(x.get("store") for x in prev):
                    news.append({"date": TODAY, "kind": "store", "text": "店頭の割引の変更 %d件：" % len(ch) + "／".join(ch[:12]) + (" ほか" if len(ch) > 12 else "")})
        except Exception as e:   # noqa
            log("店頭割引の取得でエラー（前回の値を引き継ぎ）", e)
            if prev:
                pm = {d["key"]: d.get("store") for d in prev}
                for d in devices:
                    if pm.get(d["key"]): d["store"] = pm[d["key"]]
            status = {"ok": False, "message": "店頭の割引を取得できなかったため、割引は前回の値のまま表示しています。"}
        save_json("devices_prev.json", devices)
        out = [{k: v for k, v in d.items() if k != "key"} for d in devices]
        js = "// 機種代金（ドコモ公式「おてがる料金シミュレーション」＝ドコモオンラインショップの販売価格）毎朝自動更新\n"
        js += "const DEVICES_AS_OF = " + json.dumps(NOW.strftime("%Y-%m-%d %H:%M") + " 時点", ensure_ascii=False) + ";\n"
        js += "const DEVICES = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n"
        open(os.path.join(ROOT, "devices.js"), "w", encoding="utf-8").write(js)
        log("devices.js", len(out), "機種", "失敗", len(errs))

    # プラン
    snap = plan_snapshot(master)
    psnap = load_json("plans_prev.json", None)
    names = known_plan_names()
    auto_plans, overrides = [], {}
    by_tab = {}
    for base, r in snap.items():
        by_tab.setdefault(r["tab"], []).append(r)
    for tab, rows in by_tab.items():
        if tab in KNOWN_TABS: continue
        tname = rows[0]["tab_name"]
        if norm(tname) in names: continue   # 例：ドコモ mini2 は見積ツールに登録済み
        rows = sorted(rows, key=lambda r: r["m0"])
        fam2 = max(0, rows[0]["m0"] - rows[0]["m2"]) if rows[0]["m2"] else 0
        fam3 = max(0, rows[0]["m0"] - rows[0]["m3"]) if rows[0]["m3"] else 0
        auto_plans.append({"id": "auto_" + tab, "count": True, "name": tname, "group": "新プラン", "auto": True,
                           "tiers": [{"label": r["name"], "price": r["m0"]} for r in rows],
                           "note": "ドコモのサイトに新しく出たプランを自動で追加しました（%s）。割引の条件は公式サイトで確認してください" % TODAY,
                           "family": [fam2, fam3] if (fam2 or fam3) else None, "dcard": None, "hikari": 0, "denki": 0,
                           "choki": False, "voice": "std"})
    if TODAY >= PLAN_APPLY_FROM:
        for base, (pid, ti) in PLAN_MAP.items():
            if base in snap:
                overrides.setdefault(pid, {})[str(ti)] = snap[base]["m0"]
    if psnap:
        for base, r in snap.items():
            if base not in psnap:
                news.append({"date": TODAY, "kind": "plan", "text": "料金プランの追加：%s %s（%s）" % (r["tab_name"], r["name"], yen(r["m0"]))})
            elif psnap[base]["m0"] != r["m0"]:
                news.append({"date": TODAY, "kind": "plan", "text": "料金プランの変更：%s %s %s→%s" % (r["tab_name"], r["name"], yen(psnap[base]["m0"]), yen(r["m0"]))})
        for base, r in psnap.items():
            if base not in snap:
                news.append({"date": TODAY, "kind": "plan", "text": "料金プランの終了：%s %s" % (r["tab_name"], r["name"])})
    save_json("plans_prev.json", snap)
    # 機種ごとの補償の金額（smartあんしん補償／ケータイ補償サービス）
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import hosho
        res = hosho.build()
        if res and len(res[0]) > 200:
            hprev = load_json("hosho_prev.json", None)
            if hprev:
                pm = {(x["name"], x["type"]): x["price"] for x in hprev}
                ch = ["%s %s→%s" % (x["name"], yen(pm[(x["name"], x["type"])]), yen(x["price"])) for x in res[0] if (x["name"], x["type"]) in pm and pm[(x["name"], x["type"])] != x["price"]]
                if ch: news.append({"date": TODAY, "kind": "hosho", "text": "補償の月額の変更：" + "／".join(ch[:10])})
            save_json("hosho_prev.json", res[0])
            hosho.write(res[0], NOW.strftime("%Y-%m-%d %H:%M") + " 時点")
        else:
            log("補償の金額を取得できなかったため前回のまま")
    except Exception as e:   # noqa
        log("補償の金額の取得でエラー", e)
    st = {"news": news, "auto_plans": auto_plans, "plan_overrides": overrides}
    write_updates(st, news, status)
    return 0


def write_updates(st, news, status):
    st = dict(st, news=news)
    save_json("updates_state.json", st)
    u = {"checked_at": NOW.strftime("%Y-%m-%d %H:%M"), "ok": status["ok"], "message": status["message"],
         "news": sorted(news, key=lambda n: n["date"], reverse=True)}
    js = "// 毎朝の自動チェック結果（daily_update.py が書き出し）\n"
    js += "const UPDATES = " + json.dumps(u, ensure_ascii=False, indent=1) + ";\n"
    js += "const AUTO_PLANS = " + json.dumps(st.get("auto_plans", []), ensure_ascii=False) + ";\n"
    js += "const PLAN_OVERRIDES = " + json.dumps(st.get("plan_overrides", {}), ensure_ascii=False) + ";\n"
    open(os.path.join(ROOT, "updates.js"), "w", encoding="utf-8").write(js)


if __name__ == "__main__":
    sys.exit(main())
