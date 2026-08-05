$url = 'https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/transactions?select=*'
$headers = @{
    apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTM3MDgsImV4cCI6MjA5NTYyOTcwOH0.TzfygcAWycghnlQWCZKjuAYVLPFw1aJ1lq2TPnm_n1Q'
    Authorization = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTM3MDgsImV4cCI6MjA5NTYyOTcwOH0.TzfygcAWycghnlQWCZKjuAYVLPFw1aJ1lq2TPnm_n1Q'
}

Invoke-RestMethod -Uri $url -Headers $headers | ConvertTo-Json -Depth 10 | Out-File transactions.json

$url2 = 'https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/patio_os?select=*'
Invoke-RestMethod -Uri $url2 -Headers $headers | ConvertTo-Json -Depth 10 | Out-File patio.json
