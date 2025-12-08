import os
import json
import isodate  # NEW: You might need to pip install isodate
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai
from googleapiclient.discovery import build
from duckduckgo_search import DDGS
from textblob import TextBlob
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# 1. Configuration
load_dotenv()
app = Flask(__name__)
CORS(app)

# Keys
supabase: Client = create_client(os.environ.get(
    "SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
model = genai.GenerativeModel('models/gemini-flash-latest')

# YouTube Setup
try:
    youtube_client = build(
        'youtube', 'v3', developerKey=os.environ.get("YOUTUBE_API_KEY"))
except:
    youtube_client = None

# --- HELPER: CHECK VIDEO DURATION (Kill Shorts) ---


def is_short(duration_iso):
    try:
        dur = isodate.parse_duration(duration_iso)
        return dur.total_seconds() < 60  # Filter out videos less than 60 seconds
    except:
        return False

# --- LOGIC 1: AI ROADMAP (Strict 7 Steps) ---


def generate_ai_roadmap(topic):
    prompt = f"""
    Create a linear 7-step learning path for '{topic}'.
    STRICT JSON ONLY. No markdown.
    Format: {{ "nodes": [ {{"id": "1", "label": "Basics"}}, ... ] }}
    """
    try:
        response = model.generate_content(prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except:
        return {"nodes": [{"id": "1", "label": f"{topic} Basics"}]}  # Fallback


@app.route('/api/roadmap', methods=['GET'])
def get_roadmap():
    return jsonify(generate_ai_roadmap(request.args.get('topic')))

# --- LOGIC 2: QUIZ ---


@app.route('/api/quiz', methods=['GET'])
def get_quiz():
    # ... (Keep your existing quiz logic or paste from previous steps) ...
    # Placeholder to save space here, use previous quiz code
    return jsonify([])

# --- LOGIC 3: SMART RESOURCES (No Shorts + Real PDFs) ---


@app.route('/api/resources', methods=['GET'])
def get_resources():
    topic = request.args.get('topic')
    print(f"🔎 Searching for: {topic}")

    # 1. YouTube (Filter Shorts)
    videos = []
    if youtube_client:
        try:
            # Step A: Search for IDs
            search_res = youtube_client.search().list(
                part="id", q=f"{topic} tutorial", type="video", maxResults=10
            ).execute()

            video_ids = [item['id']['videoId'] for item in search_res['items']]

            # Step B: Get Details (Duration)
            details_res = youtube_client.videos().list(
                part="snippet,contentDetails", id=','.join(video_ids)
            ).execute()

            for item in details_res['items']:
                duration = item['contentDetails']['duration']
                # ONLY add if NOT a short (> 60s)
                if not is_short(duration):
                    videos.append({
                        "title": item['snippet']['title'],
                        "url": f"https://www.youtube.com/watch?v={item['id']}",
                        "thumbnail": item['snippet']['thumbnails']['medium']['url'],
                        "channel": item['snippet']['channelTitle']
                    })
                    if len(videos) >= 4:
                        break  # Stop after 4 good videos

        except Exception as e:
            print(f"YT Error: {e}")

    # 2. PDFs & Articles (DuckDuckGo with Fallback)
    pdfs = []
    try:
        with DDGS() as ddgs:
            # PDF Search
            results = list(ddgs.text(f"{topic} filetype:pdf", maxResults=3))
            for r in results:
                pdfs.append(
                    {"title": r['title'], "url": r['href'], "type": "PDF"})

            # Article Search
            results = list(
                ddgs.text(f"{topic} site:geeksforgeeks.org OR site:medium.com", maxResults=2))
            for r in results:
                pdfs.append(
                    {"title": r['title'], "url": r['href'], "type": "Article"})

    except Exception as e:
        print(f"Search Error: {e}")
        # FALLBACK: If scraping fails, give a Google Search Link
        pdfs.append({
            "title": f"Find '{topic}' PDFs on Google",
            "url": f"https://www.google.com/search?q={topic}+filetype:pdf",
            "type": "Search"
        })

    return jsonify({"videos": videos, "pdfs": pdfs})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
