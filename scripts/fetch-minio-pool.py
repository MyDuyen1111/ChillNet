#!/usr/bin/env python3
"""Tai mot bo bai viet raw tu MinIO (47.129.120.139:9000, bucket hit-mira-media)
ve local de seed len ChillNet.

Loc: type=photo, co message, co it nhat 1 anh jpg/png. Bo qua video.
Moi bai luu 1 thu muc: <out>/<post_id>/message.txt + cac anh da tai.
"""
import hashlib, hmac, datetime, urllib.request, urllib.error, urllib.parse, re, json, os, sys

HOST = "47.129.120.139:9000"
AK = "minioadmin"; SK = "minioadmin"
REGION = "us-east-1"; SERVICE = "s3"; BUCKET = "hit-mira-media"
PREFIX = "raw/google-drive/data/"
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/seed_pool"
WANT = int(sys.argv[2]) if len(sys.argv) > 2 else 70   # so bai muon tai
MAX_IMG = 4                                            # toi da anh moi bai


def _sign(k, m): return hmac.new(k, m.encode(), hashlib.sha256).digest()
def _sigkey(k, d, r, s):
    return _sign(_sign(_sign(_sign(("AWS4" + k).encode(), d), r), s), "aws4_request")


def s3get(key, params=None):
    now = datetime.datetime.now(datetime.timezone.utc)
    amz = now.strftime("%Y%m%dT%H%M%SZ"); day = now.strftime("%Y%m%d")
    uri = "/" + BUCKET + "/" + urllib.parse.quote(key)
    params = params or {}
    cq = "&".join(f"{urllib.parse.quote(k, safe='')}={urllib.parse.quote(v, safe='')}"
                  for k, v in sorted(params.items()))
    payload = hashlib.sha256(b"").hexdigest()
    ch = f"host:{HOST}\nx-amz-content-sha256:{payload}\nx-amz-date:{amz}\n"
    sh = "host;x-amz-content-sha256;x-amz-date"
    cr = "\n".join(["GET", uri, cq, ch, sh, payload])
    scope = f"{day}/{REGION}/{SERVICE}/aws4_request"
    sts = "\n".join(["AWS4-HMAC-SHA256", amz, scope,
                     hashlib.sha256(cr.encode()).hexdigest()])
    sig = hmac.new(_sigkey(SK, day, REGION, SERVICE), sts.encode(),
                   hashlib.sha256).hexdigest()
    auth = (f"AWS4-HMAC-SHA256 Credential={AK}/{scope}, "
            f"SignedHeaders={sh}, Signature={sig}")
    url = f"http://{HOST}{uri}" + (f"?{cq}" if cq else "")
    req = urllib.request.Request(url, headers={
        "Host": HOST, "x-amz-date": amz,
        "x-amz-content-sha256": payload, "Authorization": auth})
    return urllib.request.urlopen(req, timeout=40).read()


def list_all():
    """Tra ve dict: post_id -> {'json': key|None, 'imgs': [keys]}."""
    posts = {}
    token = None
    while True:
        p = {"list-type": "2", "max-keys": "1000", "prefix": PREFIX}
        if token:
            p["continuation-token"] = token
        body = s3get("", p).decode()
        for k in re.findall(r"<Key>(.*?)</Key>", body):
            rest = k[len(PREFIX):]
            pid = rest.split("/")[0]
            if not pid:
                continue
            e = posts.setdefault(pid, {"json": None, "imgs": []})
            low = k.lower()
            if low.endswith("post.json"):
                e["json"] = k
            elif low.endswith((".jpg", ".jpeg", ".png")):
                e["imgs"].append(k)
        m = re.search(r"<NextContinuationToken>(.*?)</NextContinuationToken>", body)
        if re.search(r"<IsTruncated>true</IsTruncated>", body) and m:
            token = m.group(1)
        else:
            break
    return posts


def clean_msg(msg):
    if not msg:
        return ""
    return msg.strip()


def main():
    os.makedirs(OUT, exist_ok=True)
    print("==> liet ke raw/ ...", flush=True)
    posts = list_all()
    cand = [(pid, e) for pid, e in posts.items() if e["json"] and e["imgs"]]
    cand.sort(key=lambda x: x[0])
    print(f"    {len(posts)} thu muc, {len(cand)} bai co json+anh", flush=True)

    saved = 0
    manifest = []
    for pid, e in cand:
        if saved >= WANT:
            break
        try:
            j = json.loads(s3get(e["json"]))
        except Exception as ex:
            continue
        msg = clean_msg(j.get("message"))
        if len(msg) < 15:                    # bo bai khong co noi dung dang ke
            continue
        d = os.path.join(OUT, pid)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "message.txt"), "w") as f:
            f.write(msg)
        imgs = sorted(e["imgs"])[:MAX_IMG]
        localimgs = []
        ok = True
        for ik in imgs:
            name = ik.split("/")[-1]
            try:
                data = s3get(ik)
            except Exception:
                ok = False
                break
            with open(os.path.join(d, name), "wb") as f:
                f.write(data)
            localimgs.append(name)
        if not ok or not localimgs:
            continue
        manifest.append({"id": pid, "message": msg, "images": localimgs,
                         "type": j.get("type"), "created_time": j.get("created_time")})
        saved += 1
        print(f"    [{saved}/{WANT}] {pid}  ({len(localimgs)} anh, {len(msg)} ky tu)", flush=True)

    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print(f"==> Xong: {saved} bai luu tai {OUT}", flush=True)


if __name__ == "__main__":
    main()
