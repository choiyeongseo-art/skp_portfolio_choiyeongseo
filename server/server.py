"""Persistent dashboard CMS. Python 3.10+, no dependencies for local use.

Run: python server/server.py
Production WSGI entry point: server.server:application
"""
from __future__ import annotations

import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import sqlite3
import threading
import time
from contextlib import closing
from datetime import datetime, timezone
from http.cookies import SimpleCookie
from pathlib import Path
from urllib.parse import parse_qs, unquote
from wsgiref.simple_server import WSGIServer, make_server
from socketserver import ThreadingMixIn
from wsgiref.util import FileWrapper

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.environ.get('CHATBOT_DB', str(ROOT / 'server' / 'var' / 'chatbot.sqlite3')))
INIT_LOCK = threading.Lock()
INITIALIZED = False
SESSION_SECONDS = 8 * 60 * 60
MAX_BODY = 300_000


class APIError(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message


def now():
    return datetime.now(timezone.utc).isoformat()


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 600_000).hex()
    return f'{salt}:{digest}'


def valid_password(password, stored):
    salt = stored.split(':')[0]
    return hmac.compare_digest(hash_password(password, salt), stored)


def dumps(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def validate_content(content):
    def text(value, limit, name, empty=False):
        if not isinstance(value, str) or len(value) > limit or (not empty and not value.strip()):
            raise APIError(400, f'{name} 항목을 확인해 주시기 바랍니다. (최대 {limit}자)')
    if not isinstance(content, dict):
        raise APIError(400, '안내 데이터는 JSON 객체여야 합니다.')
    for key, limit in [('title', 80), ('subtitle', 160), ('fallback', 1000)]:
        text(content.get(key), limit, key)
    controls = content.get('controls')
    if not isinstance(controls, dict):
        raise APIError(400, '대화 이동 버튼 설정이 필요합니다.')
    for key in ['back', 'home', 'reset']:
        text(controls.get(key), 40, key)
    nodes = content.get('nodes')
    if not isinstance(nodes, dict) or 'home' not in nodes or not 1 <= len(nodes) <= 100:
        raise APIError(400, '시작 단계(home)를 포함한 1~100개 단계가 필요합니다.')
    for key, node in nodes.items():
        if not re.fullmatch(r'[a-z][a-z0-9_-]{0,39}', key) or key in ['constructor', 'prototype', '__proto__']:
            raise APIError(400, f'단계 ID가 올바르지 않습니다: {key}')
        if not isinstance(node, dict):
            raise APIError(400, f'{key}: 단계 형식이 올바르지 않습니다.')
        text(node.get('answer'), 3000, f'{key} 답변')
        keywords = node.get('keywords')
        buttons = node.get('buttons')
        if not isinstance(keywords, list) or len(keywords) > 40:
            raise APIError(400, f'{key}: 키워드는 최대 40개입니다.')
        for keyword in keywords:
            text(keyword, 100, f'{key} 키워드')
            if not re.sub(r'[\W_]+', '', keyword, flags=re.UNICODE):
                raise APIError(400, f'{key}: 기호만 있는 키워드는 사용할 수 없습니다.')
        if not isinstance(buttons, list) or len(buttons) > 12:
            raise APIError(400, f'{key}: 선택지는 최대 12개입니다.')
        for button in buttons:
            if not isinstance(button, dict):
                raise APIError(400, f'{key}: 버튼 형식이 올바르지 않습니다.')
            text(button.get('label'), 80, f'{key} 버튼명')
            if not isinstance(button.get('next'), str) or button['next'] not in nodes:
                raise APIError(400, f'{key}: 다음 단계가 존재하지 않습니다.')
        if node.get('form') not in (None, 'inquiry'):
            raise APIError(400, f'{key}: 지원하지 않는 양식입니다.')
        links = node.get('links', [])
        if not isinstance(links, list) or len(links) > 12:
            raise APIError(400, f'{key}: 페이지 링크는 최대 12개입니다.')
        for link in links:
            if not isinstance(link, dict):
                raise APIError(400, f'{key}: 페이지 링크 형식이 올바르지 않습니다.')
            text(link.get('label'), 80, f'{key} 페이지 링크명')
            href = link.get('href')
            if not isinstance(href, str) or not re.fullmatch(r'[a-z][a-z0-9-]*\.html(?:[?#][^\s\\<>]*)?', href) or not (ROOT / re.split(r'[?#]', href)[0]).is_file():
                raise APIError(400, f'{key}: 사이트 내부 HTML 페이지 경로를 입력해 주시기 바랍니다.')
    guides = content.get('pageGuides', {})
    if not isinstance(guides, dict):
        raise APIError(400, '페이지별 안내 연결을 확인해 주시기 바랍니다.')
    for page, target in guides.items():
        if not re.fullmatch(r'[a-z][a-z0-9-]*\.html', page) or not (ROOT / page).is_file() or not isinstance(target, str) or target not in nodes:
            raise APIError(400, f'페이지 안내 연결이 올바르지 않습니다: {page}')
    inquiry = content.get('inquiry', {})
    if not isinstance(inquiry, dict):
        raise APIError(400, '문의 개인정보 안내 설정이 올바르지 않습니다.')
    if any(node.get('form') == 'inquiry' for node in nodes.values()):
        text(inquiry.get('controller'), 120, '개인정보 수집 주체')
        text(inquiry.get('purpose'), 300, '개인정보 수집 목적')
        if type(inquiry.get('retentionDays')) is not int or not 1 <= inquiry['retentionDays'] <= 365:
            raise APIError(400, '문의 보관 기간은 1~365일입니다.')
    return content


def connect():
    db = sqlite3.connect(DB_PATH, timeout=15)
    db.row_factory = sqlite3.Row
    return db


def initialize():
    global INITIALIZED
    if INITIALIZED:
        return
    with INIT_LOCK:
        if INITIALIZED:
            return
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        with closing(connect()) as db, db:
            db.execute('pragma journal_mode=WAL')
            db.executescript('''
                create table if not exists users (username text primary key, password text not null);
                create table if not exists sessions (id text primary key, username text, csrf text, expires real);
                create table if not exists versions (
                    id integer primary key autoincrement, content text not null,
                    note text not null, created_at text not null, author text not null);
                create table if not exists draft (id integer primary key check(id=1), content text, revision integer, updated_at text);
                create table if not exists previews (id text primary key, session_id text, content text,
                    base_version integer, draft_revision integer, expires real);
                create table if not exists inquiries (
                    id integer primary key autoincrement, name text, email text, message text,
                    consented_at text, created_at text, expires real, status text default 'new');
                create table if not exists rate_limits (key text primary key, count integer, expires real);
            ''')
            if not db.execute('select 1 from users limit 1').fetchone():
                password = os.environ.get('ADMIN_PASSWORD', '1234')
                db.execute('insert into users values (?, ?)', ('admin', hash_password(password)))
            if not db.execute('select 1 from versions limit 1').fetchone():
                content = validate_content(json.loads((ROOT / 'data' / 'chatbot.json').read_text(encoding='utf-8')))
                content['version'] = 1
                db.execute('insert into versions (content,note,created_at,author) values (?,?,?,?)',
                           (dumps(content), '최초 등록', now(), 'admin'))
                db.execute('insert into draft values (1,?,?,?)', (dumps(content), 1, now()))
        INITIALIZED = True


def current(db):
    return db.execute('select * from versions order by id desc limit 1').fetchone()


def prune(db):
    timestamp = time.time()
    for table in ['sessions', 'previews', 'inquiries', 'rate_limits']:
        db.execute(f'delete from {table} where expires < ?', (timestamp,))


def limit(db, key, maximum, seconds):
    key = hashlib.sha256(key.encode()).hexdigest()
    db.execute('delete from rate_limits where key=? and expires < ?', (key, time.time()))
    row = db.execute('select count from rate_limits where key=?', (key,)).fetchone()
    if row and row['count'] >= maximum:
        raise APIError(429, '요청이 많습니다. 잠시 후 다시 시도해 주시기 바랍니다.')
    db.execute('insert into rate_limits values (?,1,?) on conflict(key) do update set count=count+1',
               (key, time.time() + seconds))
    db.commit()


class Request:
    def __init__(self, env):
        self.env = env
        self.path = unquote(env.get('PATH_INFO', '/'))
        self.method = env.get('REQUEST_METHOD', 'GET')
        self.query = parse_qs(env.get('QUERY_STRING', ''))
        self.session = None

    def payload(self):
        if not self.env.get('CONTENT_TYPE', '').startswith('application/json'):
            raise APIError(415, 'JSON 요청만 지원합니다.')
        try:
            length = int(self.env.get('CONTENT_LENGTH') or 0)
            if length < 1 or length > MAX_BODY:
                raise APIError(413, '요청 크기가 올바르지 않습니다.')
            value = json.loads(self.env['wsgi.input'].read(length))
            if not isinstance(value, dict):
                raise ValueError()
            return value
        except (ValueError, UnicodeDecodeError):
            raise APIError(400, '요청 내용을 확인해 주시기 바랍니다.')

    def same_origin(self):
        origin = self.env.get('HTTP_ORIGIN')
        if origin and origin.rstrip('/') != f'{self.scheme()}://{self.env.get("HTTP_HOST")}':
            raise APIError(403, '다른 사이트에서 보낸 요청은 허용되지 않습니다.')

    def scheme(self):
        if os.environ.get('TRUST_PROXY') == '1' and self.env.get('HTTP_X_FORWARDED_PROTO') == 'https':
            return 'https'
        return self.env.get('wsgi.url_scheme', 'http')

    def auth(self, db, csrf=False):
        cookie = SimpleCookie()
        try:
            cookie.load(self.env.get('HTTP_COOKIE', ''))
            token = cookie['chatbot_admin'].value if 'chatbot_admin' in cookie else ''
        except Exception:
            token = ''
        sid = hashlib.sha256(token.encode()).hexdigest()
        row = db.execute('select * from sessions where id=? and expires>?', (sid, time.time())).fetchone()
        if not row:
            raise APIError(401, '관리자 로그인이 필요합니다.')
        if csrf and not hmac.compare_digest(row['csrf'], self.env.get('HTTP_X_CSRF_TOKEN', '')):
            raise APIError(403, '인증 정보가 만료되었습니다. 다시 로그인해 주시기 바랍니다.')
        self.session = row
        return row


def json_response(value, status=200, headers=None):
    return status, [('Content-Type', 'application/json; charset=utf-8'), *(headers or [])], [dumps(value).encode()]


def dispatch(req, db):
    path, method = req.path, req.method
    if method not in ['GET', 'HEAD', 'POST']:
        raise APIError(405, '지원하지 않는 요청 방식입니다.')
    if method == 'POST':
        req.same_origin()
    if path == '/api/studio/status' and method == 'GET':
        return json_response({'service': 'chatbot-studio', 'loginPath': '/admin/login'},
                             headers=[('Access-Control-Allow-Origin', '*')])
    if path == '/api/admin/login' and method == 'POST':
        payload = req.payload()
        limit(db, 'login:' + req.env.get('REMOTE_ADDR', ''), 8, 600)
        username, password = payload.get('username', ''), payload.get('password', '')
        if not isinstance(username, str) or not isinstance(password, str) or len(password) > 256:
            raise APIError(400, '아이디와 비밀번호를 확인해 주시기 바랍니다.')
        user = db.execute('select * from users where username=?', (username,)).fetchone()
        if not user or not valid_password(password, user['password']):
            raise APIError(401, '아이디 또는 비밀번호가 올바르지 않습니다.')
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        db.execute('insert into sessions values (?,?,?,?)',
                   (hashlib.sha256(token.encode()).hexdigest(), username, csrf, time.time() + SESSION_SECONDS))
        cookie = f'chatbot_admin={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age={SESSION_SECONDS}'
        if req.scheme() == 'https':
            cookie += '; Secure'
        return json_response({'username': username, 'csrf': csrf}, headers=[('Set-Cookie', cookie)])
    if path == '/data/chatbot.json' and method in ['GET', 'HEAD']:
        return json_response(json.loads(current(db)['content']))
    if path == '/api/inquiries' and method == 'POST':
        payload = req.payload()
        data = json.loads(current(db)['content'])
        if not any(n.get('form') == 'inquiry' for n in data['nodes'].values()):
            raise APIError(404, '현재 문의 접수를 운영하지 않습니다.')
        name, email, message = [payload.get(k, '') for k in ['name', 'email', 'message']]
        if (not all(isinstance(v, str) for v in [name, email, message]) or
            not 1 <= len(name.strip()) <= 80 or not 1 <= len(message.strip()) <= 3000 or
            len(email) > 254 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email) or
            payload.get('consent') is not True):
            raise APIError(400, '이름·이메일·문의 내용과 개인정보 동의를 확인해 주시기 바랍니다.')
        # Bind consent to exactly the published notice the visitor saw.
        if payload.get('version') != data['version']:
            raise APIError(409, '문의 안내가 변경되었습니다. 페이지를 새로고침하고 다시 동의해 주시기 바랍니다.')
        limit(db, 'inquiry:' + req.env.get('REMOTE_ADDR', ''), 5, 600)
        timestamp = now()
        cursor = db.execute('insert into inquiries (name,email,message,consented_at,created_at,expires) values (?,?,?,?,?,?)',
                            (name.strip(), email.strip(), message.strip(), timestamp, timestamp,
                             time.time() + data['inquiry']['retentionDays'] * 86400))
        return json_response({'id': cursor.lastrowid, 'message': '문의 접수가 완료되었습니다.'}, 201)
    if path.startswith('/api/admin/'):
        session = req.auth(db, csrf=method == 'POST')
        if path == '/api/admin/session' and method == 'GET':
            return json_response({'username': session['username'], 'csrf': session['csrf']})
        if path == '/api/admin/logout' and method == 'POST':
            db.execute('delete from sessions where id=?', (session['id'],))
            return json_response({'ok': True}, headers=[('Set-Cookie', 'chatbot_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')])
        if path == '/api/admin/state' and method == 'GET':
            published = current(db)
            draft = db.execute('select * from draft where id=1').fetchone()
            return json_response({'publishedVersion': published['id'], 'publishedAt': published['created_at'],
                                  'draftRevision': draft['revision'], 'draftUpdatedAt': draft['updated_at'],
                                  'content': json.loads(draft['content'])})
        if path in ['/api/admin/draft', '/api/admin/preview'] and method == 'POST':
            payload = req.payload()
            content = validate_content(payload.get('content'))
            db.execute('begin immediate')
            draft = db.execute('select * from draft where id=1').fetchone()
            if payload.get('draftRevision') != draft['revision'] or payload.get('publishedVersion') != current(db)['id']:
                raise APIError(409, '다른 작업에서 데이터가 변경되었습니다. 새로 불러온 뒤 편집해 주시기 바랍니다.')
            content['version'] = current(db)['id']
            revision = draft['revision'] + 1
            db.execute('update draft set content=?,revision=?,updated_at=? where id=1', (dumps(content), revision, now()))
            result = {'draftRevision': revision, 'savedAt': now()}
            if path.endswith('/preview'):
                token = secrets.token_urlsafe(24)
                db.execute('insert into previews values (?,?,?,?,?,?)',
                           (token, session['id'], dumps(content), current(db)['id'], revision, time.time()+3600))
                result.update({'previewId': token, 'url': '/admin/preview?token=' + token})
            return json_response(result)
        if path == '/api/admin/preview' and method == 'GET':
            token = req.query.get('token', [''])[0]
            row = db.execute('select * from previews where id=? and session_id=? and expires>?',
                             (token, session['id'], time.time())).fetchone()
            if not row:
                raise APIError(404, '미리보기가 만료되었습니다. 다시 생성해 주시기 바랍니다.')
            content = json.loads(row['content'])
            content['version'] = 'preview-' + token
            return json_response(content)
        if path == '/api/admin/publish' and method == 'POST':
            payload = req.payload()
            db.execute('begin immediate')
            preview = db.execute('select * from previews where id=? and session_id=? and expires>?',
                                 (payload.get('previewId', ''), session['id'], time.time())).fetchone()
            if not preview:
                raise APIError(400, '미리보기를 먼저 생성해 내용을 확인해 주시기 바랍니다.')
            draft = db.execute('select * from draft where id=1').fetchone()
            if current(db)['id'] != preview['base_version'] or draft['revision'] != preview['draft_revision']:
                raise APIError(409, '미리보기 이후 내용이 변경되었습니다. 최신 초안을 다시 미리봐 주시기 바랍니다.')
            note = payload.get('note', '').strip() if isinstance(payload.get('note'), str) else ''
            if not note or len(note) > 200:
                raise APIError(400, '게시 메모를 1~200자로 입력해 주시기 바랍니다.')
            content = validate_content(json.loads(preview['content']))
            version = current(db)['id'] + 1
            content['version'] = version
            timestamp = now()
            db.execute('insert into versions (id,content,note,created_at,author) values (?,?,?,?,?)',
                       (version, dumps(content), note, timestamp, session['username']))
            db.execute('update draft set content=?,revision=revision+1,updated_at=? where id=1', (dumps(content), timestamp))
            db.execute('delete from previews')
            return json_response({'version': version, 'publishedAt': timestamp})
        if path == '/api/admin/versions' and method == 'GET':
            rows = db.execute('select id,note,created_at,author from versions order by id desc').fetchall()
            return json_response({'currentVersion': current(db)['id'], 'versions': [dict(r) for r in rows]})
        if re.fullmatch(r'/api/admin/versions/\d+', path) and method == 'GET':
            row = db.execute('select * from versions where id=?', (int(path.rsplit('/', 1)[1]),)).fetchone()
            if not row:
                raise APIError(404, '게시 버전을 찾지 못했습니다.')
            return json_response({'version': row['id'], 'content': json.loads(row['content']), 'note': row['note']})
        if path == '/api/admin/inquiries' and method == 'GET':
            rows = db.execute('select id,name,email,message,created_at,consented_at,status from inquiries order by id desc limit 500').fetchall()
            count = db.execute('select count(*) from inquiries').fetchone()[0]
            return json_response({'inquiries': [dict(r) for r in rows], 'total': count})
        if re.fullmatch(r'/api/admin/inquiries/\d+', path) and method == 'POST':
            payload = req.payload()
            if payload.get('status') not in ['new', 'read', 'done']:
                raise APIError(400, '문의 상태를 확인해 주시기 바랍니다.')
            cursor = db.execute('update inquiries set status=? where id=?', (payload['status'], int(path.rsplit('/', 1)[1])))
            if not cursor.rowcount:
                raise APIError(404, '문의 내역을 찾지 못했습니다.')
            return json_response({'ok': True})
        if path == '/api/admin/password' and method == 'POST':
            payload = req.payload()
            user = db.execute('select * from users where username=?', (session['username'],)).fetchone()
            old, new = payload.get('currentPassword'), payload.get('newPassword')
            limit(db, 'password:' + session['id'], 8, 600)
            if not isinstance(old, str) or len(old) > 256 or not valid_password(old, user['password']):
                raise APIError(400, '현재 비밀번호가 올바르지 않습니다.')
            if not isinstance(new, str) or not 8 <= len(new) <= 128:
                raise APIError(400, '새 비밀번호는 8~128자로 입력해 주시기 바랍니다.')
            db.execute('update users set password=? where username=?', (hash_password(new), session['username']))
            db.execute('delete from sessions where username=?', (session['username'],))
            return json_response({'ok': True})
        raise APIError(404, '요청한 관리 기능을 찾지 못했습니다.')
    if path.startswith('/api/'):
        raise APIError(404, '요청한 기능을 찾지 못했습니다.')
    if method not in ['GET', 'HEAD']:
        raise APIError(405, '지원하지 않는 요청 방식입니다.')
    # Private HTML is never served to unauthenticated visitors.
    if path in ['/admin', '/admin/', '/admin.html', '/admin/preview', '/admin-preview.html']:
        try:
            req.auth(db)
        except APIError:
            return 302, [('Location', '/admin/login')], []
        file = ROOT / 'server' / ('preview.html' if path in ['/admin/preview', '/admin-preview.html'] else 'admin.html')
    elif path in ['/admin/login', '/admin/login/']:
        file = ROOT / 'server' / 'login.html'
    else:
        relative = path.lstrip('/') or 'index.html'
        file = (ROOT / relative).resolve()
        if not file.is_relative_to(ROOT) or any(part.startswith('.') for part in Path(relative).parts):
            raise APIError(404, '페이지를 찾지 못했습니다.')
        allowed = (file.parent == ROOT and file.suffix == '.html') or (
            relative.startswith('assets/') and file.suffix.lower() in ['.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.mp4', '.wav', '.mp3', '.ttf', '.woff', '.woff2'])
        if not allowed:
            raise APIError(404, '페이지를 찾지 못했습니다.')
    if not file.is_file():
        raise APIError(404, '페이지를 찾지 못했습니다.')
    content_type = mimetypes.guess_type(str(file))[0] or 'application/octet-stream'
    if file.suffix in ['.html', '.js', '.css']:
        content_type += '; charset=utf-8'
    size = file.stat().st_size
    headers = [('Content-Type', content_type), ('Accept-Ranges', 'bytes')]
    match = re.fullmatch(r'bytes=(\d*)-(\d*)', req.env.get('HTTP_RANGE', ''))
    if match and (match[1] or match[2]):
        start = int(match[1]) if match[1] else max(0, size-int(match[2]))
        end = min(size-1, int(match[2])) if match[1] and match[2] else size-1
        if start > end or start >= size:
            return 416, [*headers, ('Content-Range', f'bytes */{size}')], []
        headers += [('Content-Range', f'bytes {start}-{end}/{size}'), ('Content-Length', str(end-start+1))]
        def chunks():
            with file.open('rb') as stream:
                stream.seek(start)
                remaining = end-start+1
                while remaining:
                    chunk = stream.read(min(65536, remaining))
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk
        return 206, headers, chunks()
    return 200, [*headers, ('Content-Length', str(size))], FileWrapper(file.open('rb'))


def application(env, start_response):
    initialize()
    req = Request(env)
    db = connect()
    try:
        if req.path.startswith(('/api/', '/admin')) or req.path == '/data/chatbot.json':
            prune(db)
            db.commit()
        status, headers, body = dispatch(req, db)
        db.commit()
    except APIError as error:
        db.rollback()
        status, headers, body = json_response({'error': error.message}, error.status)
    except Exception:
        db.rollback()
        import traceback
        traceback.print_exc()
        status, headers, body = json_response({'error': '서버 처리 중 오류가 발생했습니다.'}, 500)
    finally:
        db.close()
    labels = {200:'OK', 201:'Created', 206:'Partial Content', 302:'Found', 400:'Bad Request', 401:'Unauthorized', 403:'Forbidden', 404:'Not Found', 405:'Method Not Allowed', 409:'Conflict', 413:'Payload Too Large', 415:'Unsupported Media Type', 416:'Range Not Satisfiable', 429:'Too Many Requests', 500:'Internal Server Error'}
    headers += [('Cache-Control', 'no-store'), ('X-Content-Type-Options', 'nosniff'),
                ('Referrer-Policy', 'same-origin'), ('X-Frame-Options', 'SAMEORIGIN')]
    if req.path.startswith('/admin'):
        headers += [('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'")]
    start_response(f'{status} {labels.get(status, "Error")}', headers)
    if req.method == 'HEAD':
        if hasattr(body, 'close'):
            body.close()
        return []
    return body


class ThreadedServer(ThreadingMixIn, WSGIServer):
    daemon_threads = True


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    initialize()
    with make_server(args.host, args.port, application, server_class=ThreadedServer) as httpd:
        print(f'Dashboard: http://{args.host}:{httpd.server_port}/sns.html', flush=True)
        print(f'Admin: http://{args.host}:{httpd.server_port}/admin', flush=True)
        httpd.serve_forever()
