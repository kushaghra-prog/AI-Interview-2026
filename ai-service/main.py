import uvicorn
import os
import io
import json
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import Optional

import httpx


load_dotenv()

# ── Configuration ──
AI_PROVIDER = os.getenv("AI_PROVIDER", "ollama")  # "ollama" or "cloud"
AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "mixtral-8x7b-32768")
AI_API_URL = os.getenv("AI_API_URL", "https://api.groq.com/openai/v1")
OLLAMA_MODEL_NAME = os.getenv("OLLAMA_MODEL_NAME", "mistral")
WHISPER_ENABLED = os.getenv("WHISPER_ENABLED", "true").lower() == "true"
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base.en")
AI_SERVICE_PORT = int(os.getenv("PORT", os.getenv("AI_SERVICE_PORT", 8000)))

# ── Conditional Ollama import ──
ollama_client = None
if AI_PROVIDER == "ollama":
    try:
        import ollama
        ollama_client = ollama
        print(f"Ollama provider initialized with model: {OLLAMA_MODEL_NAME}")
    except ImportError:
        print("WARNING: ollama package not installed. Set AI_PROVIDER=cloud for production.")
    except Exception as e:
        print(f"WARNING: Ollama init failed: {e}")
else:
    print(f"Cloud provider initialized: {AI_API_URL} with model: {AI_MODEL}")

# ── FastAPI App ──
app = FastAPI(
    title="AI Interviewer Microservice",
    description="AI capabilities for the AI Interviewer application.",
    version="1.0.0",
)

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Whisper Model ──
WHISPER_MODEL = None
if WHISPER_ENABLED:
    try:
        import whisper
        print(f"Loading Whisper Model ({WHISPER_MODEL_SIZE})...")
        WHISPER_MODEL = whisper.load_model(WHISPER_MODEL_SIZE)
        print("Whisper Model Loaded Successfully")
    except Exception as e:
        print(f"Whisper loading failed (transcription disabled): {e}")
else:
    print("Whisper disabled via WHISPER_ENABLED=false")


# ── LLM Abstraction Layer ──
async def generate_llm_response(prompt: str, system_prompt: str, temperature: float = 0.6, json_mode: bool = False) -> str:
    """
    Routes LLM calls to either local Ollama or cloud API (Groq/OpenAI-compatible).
    Returns the raw text response.
    """
    if AI_PROVIDER == "ollama":
        if not ollama_client:
            raise HTTPException(status_code=503, detail="Ollama is not available. Set AI_PROVIDER=cloud for production.")
        kwargs = {
            "model": OLLAMA_MODEL_NAME,
            "prompt": prompt,
            "system": system_prompt,
            "options": {"temperature": temperature},
        }
        if json_mode:
            kwargs["format"] = "json"
        response = ollama_client.generate(**kwargs)
        return response["response"]
    else:
        # Cloud API (Groq / OpenAI-compatible)
        if not AI_API_KEY:
            raise HTTPException(status_code=503, detail="AI_API_KEY not set. Required for cloud AI provider.")

        headers = {
            "Authorization": f"Bearer {AI_API_KEY}",
            "Content-Type": "application/json",
        }
        body = {
            "model": AI_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            "temperature": temperature,
            "max_tokens": 4096,
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                resp = await client.post(f"{AI_API_URL}/chat/completions", headers=headers, json=body)
                if resp.status_code != 200:
                    error_detail = resp.text
                    print(f"Cloud API error {resp.status_code}: {error_detail}")
                    raise HTTPException(status_code=502, detail=f"Cloud AI API error: {resp.status_code} - {error_detail}")
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            except httpx.TimeoutException:
                raise HTTPException(status_code=504, detail="Cloud AI API request timed out")
            except httpx.RequestError as e:
                raise HTTPException(status_code=502, detail=f"Cloud AI API connection error: {str(e)}")


# ── Pydantic Models ──
class QuestionRequest(BaseModel):
    role: str = "MERN STACK DEVELOPER"
    level: str = "Junior"
    count: int = 5
    interview_type: str = "coding_mix"


class QuestionResponse(BaseModel):
    question: list[str]
    model_used: str


class EvaluationRequest(BaseModel):
    question: str
    question_type: str
    role: str
    level: str
    user_answer: Optional[str] = None
    user_code: Optional[str] = None


class EvaluationResponse(BaseModel):
    technicalScore: int
    confidenceScore: int
    aiFeedback: str
    idealAnswer: str


# ── Endpoints ──

@app.get("/")
async def root():
    return {
        "message": "AI Interviewer Microservice is running",
        "ai_provider": AI_PROVIDER,
        "model": AI_MODEL if AI_PROVIDER == "cloud" else OLLAMA_MODEL_NAME,
        "whisper_loaded": WHISPER_MODEL is not None,
        "status": "healthy",
    }


@app.post("/generate-question", response_model=QuestionResponse)
async def generate_question(request: QuestionRequest):
    try:
        if request.interview_type in ("coding_mix", "coding-mixed"):
            coding_count = max(1, int(request.count * 0.4))
            oral_count = int(request.count) - coding_count
            instructions = (
                f"The First {coding_count} questions MUST be coding challenges. "
                f"The remaining {oral_count} questions MUST be oral/conceptual questions. "
                "CODING QUESTION FORMAT (MUST follow exactly): "
                "Write a function called <function_name> that <description>. "
                "Include 2-3 test cases in this format within the question: "
                "Example 1: Input: <input> -> Output: <output> | "
                "Example 2: Input: <input> -> Output: <output> | "
                "Include constraints if applicable. "
                "Keep each coding question on ONE line."
            )
        else:
            instructions = "All questions MUST be conceptual oral questions. Do not generate any coding or implementation challenges."

        system_prompt = (
            "You are a professional technical interviewer. "
            "Task: Generate interview questions. "
            f"CRUCIAL: {instructions} "
            "Rules: Output EXACTLY one question per line. "
            "Do NOT add numbering (no '1.', '2.', etc). "
            "Do NOT add blank lines between questions. "
            "Do NOT add any introductory or closing text. "
            "Just output the questions, one per line."
        )

        user_prompt = (
            f"Generate exactly {request.count} unique interview questions for a "
            f"{request.level} level {request.role} candidate. "
            f"Output exactly {request.count} lines, one question per line."
        )

        def parse_questions(raw_text):
            import re
            lines = raw_text.strip().split("\n")
            cleaned = []
            # Patterns that indicate a continuation of the previous question (test cases, examples, constraints)
            continuation_pattern = re.compile(
                r'^(?:Example|Input|Output|Constraint|Note|Test\s*Case|Expected|Sample|Edge\s*Case)',
                re.IGNORECASE
            )
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                # Remove numbering like "1.", "1)", "1:", "Q1.", "Q1:"
                stripped = re.sub(r'^(?:Q?\d+[\.\)\:\-]\s*)', '', line).strip()
                # Remove leading bullets/dashes
                stripped = re.sub(r'^[\-\*\•]\s*', '', stripped).strip()
                if len(stripped) <= 10:
                    # Very short fragment — append to previous if exists
                    if cleaned:
                        cleaned[-1] += " " + stripped
                    continue
                # Check if this line is a continuation (example/test case/constraint)
                if continuation_pattern.match(stripped) and cleaned:
                    cleaned[-1] += "\n" + stripped
                else:
                    cleaned.append(stripped)
            return cleaned

        # First attempt
        model_name = AI_MODEL if AI_PROVIDER == "cloud" else OLLAMA_MODEL_NAME
        raw_response = await generate_llm_response(user_prompt, system_prompt, temperature=0.6)
        questions = parse_questions(raw_response)

        # Retry if not enough questions
        if len(questions) < request.count:
            remaining = request.count - len(questions)
            retry_prompt = f"Generate exactly {remaining} more unique interview questions for a {request.level} level {request.role} candidate. One question per line, no numbering."
            raw_response2 = await generate_llm_response(retry_prompt, system_prompt, temperature=0.7)
            questions.extend(parse_questions(raw_response2))

        return QuestionResponse(question=questions[:request.count], model_used=model_name)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    if not WHISPER_MODEL:
        raise HTTPException(status_code=503, detail="Whisper model is not loaded. Transcription is unavailable.")

    
    from pydub import AudioSegment

    temp_audio_path = None
    try:
        audio_bytes = await file.read()
        audio_in_memory = io.BytesIO(audio_bytes)
        audio_segment = AudioSegment.from_file(audio_in_memory)

        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp:
            temp_audio_path = temp.name
            audio_segment.export(temp_audio_path, format="mp3")

        result = WHISPER_MODEL.transcribe(temp_audio_path)
        return {"transcription": result["text"].strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)


@app.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_answer(request: EvaluationRequest):
    try:
        if request.question_type == "oral":
            assessment_instruction = (
                "This is a conceptual oral question. Focus purely on candidate's verbal explanation. "
                "Ignore any code blocks. "
                "CRITICAL: If the transcript is empty, nonsense (e.g. 'blah blah', 'testing'), "
                "or irrelevant to the question, SCORE 0."
            )
        else:
            assessment_instruction = (
                "This is a coding challenge question. "
                "1. Check the code for syntax errors, logical errors, and runtime errors. "
                "2. Mentally trace the code against the test cases in the question. "
                "3. If the code produces WRONG output for any test case, mention which test case fails and what the wrong output would be. "
                "4. Point out edge cases the code doesn't handle. "
                "5. Evaluate code efficiency (time/space complexity). "
                "6. In 'aiFeedback', clearly state: PASS or FAIL for each test case, what errors exist, and how to fix them. "
                "CRITICAL: If the code is empty, undefined, or random characters, SCORE 0."
            )

        system_prompt = (
            "You are a strict technical interviewer. DO NOT hallucinate positive reviews for bad input. "
            "RULE 1: If the answer is gibberish, irrelevant, or missing, return 'technicalScore': 0 and 'confidenceScore': 0. "
            "RULE 2: For 'idealAnswer', provide a complete correct solution with explanation. "
            "RULE 3: Scores MUST be integers between 0 and 10 (inclusive). Never exceed 10. "
            "RULE 4: In 'aiFeedback', be specific about errors. For coding: mention which test cases pass/fail, bugs found, and fixes needed. "
            f"Context: {assessment_instruction} "
            "Respond ONLY with JSON object. "
            "Required Keys: 'technicalScore' (integer 0-10), 'confidenceScore' (integer 0-10), 'aiFeedback' (string), 'idealAnswer' (string)"
        )

        user_prompt = (
            f"Role:{request.role}\n"
            f"Question:{request.question}\n"
            f"Level:{request.level}\n"
            f"Verbal Answer:{request.user_answer or 'No answer provided'}\n"
            f"Code Answer:{request.user_code or 'No code provided'}\n"
        )

        response_text = await generate_llm_response(user_prompt, system_prompt, temperature=0.1, json_mode=True)
        response_text = response_text.strip()

        try:
            evaluation_data = json.loads(response_text)
        except json.JSONDecodeError:
            import re
            fixed_text = re.sub(r'[\r\n\t]', '', response_text)
            try:
                evaluation_data = json.loads(fixed_text)
            except Exception:
                print(f"Failed to parse JSON response: {response_text}")
                return EvaluationResponse(
                    technicalScore=0,
                    confidenceScore=0,
                    aiFeedback="Failed to parse AI response.",
                    idealAnswer="No ideal answer available.",
                )

        # Ensure idealAnswer is a string
        if 'idealAnswer' in evaluation_data and isinstance(evaluation_data['idealAnswer'], dict):
            evaluation_data['idealAnswer'] = json.dumps(evaluation_data['idealAnswer'])

        return EvaluationResponse(**evaluation_data)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Evaluation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=AI_SERVICE_PORT)
