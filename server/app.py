import os
import json
import isodate
import re
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client, Client
from groq import Groq
from googleapiclient.discovery import build
from duckduckgo_search import DDGS
from textblob import TextBlob

load_dotenv()
app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
GROQ_MODEL = "llama-3.3-70b-versatile"

# 1. Supabase
try:
    supabase: Client = create_client(os.environ.get(
        "SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))
except:
    print("⚠️ Supabase Keys missing.")

# 2. Groq
try:
    groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    print(f"✅ Groq Client Initialized (Model: {GROQ_MODEL})")
except Exception as e:
    print(f"⚠️ Groq Init Error: {e}")

# 3. YouTube
try:
    youtube_client = build(
        'youtube', 'v3', developerKey=os.environ.get("YOUTUBE_API_KEY"))
except:
    youtube_client = None

# --- CRITICAL HELPER: BULLETPROOF JSON PARSER ---


def parse_json_safely(text, expected_type="dict"):
    print(f"🔍 Raw AI Response: {text[:100]}...")  # Debug Print

    # 1. Strip Markdown (```json ... ```)
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```', '', text)
    text = text.strip()

    # 2. Extract strictly the JSON part (ignore "Here is the JSON...")
    try:
        if expected_type == "list":
            # Find the first '[' and last ']'
            start = text.find('[')
            end = text.rfind(']') + 1
            if start != -1 and end != -1:
                text = text[start:end]
        else:
            # Find the first '{' and last '}'
            start = text.find('{')
            end = text.rfind('}') + 1
            if start != -1 and end != -1:
                text = text[start:end]
    except:
        pass

    # 3. Try Parsing
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # 4. If failed, try "Math Fix" (Escape backslashes for LaTeX)
        try:
            # This fixes "Invalid \escape" caused by things like \theta
            fixed_text = text.replace('\\', '\\\\')
            return json.loads(fixed_text)
        except:
            print("❌ JSON Parsing Failed completely.")
            return None


def is_short(duration_iso):
    try:
        dur = isodate.parse_duration(duration_iso)
        return dur.total_seconds() < 60
    except:
        return False

# --- ROUTES ---


@app.route('/api/save_roadmap', methods=['POST'])
def save_roadmap():
    data = request.json
    topic = data.get('topic', '').strip().title()
    try:
        existing = supabase.table('user_roadmaps').select(
            '*').eq('user_id', data.get('user_id')).eq('topic', topic).execute()
        if not existing.data:
            supabase.table('user_roadmaps').insert({
                "user_id": data.get('user_id'),
                "topic": topic,
                "graph_data": data.get('graph_data')
            }).execute()
            return jsonify({"message": "Roadmap Saved!"})
        else:
            return jsonify({"message": "Roadmap already exists."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/save_resource', methods=['POST'])
def save_resource():
    data = request.json
    try:
        supabase.table('saved_resources').insert({
            "user_id": data.get('user_id'),
            "roadmap_topic": data.get('roadmap_topic').strip().title(),
            "node_label": data.get('node_label'),
            "resource_type": data.get('resource_type'),
            "title": data.get('title'),
            "url": data.get('url'),
            "thumbnail": data.get('thumbnail', '')
        }).execute()
        return jsonify({"message": "Resource Saved!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/submit_progress', methods=['POST'])
def submit_progress():
    data = request.json
    feedback = data.get('feedback', '')
    blob = TextBlob(feedback)
    try:
        topic = data.get('topic', 'General').strip().title()
        supabase.table('node_progress').insert({
            "user_id": data.get('user_id'),
            "topic": topic,
            "node_label": data.get('node_label'),
            "quiz_score": data.get('score'),
            "feedback_text": feedback,
            "sentiment_score": blob.sentiment.polarity
        }).execute()
        return jsonify({"message": "Score Saved"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- AI GENERATORS (Groq) ---


@app.route('/api/roadmap', methods=['GET'])
def get_roadmap():
    topic = request.args.get('topic', '').strip().title()

    # 1. Check DB First
    try:
        existing = supabase.table('user_roadmaps').select(
            'graph_data').eq('topic', topic).limit(1).execute()
        if existing.data:
            print("📂 Loaded from DB")
            return jsonify(existing.data[0]['graph_data'])
    except:
        pass

    # 2. Generate New
    print(f"🚀 Generating Roadmap: {topic}...")
    prompt = f"""
    Create a linear 7-step learning path for '{topic}'.
    Return strict JSON (no extra text) in this format:
    {{ "nodes": [ {{"id": "1", "label": "Basics"}}, {{"id": "2", "label": "..."}} ] }}
    """
    try:
        completion = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        data = parse_json_safely(completion.choices[0].message.content, "dict")
        return jsonify(data if data else {"nodes": [{"id": "1", "label": f"{topic} Basics"}]})
    except Exception as e:
        print(f"❌ Groq Error: {e}")
        return jsonify({"nodes": [{"id": "1", "label": f"{topic} Basics"}]})


@app.route('/api/quiz', methods=['GET'])
def get_quiz():
    main = request.args.get('main_topic')
    sub = request.args.get('sub_topic')
    print(f"🧠 Generating Quiz: {sub}...")

    prompt = f"""
    Create 5 multiple-choice questions for '{sub}' (Context: {main}).
    Return a strict JSON Array (no extra text) like this:
    [
      {{
        "question": "Question?",
        "options": ["A", "B", "C", "D"],
        "correct_answer": 0
      }}
    ]
    """
    try:
        completion = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"}
        )

        # Groq might wrap the array in an object like {"data": [...]}. Let's handle it.
        raw_text = completion.choices[0].message.content
        data = parse_json_safely(raw_text, "list")

        # If data came back as a Dictionary (e.g. {"questions": [...]}), extract the list
        if isinstance(data, dict):
            for key in data:
                if isinstance(data[key], list):
                    return jsonify(data[key])
            return jsonify([])  # No list found

        return jsonify(data if data else [])

    except Exception as e:
        print(f"❌ Groq Quiz Error: {e}")
        # Valid Fallback Quiz (Prevents Option A/B)
        return jsonify([
            {"question": f"What is the main concept of {sub}?", "options": [
                "Concept A", "Concept B", "Concept C", "Concept D"], "correct_answer": 0},
            {"question": "True or False: This is essential.",
                "options": ["True", "False"], "correct_answer": 0},
            {"question": "Which fits best?", "options": [
                "Option 1", "Option 2", "Option 3", "Option 4"], "correct_answer": 0},
            {"question": "Why use this?", "options": [
                "Efficiency", "Cost", "Speed", "All of above"], "correct_answer": 3},
            {"question": "Advanced Check", "options": [
                "A", "B", "C", "D"], "correct_answer": 0}
        ])


@app.route('/api/resources', methods=['GET'])
def get_resources():
    topic = request.args.get('topic')
    videos, pdfs = [], []
    if youtube_client:
        try:
            search = youtube_client.search().list(
                part="id", q=f"{topic} tutorial", type="video", maxResults=5).execute()
            ids = [i['id']['videoId'] for i in search['items']]
            details = youtube_client.videos().list(
                part="snippet,contentDetails", id=','.join(ids)).execute()
            for item in details['items']:
                if not is_short(item['contentDetails']['duration']):
                    videos.append({
                        "title": item['snippet']['title'],
                        "url": f"https://www.youtube.com/watch?v={item['id']}",
                        "thumbnail": item['snippet']['thumbnails']['medium']['url'],
                        "channel": item['snippet']['channelTitle']
                    })
        except:
            pass
    try:
        with DDGS() as ddgs:
            for r in ddgs.text(f"{topic} filetype:pdf", maxResults=3):
                pdfs.append(
                    {"title": r['title'], "url": r['href'], "type": "PDF"})
    except:
        pass
    return jsonify({"videos": videos, "pdfs": pdfs})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
