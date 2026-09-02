require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

async function updatePassword() {
  const query = `
    DO $$
    DECLARE
      v_user_id uuid;
    BEGIN
      SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@mecanicapopular.com.br';
      IF v_user_id IS NOT NULL THEN
        UPDATE auth.users 
        SET encrypted_password = crypt('Admin@123456', gen_salt('bf')),
            email_confirmed_at = NOW(),
            updated_at = NOW()
        WHERE id = v_user_id;
      ELSE
        INSERT INTO auth.users (
          instance_id,
          id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          recovery_sent_at,
          last_sign_in_at,
          raw_app_meta_data,
          raw_user_meta_data,
          created_at,
          updated_at,
          confirmation_token,
          email_change,
          email_change_token_new,
          recovery_token
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          gen_random_uuid(),
          'authenticated',
          'authenticated',
          'admin@mecanicapopular.com.br',
          crypt('Admin@123456', gen_salt('bf')),
          NOW(),
          NOW(),
          NOW(),
          '{"provider":"email","providers":["email"]}',
          '{"name":"Administrador"}',
          NOW(),
          NOW(),
          '',
          '',
          '',
          ''
        );
      END IF;
    END $$;
  `;

  console.log(`Setting admin password for project ${projectRef}...`);
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    console.error('Error:', await response.text());
  } else {
    console.log('✅ Admin user and password set successfully!');
  }
}

updatePassword().catch(console.error);
