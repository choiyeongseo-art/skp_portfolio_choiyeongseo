"""Add the site-wide guide catalog without publishing any pending draft edits.

Run once from the project root: python server/upgrade_site_guides.py
Existing answers, custom nodes, privacy settings and all version history are preserved.
"""
import copy
import json
from contextlib import closing
import server as cms


def extend(content, seed):
    result = copy.deepcopy(content)
    nodes = result['nodes']
    for key, value in seed['nodes'].items():
        if key.startswith('site_') and key not in nodes:
            nodes[key] = copy.deepcopy(value)
    original_title = '대시보드 안내'
    original_subtitle = '등록된 내용으로 안내하는 메뉴형 도우미'
    original_home = '안녕하세요. SNS 성과 대시보드 안내 도우미입니다. 조회수와 콘텐츠 인사이트를 안내하는 공간입니다. 아래 메뉴를 선택해 주시기 바랍니다.'
    for key, original in [('title', original_title), ('subtitle', original_subtitle)]:
        if result.get(key) == original:
            result[key] = seed[key]
    if nodes['home']['answer'] == original_home:
        nodes['home']['answer'] = seed['nodes']['home']['answer']
    existing = {b['next'] for b in nodes['home']['buttons']}
    additions = [copy.deepcopy(b) for b in seed['nodes']['home']['buttons'] if b['next'].startswith('site_') and b['next'] not in existing]
    nodes['home']['buttons'] = additions + nodes['home']['buttons']
    if 'faq' in nodes and not any(b['next'] == 'site_overview' for b in nodes['faq']['buttons']):
        nodes['faq']['buttons'].append({'label': '사이트 이용 안내', 'next': 'site_overview'})
    for key in ['today', 'week', 'metrics', 'basis', 'rate', 'improve', 'contact']:
        if key not in nodes:
            continue
        links = nodes[key].setdefault('links', [])
        for link in seed['nodes'].get(key, {}).get('links', []):
            if not any(existing['href'] == link['href'] for existing in links):
                links.append(copy.deepcopy(link))
    guides = result.setdefault('pageGuides', {})
    for page, target in seed['pageGuides'].items():
        guides.setdefault(page, target)
    result['catalogRevision'] = 1
    return cms.validate_content(result)


def upgrade():
    cms.initialize()
    seed = json.loads((cms.ROOT / 'data' / 'chatbot.json').read_text(encoding='utf-8'))
    with closing(cms.connect()) as db:
        if json.loads(cms.current(db)['content']).get('catalogRevision', 0) >= 1:
            print('Site guide catalog is already installed.')
            return
        backup = cms.DB_PATH.with_name('backup-before-site-guides.sqlite3')
        with closing(cms.sqlite3.connect(backup)) as target:
            db.backup(target)
        with db:
            db.execute('begin immediate')
            published = cms.current(db)
            draft = db.execute('select * from draft where id=1').fetchone()
            content = extend(json.loads(published['content']), seed)
            draft_content = extend(json.loads(draft['content']), seed)
            version = published['id'] + 1
            content['version'] = version
            draft_content['version'] = version
            timestamp = cms.now()
            db.execute('insert into versions (id,content,note,created_at,author) values (?,?,?,?,?)',
                       (version, cms.dumps(content), '전체 페이지 안내 확장 · 페이지 이동과 현재 페이지 안내 추가', timestamp, 'admin'))
            db.execute('update draft set content=?,revision=revision+1,updated_at=? where id=1', (cms.dumps(draft_content), timestamp))
            db.execute('delete from previews')
        print(f'Site guide catalog published as v{version}; pending draft edits preserved; backup: {backup.name}')


if __name__ == '__main__':
    upgrade()
