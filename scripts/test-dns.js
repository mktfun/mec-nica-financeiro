import dns from 'dns/promises';

async function testDns() {
  const names = [
    'cnwzsvowkfymtdiryhqc.supabase.co',
    'db.cnwzsvowkfymtdiryhqc.supabase.co',
    'aws-0-sa-east-1.pooler.supabase.com',
    'aws-0-us-east-1.pooler.supabase.com',
    'aws-0-us-west-1.pooler.supabase.com'
  ];

  for (const name of names) {
    try {
      const res = await dns.lookup(name);
      console.log(`DNS lookup ${name} ->`, res.address);
    } catch (err) {
      console.log(`DNS lookup ${name} -> ERROR:`, err.message);
    }
  }
}

testDns();
