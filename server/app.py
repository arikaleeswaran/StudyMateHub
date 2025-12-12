import os
import json
import isodate
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai
from googleapiclient.discovery import build
from duckduckgo_search import DDGS
from textblob import TextBlob
from google.generativeai.types import HarmCategory, HarmBlockThreshold

load_dotenv()
app = Flask(__name__)
CORS(app)

# Keys & Clients
try:
    supabase: Client = create_client(os.environ.get(
        "SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))
except:
    print("⚠️ Supabase Keys missing.")

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
model = genai.GenerativeModel('models/gemini-flash-latest')

# --- SAFETY SETTINGS (DISABLE FILTERS) ---
safety_settings = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}

try:
    youtube_client = build(
        'youtube', 'v3', developerKey=os.environ.get("YOUTUBE_API_KEY"))
except:
    youtube_client = None

# --- HELPER ---


def is_short(duration_iso):
    try:
        dur = isodate.parse_duration(duration_iso)
        return dur.total_seconds() < 60
    except:
        return False

# --- 1. SAVE ROADMAP ---


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
            return jsonify({"message": "Roadmap Saved Successfully!"})
        else:
            return jsonify({"message": "Roadmap already exists in profile."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- 2. SAVE RESOURCE ---


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

# --- 3. SUBMIT PROGRESS (FIXED) ---


@app.route('/api/submit_progress', methods=['POST'])
def submit_progress():
    data = request.json
    feedback = data.get('feedback', '')
    blob = TextBlob(feedback)

    try:
        # Check if topic is provided, default to "General" if not
        topic = data.get('topic', 'General').strip().title()

        supabase.table('node_progress').insert({
            "user_id": data.get('user_id'),
            "topic": topic,  # This matches the new column we added
            "node_label": data.get('node_label'),
            "quiz_score": data.get('score'),
            "feedback_text": feedback,
            "sentiment_score": blob.sentiment.polarity
        }).execute()
        return jsonify({"message": "Score Saved"})
    except Exception as e:
        print(f"Score Save Error: {e}")
        return jsonify({"error": str(e)}), 500

# --- 4. GENERATION APIs ---


def generate_ai_roadmap(topic):
    prompt = f"""Create a linear 7-step learning path for '{topic}'. STRICT JSON ONLY. Format: {{ "nodes": [ {{"id": "1", "label": "Basics"}}, ... ] }}"""
    try:
        # FIX: Pass safety_settings
        response = model.generate_content(
            prompt, safety_settings=safety_settings)
        text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except:
        return {"nodes": [{"id": "1", "label": f"{topic} Basics"}]}


@app.route('/api/roadmap', methods=['GET'])
def get_roadmap():
    raw_topic = request.args.get('topic', '')
    topic = raw_topic.strip().title()
    try:
        existing = supabase.table('user_roadmaps').select(
            'graph_data').eq('topic', topic).limit(1).execute()
        if existing.data and len(existing.data) > 0:
            return jsonify(existing.data[0]['graph_data'])
    except:
        pass
    return jsonify(generate_ai_roadmap(topic))


@app.route('/api/quiz', methods=['GET'])
def get_quiz():
    main = request.args.get('main_topic')
    sub = request.args.get('sub_topic')
    print(f"Generating Quiz for: {sub}")

    prompt = f"""
    Create a 5-question multiple-choice quiz about '{sub}' (Context: {main}).
    STRICT RULES:
    1. Return VALID JSON array.
    2. Difficulty Mix: Easy, Medium, Hard.
    
    JSON Format: [{{ "question": "...", "options": ["A","B","C","D"], "correct_answer": 0 }}]
    """
    try:
        # FIX: Pass safety_settings here too!
        response = model.generate_content(
            prompt, safety_settings=safety_settings)
        text = response.text.replace("```json", "").replace("```", "").strip()
        if text.endswith(','):
            text = text[:-1]
        return jsonify(json.loads(text))
    except Exception as e:
        print(f"Quiz Error: {e}")
        return jsonify([])


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
