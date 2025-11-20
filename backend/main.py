import os
import re
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel

# ADK Imports
from google.adk.agents import LlmAgent
from google.adk.models.google_llm import Gemini
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# 1. Load Env
load_dotenv()
# Ensure API Key is set
if "GOOGLE_API_KEY" not in os.environ:
    api_key = os.getenv("gemapi")
    if api_key:
        os.environ["GOOGLE_API_KEY"] = api_key
    else:
        print("❌ Warning: GOOGLE_API_KEY or 'gemapi' not found in environment.")

# 2. Setup App
app = FastAPI()

# Allow Frontend to talk to Backend (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Define Agent (Global)
retry_config = types.HttpRetryOptions(attempts=3)
janitor_agent = LlmAgent(
    name="UniversalCodeJanitor",
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    description="A code refactoring API agent.",
    instruction="""
    You are a Senior Code Refactorer API.
    INPUT: Raw source code.
    TASK: Refactor with Docstrings, Type Hints, and Clean Formatting.
    OUTPUT: Return ONLY the code inside a markdown block (```python ... ```). Do not chat.
    """
)

# Helper to extract code from markdown
def extract_code(text: str) -> str:
    # Look for specific language blocks first
    pattern = r"```(?:\w+)?\s(.*?)```"
    matches = re.findall(pattern, text, re.DOTALL)
    if matches:
        # Return the longest block found (usually the full code)
        return max(matches, key=len).strip()
    
    # If no markdown formatting, return full text if it looks like code
    if "def " in text or "class " in text or "import " in text or "function " in text:
        return text
    return ""

@app.get("/")
def read_root():
    return {"status": "Code Janitor Backend is Running"}

@app.post("/refactor")
async def refactor_code(file: UploadFile = File(...)):
    try:
        # Read the uploaded file
        content = await file.read()
        code_text = content.decode("utf-8")
        
        # Setup ADK Runner for this request
        session_service = InMemorySessionService()
        runner = Runner(
            agent=janitor_agent,
            app_name="janitor_api",
            session_service=session_service
        )
        
        # Create Session with KEYWORD ARGUMENTS (The Fix)
        session_id = str(uuid.uuid4())
        await session_service.create_session(
            app_name="janitor_api", 
            user_id="web_user", 
            session_id=session_id
        )
        
        prompt = f"Refactor this file named '{file.filename}':\n\n{code_text}"
        
        full_response = ""
        print(f"🤖 Processing {file.filename}...")

        # Run Agent
        async for event in runner.run_async(
            new_message=types.Content(parts=[types.Part(text=prompt)]),
            session_id=session_id,
            user_id="web_user"
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        full_response += part.text

        # Extract Clean Code
        improved_code = extract_code(full_response)
        
        if not improved_code:
            # Fallback: if extraction fails, return the raw response (better than error)
            improved_code = full_response

        return {
            "filename": f"improved_{file.filename}",
            "original_code": code_text,
            "improved_code": improved_code
        }

    except Exception as e:
        print(f"❌ Error: {e}")
        # Return 500 so frontend knows it failed
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)