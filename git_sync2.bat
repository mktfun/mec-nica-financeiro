@echo off
cd /d c:\Users\User\.gemini\antigravity\repos\mec-nica-financeiro
C:\Users\User\.gemini\antigravity\scratch\mingit\cmd\git.exe add -A
C:\Users\User\.gemini\antigravity\scratch\mingit\cmd\git.exe commit -m "chore: commit all"
C:\Users\User\.gemini\antigravity\scratch\mingit\cmd\git.exe pull origin main --rebase
C:\Users\User\.gemini\antigravity\scratch\mingit\cmd\git.exe push origin main
