#!/usr/bin/env python3
"""Rebuild browser bundles from the editable canonical JSON files."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def read(name):
    return json.loads((ROOT/name).read_text(encoding='utf-8'))
def write(name, value):
    (ROOT/name).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
study=read('study.json')
study['interview_questions']=read('interview.json')
definitions=read('definitions.json')
for item in study['interview_questions']:
    item['definitions']=[definition for definition in definitions if definition['studyQuestion']==item['number']]
mcqs=read('mcqs.json')
study['source_catalog']=mcqs['sourceCatalog']
write('study.json',study)
write('interview.json',study['interview_questions'])
for filename,variable,value in [('data.js','USUL_DATA',study),('mcqs.js','USUL_MCQS',mcqs)]:
    (ROOT/filename).write_text('window.'+variable+'='+json.dumps(value,ensure_ascii=False,separators=(',',':'))+';\n', encoding='utf-8')
write('content-source-map.json',{'sources':mcqs['sourceCatalog'],'definitions':[{'question':d['studyQuestion'],'term':d['term'],'sourceKey':d['sourceKey']} for d in definitions],'mcqs':[{'id':q['id'],'number':q['number'],'topic':q['topic'],'studyQuestion':q['studyQuestion'],'sourceKey':q['sourceKey']} for q in mcqs['questions']]})
print('Browser bundles and source map rebuilt. Run npm test to validate.')
