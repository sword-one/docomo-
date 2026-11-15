# -*- coding: utf-8 -*-
"""
機種の商品画像（ドコモ公式サイトの製品一覧に載っている画像）のURLを機種データに img として付ける。
画像そのものは保存せず、ドコモ公式サイトの画像を表示するだけ。
"""
import re, urllib.request
from store_discount import norm, strip_cap, UA

BASE = "https://www.docomo.ne.jp"
LISTS = ["/product/", "/product/smart_phone/", "/product/tablet/", "/product/feature_phone/", "/product/kids_junior/",
         "/product/easy_phone/", "/product/data/"]
# ファイル名だけでは機種が分からない Apple 製品の読み替え
ALIAS = {"ipad11th": "ipada16", "ipadpro13": "ipadprom4"}


def _get(path):
    try:
        b = urllib.request.urlopen(urllib.request.Request(BASE + path, headers=UA), timeout=60).read()
    except Exception:   # noqa
        return ""
    m = re.search(rb'charset=["\']?([A-Za-z0-9_-]+)', b[:3000])
    return b.decode(m.group(1).decode() if m else "utf-8", errors="ignore")


def _abs(u):
    u = u.split("?")[0]
    return u if u.startswith("http") else BASE + u


def fetch():
    named, apple = {}, {}
    for p in LISTS:
        for tag in re.findall(r"<img[^>]+>", _get(p)):
            s = re.search(r'src="([^"]*product_pics[^"]*)"', tag); a = re.search(r'alt="([^"]*)の製品詳細へ"', tag)
            if s and a: named[norm(strip_cap(a.group(1)))] = _abs(s.group(1))
    for p, kind in (("/iphone/", "iphone"), ("/ipad/", "ipad")):
        for u in re.findall(r'src="([^"]*/%s/images/top/img_[^"]+\.png[^"]*)"' % kind, _get(p)):
            slug = re.sub(r"[-_]", "", re.search(r"img_([^.?]+)\.png", u).group(1)).lower()
            if kind == "iphone" and not slug.startswith("iphone"): continue
            if kind == "ipad" and not re.search(r"ipad|mini", slug): continue
            if kind == "ipad" and slug in ("iphone",): continue
            apple[ALIAS.get(slug, slug)] = _abs(u)
    return named, apple


def attach(devices, named, apple):
    n = 0
    for d in devices:
        d.pop("img", None)
        k = norm(strip_cap(d["name"]))
        url = named.get(k)
        if not url and ("iphone" in k or "ipad" in k):
            k2 = k.replace("nano-textureガラス", "")
            # iPhoneは「ぴったり」か「○○ Pro → Pro Max」だけ（16と16eのように見た目が違う機種を混ぜない）。iPadは名前を含めばOK
            c = [s for s in apple if k2 == s or (k2.startswith("iphone") and k2 == s + "max") or ("ipad" in k2 and s in k2)]
            if c: url = apple[max(c, key=len)]
        if url: d["img"] = url; n += 1
    return n
