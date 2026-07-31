$git = "C:\Users\admin\.gemini\antigravity\scratch\mingit\cmd\git.exe"

& $git config user.email "ai@clawhub.com"
& $git config user.name "ClawHub Agent"

& $git add .
& $git commit -m "feat(chat-ux-bot-fix): refactor MessageList UI and add Edge Function fallbacks"
& $git push origin main
