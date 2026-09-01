import urllib.request, json, os

project_ref = os.getenv('SUPABASE_PROJECT_REF', 'cnwzsvowkfymtdiryhqc')
token = os.getenv('SUPABASE_ACCESS_TOKEN', '')
url = f'https://api.supabase.com/v1/projects/{project_ref}/database/query'

def run_query(sql_text, name):
    sql_text = sql_text.strip()
    if not sql_text:
        return
    print(f'Running [{name}]...')
    req = urllib.request.Request(
        url,
        data=json.dumps({'query': sql_text}).encode('utf-8'),
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'User-Agent': 'SupabaseCLI/2.116.0'
        }
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print(f' -> [{name}] Status: {resp.status}')
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8', errors='ignore')
        print(f' -> [{name}] Error {e.code}: {err_msg}')
        raise e

with open('supabase/migrations/20260901000001_fix_bank_balances_ofx_and_rede_reconciliation.sql', 'r', encoding='utf-8') as f:
    full_sql = f.read()

run_query(full_sql, 'Full Migration 20260901000001')

print('=== MIGRATION APPLIED SUCCESSFULLY! ===')
