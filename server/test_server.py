"""Run: python -m unittest discover -s server -p test_server.py -v"""
import copy
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from contextlib import closing

spec = importlib.util.spec_from_file_location('chatbot_test_server', Path(__file__).with_name('server.py'))
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


class CMSIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        server.DB_PATH = Path(self.temp.name) / 'cms.sqlite3'
        server.INITIALIZED = False
        self.cookie = ''
        self.csrf = ''

    def tearDown(self):
        self.temp.cleanup()

    def request(self, path, body=None, authenticated=True, csrf=True, origin=None):
        route, _, query = path.partition('?')
        raw = json.dumps(body).encode() if body is not None else b''
        env = {'REQUEST_METHOD':'POST' if body is not None else 'GET', 'PATH_INFO':route,
               'QUERY_STRING':query, 'CONTENT_TYPE':'application/json', 'CONTENT_LENGTH':str(len(raw)),
               'wsgi.input':io.BytesIO(raw), 'wsgi.url_scheme':'http', 'HTTP_HOST':'localhost:8000', 'REMOTE_ADDR':'127.0.0.1'}
        if authenticated:
            env['HTTP_COOKIE'] = self.cookie
        if csrf:
            env['HTTP_X_CSRF_TOKEN'] = self.csrf
        if origin:
            env['HTTP_ORIGIN'] = origin
        result = {}
        def start(status, headers):
            result['status'] = int(status.split()[0])
            result['headers'] = dict(headers)
        iterable = server.application(env, start)
        result['body'] = b''.join(iterable)
        if hasattr(iterable, 'close'):
            iterable.close()
        try:
            result['json'] = json.loads(result['body'])
        except ValueError:
            pass
        return result

    def login(self, password='1234'):
        r = self.request('/api/admin/login', {'username':'admin', 'password':password})
        self.assertEqual(r['status'], 200)
        self.cookie = r['headers']['Set-Cookie'].split(';')[0]
        self.csrf = r['json']['csrf']
        return r

    def test_studio_entry_and_public_discovery(self):
        entry = self.request('/chatbot-studio.html', authenticated=False)
        self.assertEqual(entry['status'], 200)
        self.assertIn('studio-entry.js'.encode(), entry['body'])
        discovery = self.request('/api/studio/status', authenticated=False)
        self.assertEqual(discovery['status'], 200)
        self.assertEqual(discovery['json'], {'service': 'chatbot-studio', 'loginPath': '/admin/login'})
        self.assertEqual(discovery['headers']['Access-Control-Allow-Origin'], '*')
        self.assertNotIn('Set-Cookie', discovery['headers'])
        self.assertEqual(self.request('/admin/login', authenticated=False)['status'], 200)
        self.assertEqual(self.request('/api/admin/state', authenticated=False)['status'], 401)

    def test_authentication_and_private_files(self):
        for path in ['/api/admin/state', '/api/admin/inquiries', '/api/admin/versions', '/api/admin/preview?token=nope']:
            self.assertEqual(self.request(path, authenticated=False)['status'], 401)
        self.assertEqual(self.request('/admin')['status'], 302)
        for path in ['/server/admin.html', '/server/var/chatbot.sqlite3', '/server/server.py', '/.git/config', '/../server.py', '/assets/../server/admin.html']:
            self.assertEqual(self.request(path)['status'], 404, path)
        self.assertEqual(self.request('/api/admin/login', {'username':"admin' OR '1'='1", 'password':'no'})['status'], 401)
        r = self.login()
        self.assertIn('HttpOnly', r['headers']['Set-Cookie'])
        self.assertIn('SameSite=Strict', r['headers']['Set-Cookie'])
        self.assertEqual(self.request('/admin')['status'], 200)
        self.assertEqual(self.request('/api/admin/logout', {}, csrf=False)['status'], 403)
        self.assertEqual(self.request('/api/admin/logout', {}, origin='https://other.example')['status'], 403)
        self.assertEqual(self.request('/api/admin/logout', {})['status'], 200)
        self.assertEqual(self.request('/api/admin/state')['status'], 401)

    def test_draft_preview_publication_and_version_restore(self):
        self.login()
        public = self.request('/data/chatbot.json')['json']
        state = self.request('/api/admin/state')['json']
        content = copy.deepcopy(state['content'])
        content['nodes']['today']['answer'] = '게시 검증을 위한 새 안내입니다.'
        payload = {'content':content, 'draftRevision':state['draftRevision'], 'publishedVersion':state['publishedVersion']}
        saved = self.request('/api/admin/draft', payload)
        self.assertEqual(saved['status'], 200)
        self.assertEqual(self.request('/data/chatbot.json')['json'], public)
        self.assertEqual(self.request('/api/admin/publish', {'note':'미리보기 없이 게시'})['status'], 400)
        self.assertEqual(self.request('/api/admin/preview', payload)['status'], 409)
        payload['draftRevision'] = saved['json']['draftRevision']
        preview = self.request('/api/admin/preview', payload)['json']
        token = preview['previewId']
        viewed = self.request('/api/admin/preview?token=' + token)['json']
        self.assertEqual(viewed['nodes']['today']['answer'], content['nodes']['today']['answer'])
        self.assertEqual(self.request('/data/chatbot.json')['json'], public)
        posted = self.request('/api/admin/publish', {'previewId':token, 'note':'오늘 안내 업데이트'})
        self.assertEqual(posted['status'], 200)
        self.assertEqual(posted['json']['version'], 2)
        self.assertEqual(self.request('/data/chatbot.json')['json']['nodes']['today']['answer'], content['nodes']['today']['answer'])
        self.assertEqual(len(self.request('/api/admin/versions')['json']['versions']), 2)
        self.assertEqual(self.request('/api/admin/publish', {'previewId':token, 'note':'중복 게시'})['status'], 400)
        state = self.request('/api/admin/state')['json']
        old = self.request('/api/admin/versions/1')['json']['content']
        preview = self.request('/api/admin/preview', {'content':old, 'draftRevision':state['draftRevision'], 'publishedVersion':2})['json']
        self.assertEqual(self.request('/api/admin/publish', {'previewId':preview['previewId'], 'note':'v1 복원'})['json']['version'], 3)
        self.assertEqual(self.request('/data/chatbot.json')['json']['nodes'], public['nodes'])
        # Simulate a process restart; published versions remain in SQLite.
        server.INITIALIZED = False
        self.assertEqual(self.request('/data/chatbot.json')['json']['version'], 3)

    def test_invalid_branch_and_stale_preview_are_rejected(self):
        self.login()
        state = self.request('/api/admin/state')['json']
        content = copy.deepcopy(state['content'])
        content['nodes']['home']['buttons'][0]['next'] = 'missing-node'
        body = {'content':content, 'draftRevision':state['draftRevision'], 'publishedVersion':1}
        self.assertEqual(self.request('/api/admin/preview', body)['status'], 400)
        body['content'] = state['content']
        preview = self.request('/api/admin/preview', body)['json']
        body['draftRevision'] = preview['draftRevision']
        self.assertEqual(self.request('/api/admin/draft', body)['status'], 200)
        self.assertEqual(self.request('/api/admin/publish', {'previewId':preview['previewId'], 'note':'오래된 초안'})['status'], 409)
        self.assertEqual(self.request('/data/chatbot.json')['json']['version'], 1)

    def test_inquiry_consent_private_access_status_and_expiry(self):
        body = {'name':'테스트 사용자', 'email':'sample@example.com', 'message':'문의 검증 내용입니다.', 'consent':False, 'version':1}
        self.assertEqual(self.request('/api/inquiries', body)['status'], 400)
        body['consent'] = True
        body['version'] = 999
        self.assertEqual(self.request('/api/inquiries', body)['status'], 409)
        body['version'] = 1
        created = self.request('/api/inquiries', body)
        self.assertEqual(created['status'], 201)
        self.assertEqual(self.request('/api/admin/inquiries',authenticated=False)['status'], 401)
        self.login()
        rows = self.request('/api/admin/inquiries')['json']['inquiries']
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['message'], body['message'])
        self.assertTrue(rows[0]['consented_at'])
        self.assertEqual(self.request('/api/admin/inquiries/' + str(rows[0]['id']), {'status':'done'})['status'], 200)
        self.assertEqual(self.request('/api/admin/inquiries')['json']['inquiries'][0]['status'], 'done')
        with closing(server.connect()) as db, db:
            db.execute('update inquiries set expires=0')
        self.assertEqual(self.request('/api/admin/inquiries')['json']['inquiries'], [])

    def test_password_change_revokes_sessions(self):
        self.login()
        changed = self.request('/api/admin/password', {'currentPassword':'1234','newPassword':'updated-password-123'})
        self.assertEqual(changed['status'], 200)
        self.assertEqual(self.request('/api/admin/session')['status'], 401)
        self.assertEqual(self.request('/api/admin/login',{'username':'admin','password':'1234'})['status'], 401)
        self.login('updated-password-123')

    def test_site_links_and_page_guides_validation(self):
        self.login()
        state = self.request('/api/admin/state')['json']
        body = {'content':copy.deepcopy(state['content']), 'draftRevision':state['draftRevision'], 'publishedVersion':1}
        body['content']['nodes']['home']['links'] = [{'label':'외부 링크', 'href':'javascript:alert(1)'}]
        self.assertEqual(self.request('/api/admin/preview',body)['status'],400)
        body['content']['nodes']['home']['links'][0]['href'] = 'https://example.com/about.html'
        self.assertEqual(self.request('/api/admin/preview',body)['status'],400)
        body['content']['nodes']['home']['links'][0]['href'] = 'about.html'
        body['content']['pageGuides']['about.html'] = 'does_not_exist'
        self.assertEqual(self.request('/api/admin/preview',body)['status'],400)

    def test_catalog_upgrade_preserves_custom_published_and_pending_draft(self):
        self.login()
        content = self.request('/data/chatbot.json')['json']
        old = copy.deepcopy(content)
        old['nodes'] = {k:v for k,v in old['nodes'].items() if not k.startswith('site_')}
        for node in old['nodes'].values():
            node['buttons'] = [b for b in node['buttons'] if not b['next'].startswith('site_')]
        old.pop('pageGuides',None)
        old.pop('catalogRevision',None)
        old['title'] = '사용자가 수정한 제목'
        old['nodes']['today']['answer'] = '사용자가 이미 게시한 내용입니다.'
        pending = copy.deepcopy(old)
        pending['nodes']['today']['answer'] = '아직 게시하지 않은 초안입니다.'
        with closing(server.connect()) as db, db:
            db.execute('update versions set content=? where id=1',(server.dumps(old),))
            db.execute('update draft set content=? where id=1',(server.dumps(pending),))
        upgrade_spec = importlib.util.spec_from_file_location('upgrade_test',Path(__file__).with_name('upgrade_site_guides.py'))
        upgrade = importlib.util.module_from_spec(upgrade_spec)
        upgrade_spec.loader.exec_module(upgrade)
        upgrade.cms = server
        upgrade.upgrade()
        current = self.request('/data/chatbot.json')['json']
        state = self.request('/api/admin/state')['json']
        self.assertEqual(current['version'],2)
        self.assertEqual(current['title'],'사용자가 수정한 제목')
        self.assertEqual(current['nodes']['today']['answer'],'사용자가 이미 게시한 내용입니다.')
        self.assertEqual(state['content']['nodes']['today']['answer'],'아직 게시하지 않은 초안입니다.')
        self.assertIn('site_overview',current['nodes'])
        self.assertEqual(len(current['pageGuides']),13)
        upgrade.upgrade()
        self.assertEqual(self.request('/data/chatbot.json')['json']['version'],2)


if __name__ == '__main__':
    unittest.main()
