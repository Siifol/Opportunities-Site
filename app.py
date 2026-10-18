import os
import re
from datetime import date, datetime
from functools import wraps

import psycopg2
import psycopg2.extras
from flask import Flask, request, jsonify, g
from itsdangerous import URLSafeTimedSerializer
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
DATABASE_URL = os.environ["DATABASE_URL"]
serializer = URLSafeTimedSerializer(os.environ.get("SECRET_KEY", "dev-only-change-me"))
TOKEN_AGE = 60 * 60 * 24 * 30  # 30 days

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    contact TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    country TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'applicant',
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS opportunities (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    title_en TEXT NOT NULL,
    title_am TEXT DEFAULT '',
    title_om TEXT DEFAULT '',
    description_en TEXT DEFAULT '',
    organization TEXT DEFAULT '',
    country TEXT DEFAULT 'Ethiopia',
    deadline DATE,
    apply_url TEXT DEFAULT '',
    published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    opportunity_id INTEGER REFERENCES opportunities(id),
    cover_note TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, opportunity_id)
);
"""


def q(sql, params=(), one=False, commit=False):
    """Run one SQL query. Returns rows (or one row) when the query returns data."""
    conn = psycopg2.connect(DATABASE_URL)
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(sql, params)
        result = None
        if cur.description is not None:
            result = cur.fetchone() if one else cur.fetchall()
        if commit:
            conn.commit()
        return result
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(SCHEMA)
        conn.commit()
    finally:
        conn.close()


init_db()


def clean(row):
    """Make a database row safe to send as JSON (dates become text)."""
    if row is None:
        return None
    return {k: (v.isoformat() if isinstance(v, (date, datetime)) else v) for k, v in row.items()}


def err(en, om, code=400):
    return jsonify({"status": "error", "message": en, "messageOm": om}), code


def public(u):
    return {"id": u["id"], "fullName": u["full_name"], "username": u["username"],
            "role": u["role"], "country": u["country"]}


def current_user():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        data = serializer.loads(auth[7:], max_age=TOKEN_AGE)
    except Exception:
        return None
    return q("SELECT * FROM users WHERE id = %s", (data["uid"],), one=True)


def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = current_user()
        if not user:
            return err("Please log in first.", "Maaloo dura seenaa.", 401)
        g.user = user
        return f(*args, **kwargs)
    return wrapper


def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = current_user()
        if not user or user["role"] != "admin":
            return err("Admins only.", "Bulchitoota qofaaf.", 403)
        g.user = user
        return f(*args, **kwargs)
    return wrapper


@app.after_request
def add_cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return resp


@app.get("/")
def health():
    return jsonify({"status": "ok", "site": "Opportunities.com"})


# ---------- Accounts ----------

@app.post("/register")
def register():
    d = request.get_json(silent=True) or {}
    full_name = (d.get("fullName") or "").strip()
    username = (d.get("username") or "").strip().lower()
    contact = (d.get("contact") or "").strip().lower()
    country = (d.get("country") or "").strip()
    password = d.get("password") or ""

    if not full_name:
        return err("Please enter your full name.", "Maaloo maqaa guutuu galchi.")
    if not re.fullmatch(r"[a-z0-9_.]{3,30}", username):
        return err("Username: 3-30 letters, numbers, _ or . only.",
                   "Maqaan fayyadamaa: 3-30, qubee, lakkoofsa, _ ykn . qofa.")
    if not contact:
        return err("Enter your email or phone.", "Imeelii ykn bilbila galchi.")
    if len(password) < 8:
        return err("Password must be at least 8 characters.", "Jechi iccitii 8 ol ta'uu qaba.")
    if q("SELECT id FROM users WHERE username = %s OR contact = %s", (username, contact), one=True):
        return err("Username or contact is already used.",
                   "Maqaan fayyadamaa ykn quunnamtiin kun fudhatamee jira.")

    u = q("""INSERT INTO users (full_name, username, contact, password_hash, country)
             VALUES (%s, %s, %s, %s, %s) RETURNING *""",
          (full_name, username, contact, generate_password_hash(password), country),
          one=True, commit=True)
    return jsonify({"status": "success", "token": serializer.dumps({"uid": u["id"]}),
                    "user": public(u)}), 201


@app.post("/login")
def login():
    d = request.get_json(silent=True) or {}
    ident = (d.get("contact") or "").strip().lower()
    password = d.get("password") or ""
    u = q("SELECT * FROM users WHERE contact = %s OR username = %s", (ident, ident), one=True)
    if not u or not check_password_hash(u["password_hash"], password):
        return err("Wrong contact or password.", "Quunnamtii ykn jecha iccitii dogoggora.", 401)
    return jsonify({"status": "success", "token": serializer.dumps({"uid": u["id"]}),
                    "user": public(u)})


@app.get("/me")
@login_required
def me():
    return jsonify({"status": "success", "user": public(g.user)})


# ---------- Opportunities (public) ----------

@app.get("/opportunities")
def list_opportunities():
    kind = request.args.get("type", "")
    country = request.args.get("country", "")
    search = request.args.get("q", "").strip()
    sql = "SELECT * FROM opportunities WHERE published = TRUE"
    params = []
    if kind:
        sql += " AND type = %s"
        params.append(kind)
    if country:
        sql += " AND country = %s"
        params.append(country)
    if search:
        sql += " AND (title_en ILIKE %s OR organization ILIKE %s)"
        params += [f"%{search}%", f"%{search}%"]
    sql += " ORDER BY deadline NULLS LAST, id DESC"
    rows = q(sql, tuple(params))
    return jsonify({"status": "success", "items": [clean(r) for r in rows]})


@app.get("/opportunities/<int:oid>")
def get_opportunity(oid):
    row = q("SELECT * FROM opportunities WHERE id = %s AND published = TRUE", (oid,), one=True)
    if not row:
        return err("Not found.", "Hin argamne.", 404)
    return jsonify({"status": "success", "item": clean(row)})


# ---------- Applying (login required) ----------

@app.post("/opportunities/<int:oid>/apply")
@login_required
def apply(oid):
    d = request.get_json(silent=True) or {}
    note = (d.get("coverNote") or "").strip()[:2000]
    if not q("SELECT id FROM opportunities WHERE id = %s AND published = TRUE", (oid,), one=True):
        return err("Not found.", "Hin argamne.", 404)
    if q("SELECT id FROM applications WHERE user_id = %s AND opportunity_id = %s",
         (g.user["id"], oid), one=True):
        return err("You already applied.", "Dursuun kana irratti galmaa'eera.", 409)
    q("INSERT INTO applications (user_id, opportunity_id, cover_note) VALUES (%s, %s, %s)",
      (g.user["id"], oid, note), commit=True)
    return jsonify({"status": "success"}), 201


@app.get("/my/applications")
@login_required
def my_applications():
    rows = q("""SELECT a.id, a.created_at, o.id AS opportunity_id, o.title_en, o.type,
                       o.organization, o.deadline
                FROM applications a JOIN opportunities o ON o.id = a.opportunity_id
                WHERE a.user_id = %s ORDER BY a.created_at DESC""", (g.user["id"],))
    return jsonify({"status": "success", "items": [clean(r) for r in rows]})


# ---------- Admin only ----------

@app.post("/admin/opportunities")
@admin_required
def add_opportunity():
    d = request.get_json(silent=True) or {}
    kind = d.get("type")
    title = (d.get("titleEn") or "").strip()
    if kind not in ("job", "scholarship", "other"):
        return err("Type must be job, scholarship or other.", "Gosi job, scholarship ykn other ta'uu qaba.")
    if not title:
        return err("English title is required.", "Mata-duree Ingliffaan barbaachisaa.")
    row = q("""INSERT INTO opportunities (type, title_en, title_am, title_om, description_en,
                                          organization, country, deadline, apply_url)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
            (kind, title, d.get("titleAm") or "", d.get("titleOm") or "",
             d.get("descriptionEn") or "", d.get("organization") or "",
             d.get("country") or "Ethiopia", d.get("deadline") or None,
             d.get("applyUrl") or ""),
            one=True, commit=True)
    return jsonify({"status": "success", "item": clean(row)}), 201


@app.post("/admin/opportunities/<int:oid>/hide")
@admin_required
def hide_opportunity(oid):
    q("UPDATE opportunities SET published = FALSE WHERE id = %s", (oid,), commit=True)
    return jsonify({"status": "success"})


@app.get("/admin/applications")
@admin_required
def all_applications():
    rows = q("""SELECT a.id, a.created_at, a.cover_note, u.full_name, u.contact, u.country,
                       o.title_en
                FROM applications a
                JOIN users u ON u.id = a.user_id
                JOIN opportunities o ON o.id = a.opportunity_id
                ORDER BY a.created_at DESC""")
    return jsonify({"status": "success", "items": [clean(r) for r in rows]})


if __name__ == "__main__":
    app.run(debug=True)
