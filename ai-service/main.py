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

import ollama
import whisper
from pydub import AudioSegment

load_dotenv()

AI_SERVICE_PORT = int(os.getenv("AI_SERVICE_PORT", 8000))
OLLAMA_MODEL_NAME = os.getenv("OLLAMA_MODEL_NAME", "mistral")

app = FastAPI(title="AI Intervieweer Microservice", description="This microservice provides AI capabilities for the AI Interviewer application.", version="1.0.0")

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
WHISPER_MODEL = None

try:
    print("Loading Whisper Model")
    WHISPER_MODEL = whisper.load_model("base.en")
    print("Whisper Model Loaded Successfully")
except Exception as e:
    print("Error while Loading Whisper Model")
    print(e)


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
    user_answer:Optional[str] = None
    user_code:Optional[str] = None

class EvaluationResponse(BaseModel):
    technicalScore: int
    confidenceScore: int
    aiFeedback: str
    idealAnswer: str


@app.get("/")
async def root():
    return {
        "message": "Hello from AI Interviewer Microservice!",
        "model": OLLAMA_MODEL_NAME,
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
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                # Remove numbering like "1.", "1)", "1:", "Q1.", "Q1:"
                line = re.sub(r'^(?:Q?\d+[\.\)\:\-]\s*)', '', line).strip()
                # Remove leading bullets/dashes
                line = re.sub(r'^[\-\*\•]\s*', '', line).strip()
                if len(line) > 10:  # skip very short fragments
                    cleaned.append(line)
            return cleaned

        # First attempt
        response = ollama.generate(
            model=OLLAMA_MODEL_NAME,
            prompt=user_prompt,
            system=system_prompt,
            options={"temperature": 0.6},
        )
        questions = parse_questions(response["response"])

        # Retry if not enough questions
        if len(questions) < request.count:
            remaining = request.count - len(questions)
            retry_prompt = f"Generate exactly {remaining} more unique interview questions for a {request.level} level {request.role} candidate. One question per line, no numbering."
            response2 = ollama.generate(
                model=OLLAMA_MODEL_NAME,
                prompt=retry_prompt,
                system=system_prompt,
                options={"temperature": 0.7},
            )
            questions.extend(parse_questions(response2["response"]))

        return QuestionResponse(question=questions[:request.count], model_used=OLLAMA_MODEL_NAME)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    temp_audio_path = None
    try:
        audio_bytes = await file.read()
        audio_in_memory = io.BytesIO(audio_bytes)
        audio_segment = AudioSegment.from_file(audio_in_memory)

        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp:
            temp_audio_path = temp.name
            audio_segment.export(temp_audio_path, format="mp3")

        if not WHISPER_MODEL:
                raise HTTPException(status_code=503, detail="Whisper model is not loaded.")

        result = WHISPER_MODEL.transcribe(temp_audio_path)
        return {"transcription": result["text"].strip()}
    except Exception as e:
        if 'temp_audio_path' in locals() and temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        
@app.post("/evaluate",response_model=EvaluationResponse)
async def evaluate_answer(request: EvaluationRequest):
    try:
        if request.question_type=="oral":
            assessment_instruction=(
            "This is a conceptual oral question. Focus purely on candidate's verbal explanation. "
            "Ignore any code blocks. "
            "CRITICAL: If the transcript is empty, nonsense (e.g. 'blah blah', 'testing'), "
            "or irrelevant to the question, SCORE 0."
            )
        else: assessment_instruction=(
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
        user_prompt=(
            f"Role:{request.role}\n"
            f"Question:{request.question}\n"
            f"Level:{request.level}\n"
            f"Verbal Answer:{request.user_answer or 'No code provided'}\n"
            f"Code Answer:{request.user_code or 'No code provided'}\n"
        )
        response = ollama.generate(
            model=OLLAMA_MODEL_NAME,
            prompt=user_prompt,
            system=system_prompt,
            format="json",
            options={"temperature": 0.1},
        )
        response_text = response["response"].strip()
        try:
            evaluation_data = json.loads(response_text)
            if 'idealAnswer' in evaluation_data and isinstance(evaluation_data['idealAnswer'], str):
                evaluation_data['idealAnswer'] = json.dumps(evaluation_data['idealAnswer'])
                return EvaluationResponse(**evaluation_data)
        except json.JSONDecodeError:
            import re
            fixed_text = re.sub(r'[\r\n\t]', '', response_text)
            try:
                evaluation_data = json.loads(fixed_text)
                if 'idealAnswer' in evaluation_data and isinstance(evaluation_data['idealAnswer'], str):
                    evaluation_data['idealAnswer'] = json.dumps(evaluation_data['idealAnswer'])
                    return EvaluationResponse(**evaluation_data)
            except:
                print(f"Failed to parse JSON response: {response_text}")
                return EvaluationResponse(technicalScore="0", confidenceScore="0", aiFeeddback="Failed to parse JSON response.", idealAnswer="No ideal answer available.")
    except Exception as e:
        print(f"Failed to generate response:{e}")
        raise HTTPException(status_code=500,detail=str(e))


        
        

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=AI_SERVICE_PORT)
