#!/usr/bin/env python3
"""Tao 7 tai khoan ChillNet, moi acc dang random 6-8 bai lay tu bo du lieu raw
da tai ve (scripts/fetch-minio-pool.py).

    scripts/seed-from-minio.py <pool_dir>

Yeu cau: stack dang chay (docker infra + scripts/run-all.sh).
Doc OTP tu logs/identity-service.log nen se restart identity-service o che do TRACE
roi tra lai binh thuong (giong scripts/seed-demo.py).
"""
import json, os, re, signal, subprocess, sys, time, random, mimetypes, uuid
import urllib.error, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = os.environ.get("CHILLNET_API", "http://127.0.0.1:8080/api/v1")
IDENTITY_LOG = os.path.join(ROOT, "logs", "identity-service.log")
IDENTITY_PID = os.path.join(ROOT, "logs", "pids", "identity-service.pid")
PASSWORD = "Password@123"

USERS = [
    ("an",    "An",    "Nguyen"),
    ("binh",  "Binh",  "Le"),
    ("chi",   "Chi",   "Tran"),
    ("dung",  "Dung",  "Pham"),
    ("giang", "Giang", "Vo"),
    ("ha",    "Ha",    "Do"),
    ("kien",  "Kien",  "Bui"),
]


def call(method, path, token=None, body=None, timeout=60):
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
            return e.code, {"raw": raw[:300]}
    except Exception as e:
        return 0, {"raw": str(e)}


def post_multipart(path, token, fields, files, timeout=120):
    """fields: {name: str}; files: list of (field, filename, bytes, content_type)."""
    boundary = "----chillnet" + uuid.uuid4().hex
    body = bytearray()
    for k, v in fields.items():
        body += f"--{boundary}\r\n".encode()
        body += f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode()
        body += v.encode("utf-8") + b"\r\n"
    for field, fname, data, ctype in files:
        body += f"--{boundary}\r\n".encode()
        body += (f'Content-Disposition: form-data; name="{field}"; '
                 f'filename="{fname}"\r\n').encode()
        body += f"Content-Type: {ctype}\r\n\r\n".encode()
        body += data + b"\r\n"
    body += f"--{boundary}--\r\n".encode()
    req = urllib.request.Request(API + path, data=bytes(body), method="POST")
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"raw": raw[:300]}
    except Exception as e:
        return 0, {"raw": str(e)}


def login(username, password):
    _, r = call("POST", "/identity/auth/token",
                body={"username": username, "password": password})
    return (r.get("result") or {}).get("token")


LOGIN_GAP = 13
_last_login = [0.0]


def paced_login(username, password):
    wait = LOGIN_GAP - (time.time() - _last_login[0])
    if wait > 0:
        time.sleep(wait)
    _last_login[0] = time.time()
    return login(username, password)


def restart_identity(trace):
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
    log = open(IDENTITY_LOG, "w")
    p = subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT, cwd=ROOT, env=env)
    with open(IDENTITY_PID, "w") as f:
        f.write(str(p.pid))
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


def create_account(slug, first, last, stamp):
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
    for _ in range(15):
        time.sleep(0.6)
        codes = otp_after(offset)
        if codes:
            break
    if not codes:
        print(f"    !! khong doc duoc OTP cho {username}")
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
    return {"username": username, "name": f"{first} {last}", "token": token}


def load_pool(pool):
    with open(os.path.join(pool, "manifest.json")) as f:
        manifest = json.load(f)
    random.shuffle(manifest)
    return manifest


def main():
    if len(sys.argv) < 2:
        print("Dung: seed-from-minio.py <pool_dir>")
        return 1
    pool = sys.argv[1]
    manifest = load_pool(pool)
    print(f"==> pool: {len(manifest)} bai kha dung")

    stamp = str(int(time.time()))[-6:]
    print("==> restart identity-service (che do doc OTP)")
    if not restart_identity(trace=True):
        print("!! identity-service khong len")
        return 1

    print(f"==> tao {len(USERS)} tai khoan")
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

    print("==> dang bai (random 6-8 bai/acc, kem anh that)")
    idx = 0
    total_ok = 0
    for acc in accounts:
        n = random.randint(6, 8)
        made = 0
        for _ in range(n):
            if idx >= len(manifest):
                break
            item = manifest[idx]; idx += 1
            d = os.path.join(pool, item["id"])
            files = []
            for name in item["images"]:
                fp = os.path.join(d, name)
                if not os.path.exists(fp):
                    continue
                ctype = mimetypes.guess_type(name)[0] or "image/jpeg"
                with open(fp, "rb") as f:
                    files.append(("images", name, f.read(), ctype))
            if not files:
                continue
            content = item["message"]
            s, r = post_multipart("/post/create", acc["token"],
                                  {"content": content, "privacy": "PUBLIC"}, files)
            if s == 200 and (r.get("result") or {}).get("id"):
                made += 1; total_ok += 1
            else:
                print(f"    !! {acc['username']} dang bai loi: {s} "
                      f"{r.get('message') or r.get('raw')}")
            time.sleep(0.4)
        print(f"    {acc['username']}: {made} bai")

    print("==> tra identity-service ve binh thuong")
    restart_identity(trace=False)

    print(f"\n==> XONG: {total_ok} bai tu {len(accounts)} tai khoan")
    print("Tai khoan (mat khau chung: %s):" % PASSWORD)
    for a in accounts:
        print(f"    {a['username']}   ({a['name']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
