@echo off
echo Starting AI Interview 2026 Application...

REM ======================================
REM start Backend
REM ======================================
start cmd /k "cd backend && npm install && npm run dev"


REM ======================================
REM start Ollama + Mistral
REM ======================================
start cmd /k "cd ollama && npm install && npm run dev"

REM ======================================
REM start AI Service (FastAPI)
REM ======================================
start cmd /k "cd ai-service && pip install -r requirements.txt && python main.py"

REM ======================================
REM start Frontend
REM ======================================
start cmd /k "cd frontend && npm install && npm run dev"

echo All services Launched 
pause