import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get("GROQ_API_KEY")
print(
    f"🔑 Key Found: {api_key[:5]}...*******" if api_key else "❌ NO API KEY FOUND")

try:
    client = Groq(api_key=api_key)
    print("📡 Connecting to Groq...")

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",  # <--- NEWEST MODEL
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello! Reply with strict JSON: {\"message\": \"Success\"}"}
        ],
        response_format={"type": "json_object"}
    )

    print("✅ Success! Response:")
    print(completion.choices[0].message.content)

except Exception as e:
    print(f"\n❌ CRITICAL ERROR: {e}")
