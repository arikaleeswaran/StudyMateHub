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

# 1. Configuration
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

# YouTube Setup
try:
    youtube_client = build(
        'youtube', 'v3', developerKey=os.environ.get("YOUTUBE_API_KEY"))
except:
    youtube_client = None
    print("⚠️ YouTube API Key missing or invalid.")

# --- HELPER: CHECK VIDEO DURATION (Kill Shorts) ---


def is_short(duration_iso):
    try:
        dur = isodate.parse_duration(duration_iso)
        return dur.total_seconds() < 60  # Filter out videos less than 60 seconds
    except:
        return False

# --- LOGIC 1: AI ROADMAP (Strict 7 Steps) ---


def generate_ai_roadmap(topic):
    print(f"🧠 Generating Roadmap for: {topic}")
    prompt = f"""
    Create a linear 7-step learning path for '{topic}'.
    STRICT JSON ONLY. No markdown.
    Format: {{ "nodes": [ {{"id": "1", "label": "Basics"}}, ... ] }}
    """
    try:
        response = model.generate_content(prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"AI Error: {e}")
        # Fallback if AI fails
        return {
            "nodes": [
                {"id": "1", "label": f"{topic} Fundamentals"},
                {"id": "2", "label": "Core Concepts"},
                {"id": "3", "label": "Tools & Setup"},
                {"id": "4", "label": "Intermediate Skills"},
                {"id": "5", "label": "Advanced Topics"},
                {"id": "6", "label": "Real-world Projects"},
                {"id": "7", "label": "Career Prep"}
            ]
        }


@app.route('/api/roadmap', methods=['GET'])
def get_roadmap():
    topic = request.args.get('topic')

    # 1. Check DB
    try:
        existing = supabase.table('user_roadmaps').select(
            'graph_data').eq('topic', topic).limit(1).execute()
        if existing.data and len(existing.data) > 0:
            print(f"📂 Found cached roadmap for: {topic}")
            return jsonify(existing.data[0]['graph_data'])
    except:
        pass

    # 2. Generate New
    data = generate_ai_roadmap(topic)

    # 3. Save to DB
    try:
        if data:
            supabase.table('user_roadmaps').insert({
                "user_id": "00000000-0000-0000-0000-000000000000",  # Placeholder UUID
                "topic": topic,
                "graph_data": data
            }).execute()
    except:
        pass

    return jsonify(data)


@app.route('/api/save_roadmap', methods=['POST'])
def save_roadmap():
    data = request.json
    try:
        # Simply insert whatever user_id the frontend sends
        supabase.table('user_roadmaps').insert({
            "user_id": data.get('user_id'),
            "topic": data.get('topic'),
            "graph_data": data.get('graph_data')
        }).execute()
        return jsonify({"message": "Saved"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- LOGIC 2: 5-QUESTION ADAPTIVE QUIZ ---


@app.route('/api/quiz', methods=['GET'])
def get_quiz():
    main_topic = request.args.get('main_topic')
    sub_topic = request.args.get('sub_topic')

    print(f"🧠 Generating 5-Question Quiz for: {sub_topic}")

    prompt = f"""
    Create a 5-question multiple-choice quiz about '{sub_topic}' (Context: {main_topic}).
    
    STRICT RULES:
    1. Return VALID JSON array. No markdown formatting.
    2. Difficulty Mix:
       - Q1: Basic Definition (Easy)
       - Q2: Core Concept (Easy)
       - Q3: Application/Use Case (Medium)
       - Q4: Comparison/logic (Medium)
       - Q5: Complex Scenario (Hard)
    
    JSON Format:
    [
        {{
            "question": "The actual question text here?",
            "options": ["Correct Answer", "Wrong A", "Wrong B", "Wrong C"],
            "correct_answer": 0 // The index (0-3) of the correct answer
        }}
    ]
    """
    try:
        response = model.generate_content(prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        # Fix common AI JSON errors (trailing commas, etc)
        if text.endswith(','):
            text = text[:-1]
        return jsonify(json.loads(text))
    except Exception as e:
        print(f"Quiz Generation Error: {e}")
        # BETTER FALLBACK: Specific to the topic so it doesn't look broken
        return jsonify([
            {"question": f"Which of the following best describes {sub_topic}?", "options": [
                "A fundamental concept", "A deprecated tool", "A hardware component", "None of the above"], "correct_answer": 0},
            {"question": "Why is this concept important?", "options": [
                "Efficiency", "Cost", "Color", "Taste"], "correct_answer": 0},
            {"question": "In a real-world scenario, when would you use this?",
                "options": ["Always", "Never", "Depends on data", "Randomly"], "correct_answer": 2},
            {"question": "What is a common pitfall?", "options": [
                "Overfitting", "Under-usage", "Too fast", "Too slow"], "correct_answer": 0},
            {"question": "Advanced: How does this interact with other systems?", "options": [
                "Seamlessly", "Poorly", "Via API", "Manually"], "correct_answer": 2}
        ])

# --- LOGIC 3: SMART RESOURCES (No Shorts + Real PDFs) ---


@app.route('/api/resources', methods=['GET'])
def get_resources():
    topic = request.args.get('topic')
    print(f"🔎 Searching resources for: {topic}")

    videos = []
    pdfs = []

    # 1. YouTube (Filter Shorts)
    if youtube_client:
        try:
            search_res = youtube_client.search().list(
                part="id", q=f"{topic} tutorial", type="video", maxResults=10
            ).execute()

            video_ids = [item['id']['videoId'] for item in search_res['items']]

            details_res = youtube_client.videos().list(
                part="snippet,contentDetails", id=','.join(video_ids)
            ).execute()

            for item in details_res['items']:
                duration = item['contentDetails']['duration']
                if not is_short(duration):
                    videos.append({
                        "title": item['snippet']['title'],
                        "url": f"https://www.youtube.com/watch?v={item['id']}",
                        "thumbnail": item['snippet']['thumbnails']['medium']['url'],
                        "channel": item['snippet']['channelTitle']
                    })
                    if len(videos) >= 4:
                        break
        except Exception as e:
            print(f"YT Error: {e}")

    # 2. PDFs & Articles (DuckDuckGo)
    try:
        with DDGS() as ddgs:
            # PDF Search
            for r in ddgs.text(f"{topic} filetype:pdf", maxResults=3):
                pdfs.append(
                    {"title": r['title'], "url": r['href'], "type": "PDF"})
            # Article Search
            for r in ddgs.text(f"{topic} site:geeksforgeeks.org OR site:medium.com", maxResults=2):
                pdfs.append(
                    {"title": r['title'], "url": r['href'], "type": "Article"})
    except Exception as e:
        print(f"Search Error: {e}")
        # Fallback Link
        pdfs.append({
            "title": f"Search '{topic}' on Google",
            "url": f"https://www.google.com/search?q={topic}+tutorial",
            "type": "Search"
        })

    return jsonify({"videos": videos, "pdfs": pdfs})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
