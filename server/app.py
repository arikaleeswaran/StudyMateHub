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

load_dotenv()
app = Flask(__name__)
CORS(app)

# Keys
try:
    supabase: Client = create_client(os.environ.get(
        "SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))
except:
    print("⚠️ Supabase Keys missing.")

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
model = genai.GenerativeModel('models/gemini-flash-latest')

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

# --- 1. SAVE ROADMAP (With Normalization) ---


@app.route('/api/save_roadmap', methods=['POST'])
def save_roadmap():
    data = request.json
    # FIX: Force Title Case (e.g. "machine learning" -> "Machine Learning")
    topic = data.get('topic', '').strip().title()

    print(f"💾 Saving Roadmap: {topic}")
    try:
        existing = supabase.table('user_roadmaps').select(
            '*').eq('user_id', data.get('user_id')).eq('topic', topic).execute()

        if not existing.data:
            supabase.table('user_roadmaps').insert({
                "user_id": data.get('user_id'),
                "topic": topic,
                "graph_data": data.get('graph_data')
            }).execute()
            return jsonify({"message": "Roadmap Folder Created!"})
        else:
            return jsonify({"message": "Roadmap already exists in profile."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- 2. SAVE RESOURCE (With Normalization) ---


@app.route('/api/save_resource', methods=['POST'])
def save_resource():
    data = request.json
    # FIX: Normalize here too
    topic = data.get('roadmap_topic', '').strip().title()

    print(f"💾 Saving Resource: {data.get('title')}")
    try:
        supabase.table('saved_resources').insert({
            "user_id": data.get('user_id'),
            "roadmap_topic": topic,
            "node_label": data.get('node_label'),
            "resource_type": data.get('resource_type'),
            "title": data.get('title'),
            "url": data.get('url'),
            "thumbnail": data.get('thumbnail', '')
        }).execute()
        return jsonify({"message": "Resource Saved!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- 3. SUBMIT PROGRESS ---


@app.route('/api/submit_progress', methods=['POST'])
def submit_progress():
    data = request.json
    feedback = data.get('feedback', '')
    blob = TextBlob(feedback)

    try:
        supabase.table('node_progress').insert({
            "user_id": data.get('user_id'),
            "node_label": data.get('node_label'),
            "quiz_score": data.get('score'),
            "feedback_text": feedback,
            "sentiment_score": blob.sentiment.polarity
        }).execute()
        return jsonify({"message": "Score Saved"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- 4. GET ROADMAP (Checks DB First) ---


def generate_ai_roadmap(topic):
    prompt = f"""Create a linear 7-step learning path for '{topic}'. STRICT JSON ONLY. Format: {{ "nodes": [ {{"id": "1", "label": "Basics"}}, ... ] }}"""
    try:
        response = model.generate_content(prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except:
        return {"nodes": [{"id": "1", "label": f"{topic} Basics"}]}


@app.route('/api/roadmap', methods=['GET'])
def get_roadmap():
    raw_topic = request.args.get('topic', '')
    topic = raw_topic.strip().title()  # FIX: Normalize

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
    main_topic = request.args.get('main_topic')
    sub_topic = request.args.get('sub_topic')
    prompt = f"""Create a 5-question multiple-choice quiz about '{sub_topic}' (Context: {main_topic}). Return valid JSON array."""
    try:
        response = model.generate_content(prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        return jsonify(json.loads(text))
    except:
        return jsonify([])


@app.route('/api/resources', methods=['GET'])
def get_resources():
    topic = request.args.get('topic')
    videos = []
    pdfs = []

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
