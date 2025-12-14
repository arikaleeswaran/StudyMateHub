import os
import json
import re
import requests
import urllib.parse
from bs4 import BeautifulSoup
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client, Client
from groq import Groq
from googleapiclient.discovery import build
from textblob import TextBlob
from duckduckgo_search import DDGS  # MUST RUN: pip install duckduckgo-search

load_dotenv()
app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
GROQ_MODEL = "llama-3.3-70b-versatile"

try:
    supabase: Client = create_client(os.environ.get(
        "SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))
except:
    print("⚠️ Supabase Keys missing.")

try:
    groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
except:
    print("⚠️ Groq Keys missing.")

try:
    youtube_client = build(
        'youtube', 'v3', developerKey=os.environ.get("YOUTUBE_API_KEY"))
except:
    youtube_client = None

# --- HELPER: PARSE JSON ---


def parse_json_safely(text, expected_type="dict"):
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```', '', text)
    text = text.strip()
    try:
        if expected_type == "list":
            start = text.find('[')
            end = text.rfind(']') + 1
            if start != -1 and end != -1:
                text = text[start:end]
        else:
            start = text.find('{')
            end = text.rfind('}') + 1
            if start != -1 and end != -1:
                text = text[start:end]
    except:
        pass
    try:
        return json.loads(text)
    except:
        return None

# --- HELPER: YOUTUBE ---


def get_youtube_videos(topic, max_results=5):
    if not youtube_client:
        return []
    try:
        search_request = youtube_client.search().list(
            q=f"{topic} tutorial", part='snippet', type='video', maxResults=15, relevanceLanguage='en', videoCategoryId='27')
        search_response = search_request.execute()
        video_ids = [item['id']['videoId']
                     for item in search_response.get('items', [])]
        if not video_ids:
            return []

        video_details = youtube_client.videos().list(
            part='snippet,contentDetails', id=','.join(video_ids)).execute()
        videos = []
        for item in video_details.get('items', []):
            if len(videos) >= max_results:
                break
            duration_str = item['contentDetails']['duration']
            if "M" in duration_str:  # Filter shorts
                videos.append({
                    "title": item['snippet']['title'],
                    "url": f"https://www.youtube.com/watch?v={item['id']}",
                    "thumbnail": item['snippet']['thumbnails']['medium']['url'],
                    "channel": item['snippet']['channelTitle'],
                    "type": "video"
                })
        return videos
    except:
        return []

# --- HELPER: ARTICLES (FIXED: Uses Real Search) ---


def scrape_articles(topic, max_results=4):
    articles = []
    # 1. Use DuckDuckGo to get REAL links (No 404s)
    try:
        with DDGS() as ddgs:
            # We explicitly ask for tutorials from reliable sites
            query = f"{topic} tutorial site:geeksforgeeks.org OR site:w3schools.com OR site:javatpoint.com"
            results = list(ddgs.text(query, max_results=max_results))
            for r in results:
                articles.append({
                    "title": r['title'],
                    "url": r['href'],  # This is a real, working link
                    "snippet": r['body'],
                    "type": "article"
                })
    except Exception as e:
        print(f"Search Error: {e}")

    # 2. Fallback: If search fails, return Safe Search Links
    if not articles:
        safe = urllib.parse.quote(topic)
        articles = [
            {"title": f"Search GeeksforGeeks: {topic}",
                "url": f"https://www.google.com/search?q=site:geeksforgeeks.org+{safe}", "type": "article"},
            {"title": f"Search W3Schools: {topic}",
                "url": f"https://www.google.com/search?q=site:w3schools.com+{safe}", "type": "article"}
        ]
    return articles

# --- HELPER: PDFS ---


def get_pdfs(topic, max_results=4):
    pdfs = []
    try:
        with DDGS() as ddgs:
            query = f"{topic} filetype:pdf cheat sheet"
            results = list(ddgs.text(query, max_results=max_results))
            for r in results:
                pdfs.append(
                    {"title": r['title'], "url": r['href'], "type": "PDF"})
    except:
        pass
    return pdfs

# --- API ROUTES ---


@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    user_id = request.args.get('user_id')

    try:
        # 1. Collaborative Filtering Logic
        my_saves = supabase.table('saved_resources').select(
            'roadmap_topic, url').eq('user_id', user_id).execute()
        sorted_recs = []

        if my_saves.data:
            my_topics = list(set([item['roadmap_topic']
                             for item in my_saves.data]))
            my_urls = set([item['url'] for item in my_saves.data])

            candidates = supabase.table('saved_resources').select(
                '*').in_('roadmap_topic', my_topics).neq('user_id', user_id).limit(200).execute()

            recs = {}
            for item in candidates.data:
                if item['url'] not in my_urls:
                    if item['url'] not in recs:
                        recs[item['url']] = item
                        recs[item['url']]['count'] = 1
                    else:
                        recs[item['url']]['count'] += 1
            sorted_recs = sorted(
                recs.values(), key=lambda x: x['count'], reverse=True)[:6]

        # 2. FALLBACK: If no peer data (User is alone), return DEMO DATA so UI shows up
        if not sorted_recs:
            return jsonify([
                {"title": "🔥 Trending: Complete Python Roadmap", "url": "https://roadmap.sh/python",
                    "resource_type": "article", "topic": "Python", "count": 120},
                {"title": "🎥 Popular: Machine Learning by Andrew Ng", "url": "https://www.youtube.com/playlist?list=PLoROMvodv4rMiGQp3WXShtMGgzqpfVfbU",
                    "resource_type": "video", "topic": "Machine Learning", "count": 95},
                {"title": "📄 Top PDF: System Design Primer", "url": "https://github.com/donnemartin/system-design-primer",
                    "resource_type": "article", "topic": "System Design", "count": 85}
            ])

        return jsonify(sorted_recs)

    except Exception as e:
        print(f"Rec Error: {e}")
        return jsonify([])


@app.route('/api/save_roadmap', methods=['POST'])
def save_roadmap():
    data = request.json
    topic = data.get('topic', '').strip().title()
    try:
        existing = supabase.table('user_roadmaps').select(
            '*').eq('user_id', data.get('user_id')).eq('topic', topic).execute()
        if not existing.data:
            supabase.table('user_roadmaps').insert({"user_id": data.get(
                'user_id'), "topic": topic, "graph_data": data.get('graph_data')}).execute()
            return jsonify({"message": "Saved"})
        return jsonify({"message": "Exists"})
    except:
        return jsonify({"error": "Error"}), 500


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
        return jsonify({"message": "Saved"})
    except:
        return jsonify({"error": "Error"}), 500


@app.route('/api/submit_progress', methods=['POST'])
def submit_progress():
    data = request.json
    feedback = data.get('feedback', '')
    blob = TextBlob(feedback)
    try:
        supabase.table('node_progress').insert({
            "user_id": data.get('user_id'),
            "topic": data.get('topic', 'General').strip().title(),
            "node_label": data.get('node_label'),
            "quiz_score": data.get('score'),
            "feedback_text": feedback,
            "sentiment_score": blob.sentiment.polarity
        }).execute()
        return jsonify({"message": "Saved"})
    except:
        return jsonify({"error": "Error"}), 500


@app.route('/api/roadmap', methods=['GET'])
def get_roadmap():
    topic = request.args.get('topic', '').strip().title()
    try:
        existing = supabase.table('user_roadmaps').select(
            'graph_data').eq('topic', topic).limit(1).execute()
        if existing.data:
            return jsonify(existing.data[0]['graph_data'])
    except:
        pass

    prompt = f"""Create a linear 7-step learning path for '{topic}'. Return strict JSON: {{ "nodes": [ {{"id": "1", "label": "Basics"}}, ... ] }}"""
    try:
        completion = groq_client.chat.completions.create(model=GROQ_MODEL, messages=[
                                                         {"role": "user", "content": prompt}], temperature=0.1, response_format={"type": "json_object"})
        data = parse_json_safely(completion.choices[0].message.content, "dict")
        return jsonify(data if data else {"nodes": [{"id": "1", "label": f"{topic} Basics"}]})
    except:
        return jsonify({"nodes": [{"id": "1", "label": f"{topic} Basics"}]})


@app.route('/api/quiz', methods=['GET'])
def get_quiz():
    main, sub, num = request.args.get('main_topic'), request.args.get(
        'sub_topic'), request.args.get('num', '10')
    prompt = f"""Create a {num}-question multiple-choice assessment for '{sub}' (Context: {main}). JSON Array: [{{ "question": "...", "options": ["A","B","C","D"], "correct_answer": 0 }}]"""
    try:
        completion = groq_client.chat.completions.create(model=GROQ_MODEL, messages=[
                                                         {"role": "user", "content": prompt}], temperature=0.1, response_format={"type": "json_object"})
        data = parse_json_safely(completion.choices[0].message.content, "list")
        if isinstance(data, dict):
            for k in data:
                if isinstance(data[k], list):
                    return jsonify(data[k])
        return jsonify(data if data else [])
    except:
        return jsonify([{"question": "Error", "options": ["OK"], "correct_answer": 0}])


@app.route('/api/resources', methods=['GET'])
def get_resources():
    topic = request.args.get('topic')
    return jsonify({"videos": get_youtube_videos(topic), "articles": scrape_articles(topic), "pdfs": get_pdfs(topic)})


@app.route('/api/delete_roadmap', methods=['DELETE'])
def delete_roadmap():
    try:
        supabase.table('user_roadmaps').delete().eq('user_id', request.args.get(
            'user_id')).eq('topic', request.args.get('topic')).execute()
        return jsonify({"message": "Deleted"})
    except:
        return jsonify({"error": "Failed"}), 500


@app.route('/api/delete_resource', methods=['DELETE'])
def delete_resource():
    try:
        supabase.table('saved_resources').delete().eq(
            'id', request.args.get('id')).execute()
        return jsonify({"message": "Deleted"})
    except:
        return jsonify({"error": "Failed"}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
