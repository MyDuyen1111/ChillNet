#!/usr/bin/env python3
"""Tao du lieu demo cho ChillNet qua API gateway.

Muc tieu: sau khi chay xong, mo web len la co bai viet, binh luan, ban be, va
mot hang doi kiem duyet co san viec de xu ly — thay vi mot he thong rong tuenh.

    scripts/seed-demo.py              # tao du lieu
    scripts/seed-demo.py --check      # chi in tinh trang hien tai

Yeu cau: toan bo stack dang chay (scripts/start-all.sh).

Luu y ve xac minh email: dang ky xong tai khoan chua active. Script doc ma OTP
tu logs/identity-service.log, nen identity-service phai duoc chay voi
  -Dlogging.level.org.hibernate.orm.jdbc.bind=TRACE
Script tu lo viec restart identity-service o che do do roi tra lai binh thuong.
"""

import argparse
import json
import os
import re
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = os.environ.get("CHILLNET_API", "http://127.0.0.1:8080/api/v1")
IDENTITY_LOG = os.path.join(ROOT, "logs", "identity-service.log")
IDENTITY_PID = os.path.join(ROOT, "logs", "pids", "identity-service.pid")

ADMIN = {"username": "admin", "password": "admin"}
PASSWORD = "Password@123"

USERS = [
    ("mai", "Mai", "Nguyen"),
    ("hung", "Hung", "Tran"),
    ("linh", "Linh", "Pham"),
    ("khoa", "Khoa", "Le"),
    ("thao", "Thao", "Vo"),
]

POSTS = [
    "Sang nay chay bo quanh Ho Guom, thoi tiet dep that su.",
    "Vua doc xong mot cuon sach ve kien truc phan tan. Nhieu thu ap dung duoc ngay.",
    "Ai co goi y quan ca phe yen tinh de ngoi lam viec khong?",
    "Cuoi tuan nay co ai di leo nui khong? Dang tim nhom.",
    "Hoan thanh xong module dau tien cua do an. Nhe ca nguoi.",
    "Cong thuc ca phe trung nha lam, thu roi nghien luon.",
    "Buoi toi Ha Noi mua nhe, hop voi mot playlist cu.",
    "Chia se ban ke hoach on tap cuoi ky, hy vong huu ich cho moi nguoi.",
]

COMMENTS = [
    "Hay qua!",
    "Minh cung dang tim thu tuong tu.",
    "Cam on ban da chia se.",
    "Cho minh tham gia voi nhe.",
    "Doan nay minh chua ro lam, ban noi them duoc khong?",
]

# Bai viet co van de, dung de tao san mot hang doi kiem duyet cho demo.
SPAM_POST = "MUA NGAY - GIAM GIA 90% - LIEN HE 0900xxxxxx - CAM KET HOAN TIEN 100%"


def call(method, path, token=None, body=None, timeout=30):
    req = urllib.request.Request(API + path, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"raw": raw[:200]}
    except Exception as e:  # gateway chua len
        return 0, {"raw": str(e)}


def login(username, password):
    _, r = call("POST", "/identity/auth/token",
                body={"username": username, "password": password})
    return (r.get("result") or {}).get("token")


def restart_identity(trace):
    """Khoi dong lai identity-service, co the bat log tham so SQL de doc OTP."""
    try:
        with open(IDENTITY_PID) as f:
            os.kill(int(f.read().strip()), signal.SIGTERM)
    except Exception:
        pass
    time.sleep(4)

    env = dict(os.environ)
    for line in open(os.path.join(ROOT, ".env"), errors="ignore"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env.setdefault(k, v)

    jar = subprocess.run(
        "ls " + os.path.join(ROOT, "identity-service/target") + "/*.jar | head -1",
        shell=True, capture_output=True, text=True).stdout.strip()

    cmd = ["java", "-Xmx256m"]
    if trace:
        cmd.append("-Dlogging.level.org.hibernate.orm.jdbc.bind=TRACE")
    cmd += ["-jar", jar]

    log = open(os.path.join(ROOT, "logs", "identity-service.log"), "w")
    p = subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT, cwd=ROOT, env=env)
    with open(IDENTITY_PID, "w") as f:
        f.write(str(p.pid))

    # Phai hoi thang identity-service, khong hoi qua gateway: khi identity chua len,
    # gateway tra 500 (khong ket noi duoc) — mot ma khac 0, du de danh lua mot phep
    # kiem tra "co phan hoi la xong" va khien seed ban dau nhan hang loat loi 500.
    for _ in range(120):
        try:
            with urllib.request.urlopen(
                    "http://127.0.0.1:8081/identity/actuator/health", timeout=3) as r:
                if r.status == 200 and b'"UP"' in r.read():
                    return True
        except Exception:
            pass
        time.sleep(1)
    return False


def otp_after(offset):
    """Doc cac ma OTP moi xuat hien trong log ke tu vi tri byte `offset`."""
    with open(IDENTITY_LOG, errors="ignore") as f:
        f.seek(offset)
        lines = f.read().split("\n")
    out = []
    for i, l in enumerate(lines):
        if "insert into user_otp" in l:
            for j in range(i, min(i + 10, len(lines))):
                m = re.search(r"binding parameter \(3:VARCHAR\) <- \[(\d{6})\]", lines[j])
                if m:
                    out.append(m.group(1))
                    break
    return out


# Dang nhap bi gioi han 5 lan/phut o gateway (RateLimitFilter). Seed can 6 lan
# (admin + 5 tai khoan) nen phai gian ra, neu khong chinh script se bi 429.
LOGIN_GAP_SECONDS = 13
_last_login = [0.0]


def paced_login(username, password):
    wait = LOGIN_GAP_SECONDS - (time.time() - _last_login[0])
    if wait > 0:
        time.sleep(wait)
    _last_login[0] = time.time()
    return login(username, password)


def create_account(slug, first, last, stamp):
    """Dang ky -> doc OTP cua rieng lan dang ky nay -> xac minh -> dang nhap.

    Doc OTP theo tung tai khoan (khong gom lo) vi ghep nham ma se lam OtpService
    danh dau ma do la da dung, va tai khoan mat luon co hoi xac minh.
    """
    username = f"{slug}{stamp}"
    email = f"{username}@yopmail.com"

    offset = os.path.getsize(IDENTITY_LOG)
    s, r = call("POST", "/identity/auth/registration",
                body={"username": username, "password": PASSWORD, "email": email,
                      "firstName": first, "lastName": last})
    if s != 200:
        print(f"    !! dang ky {username} that bai: {s} {r.get('message')}")
        return None

    codes = []
    for _ in range(10):
        time.sleep(0.6)
        codes = otp_after(offset)
        if codes:
            break
    if not codes:
        print(f"    !! khong doc duoc OTP cho {username} — identity-service co dang o che do TRACE khong?")
        return None

    s, r = call("POST", "/identity/auth/verify-user",
                body={"email": email, "otpCode": codes[-1]})
    if s != 200:
        print(f"    !! xac minh {username} that bai: {s} {r.get('message')}")
        return None

    token = paced_login(username, PASSWORD)
    if not token:
        print(f"    !! dang nhap {username} that bai")
        return None
    return {"username": username, "email": email, "name": f"{first} {last}", "token": token}


def check():
    token = login(**ADMIN)
    if not token:
        print("Khong dang nhap duoc admin — stack da chay chua?")
        return 1
    _, r = call("GET", "/moderation/cases/stats", token)
    print("Thong ke kiem duyet:", json.dumps(r.get("result"), ensure_ascii=False))
    _, r = call("GET", "/post/public?page=1&size=1", token)
    res = r.get("result") or {}
    print("Tong bai viet cong khai:", res.get("totalElements"))
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="chi in tinh trang")
    args = ap.parse_args()

    if args.check:
        return check()

    admin = paced_login(**ADMIN)
    if not admin:
        print("!! Khong dang nhap duoc admin. Chay scripts/start-all.sh truoc.")
        return 1

    stamp = str(int(time.time()))[-6:]
    print("==> restart identity-service o che do doc duoc OTP")
    if not restart_identity(trace=True):
        print("!! identity-service khong len duoc")
        return 1

    print(f"==> tao {len(USERS)} tai khoan (gian {LOGIN_GAP_SECONDS}s/lan dang nhap "
          f"de khong dinh rate limit)")
    accounts = []
    for slug, first, last in USERS:
        acc = create_account(slug, first, last, stamp)
        if acc:
            accounts.append(acc)
            print(f"    OK {acc['username']}")

    print(f"    {len(accounts)} tai khoan san sang")
    if not accounts:
        restart_identity(trace=False)
        return 1

    print("==> ket ban")
    for i, a in enumerate(accounts):
        for b in accounts[i + 1:]:
            sa, ra = call("GET", "/profile/users/my-profile", a["token"])
            sb, rb = call("GET", "/profile/users/my-profile", b["token"])
            a_id = (ra.get("result") or {}).get("userId")
            b_id = (rb.get("result") or {}).get("userId")
            if not a_id or not b_id:
                continue
            call("POST", f"/social/friendships/{b_id}", a["token"])
            call("POST", f"/social/friendships/{a_id}/accept", b["token"])

    print("==> dang bai + binh luan + thich")
    post_ids = []
    for i, text in enumerate(POSTS):
        author = accounts[i % len(accounts)]
        s, r = call("POST", "/post/json", author["token"],
                    {"content": text, "privacy": "PUBLIC"})
        pid = (r.get("result") or {}).get("id")
        if not pid:
            continue
        post_ids.append(pid)
        for j, acc in enumerate(accounts):
            if acc is author:
                continue
            if (i + j) % 2 == 0:
                call("POST", "/interaction/likes", acc["token"], {"postId": pid})
            if (i + j) % 3 == 0:
                call("POST", "/interaction/comments", acc["token"],
                     {"postId": pid, "content": COMMENTS[(i + j) % len(COMMENTS)],
                      "parentCommentId": None})
    print(f"    {len(post_ids)} bai viet")

    print("==> tao hang doi kiem duyet")
    spammer = accounts[0]
    s, r = call("POST", "/post/json", spammer["token"],
                {"content": SPAM_POST, "privacy": "PUBLIC"})
    spam_id = (r.get("result") or {}).get("id")

    # 1) Ho so dang cho xu ly: nhieu nguoi bao cao cung mot bai.
    if spam_id:
        for acc in accounts[1:]:
            call("POST", "/moderation/reports", acc["token"],
                 {"targetType": "POST", "targetId": spam_id, "reason": "SPAM",
                  "description": "Quang cao rac, dang lap lai."})

    # 2) Ho so da xu ly + dang cho xet khieu nai.
    victim = accounts[1]
    s, r = call("POST", "/post/json", victim["token"],
                {"content": "Bai viet bi bao cao nham de minh hoa luong khieu nai.",
                 "privacy": "PUBLIC"})
    appeal_post = (r.get("result") or {}).get("id")
    if appeal_post:
        s, r = call("POST", "/moderation/reports", accounts[2]["token"],
                    {"targetType": "POST", "targetId": appeal_post,
                     "reason": "MISINFORMATION", "description": "Nghi ngo sai su that."})
        case_id = (r.get("result") or {}).get("caseId")
        if case_id:
            call("POST", f"/moderation/cases/{case_id}/assign", admin)
            call("POST", f"/moderation/cases/{case_id}/decision", admin,
                 {"action": "HIDE_CONTENT", "note": "An tam de xac minh thong tin."})
            call("POST", "/moderation/appeals", victim["token"],
                 {"caseId": case_id,
                  "reason": "Noi dung cua toi co dan nguon, mong duoc xem xet lai."})

    print("==> tra identity-service ve log binh thuong")
    restart_identity(trace=False)

    print()
    print("==> Xong. Dang nhap thu:")
    for acc in accounts:
        print(f"    {acc['username']} / {PASSWORD}   ({acc['name']})")
    print(f"    admin / admin   (xem hang doi tai /admin/moderation)")
    return check()


if __name__ == "__main__":
    sys.exit(main())
