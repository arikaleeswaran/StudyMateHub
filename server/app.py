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


# --- HELPER 1: JSON PARSER ---
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
        try:
            return json.loads(text.replace('\\', '\\\\'))
        except:
            return None

# --- HELPER 2: YOUTUBE (Fixed "Only 2 Videos" Issue) ---


def get_youtube_videos(topic, max_results=5):
    if not youtube_client:
        return []
    try:
        # FETCH 15 items first (to account for Shorts we will filter out)
        search_request = youtube_client.search().list(
            q=f"{topic} tutorial", part='snippet', type='video',
            maxResults=15, relevanceLanguage='en', videoCategoryId='27'
        )
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
                break  # Stop once we have enough

            duration_str = item['contentDetails']['duration']
            match = re.match(
                r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration_str)
            if match:
                hours = int(match.group(1)) if match.group(1) else 0
                minutes = int(match.group(2)) if match.group(2) else 0
                seconds = int(match.group(3)) if match.group(3) else 0
                total_seconds = hours * 3600 + minutes * 60 + seconds

                # Filter Shorts (> 60s)
                if total_seconds > 60:
                    videos.append({
                        "title": item['snippet']['title'],
                        "url": f"https://www.youtube.com/watch?v={item['id']}",
                        "thumbnail": item['snippet']['thumbnails']['medium']['url'],
                        "channel": item['snippet']['channelTitle'],
                        "type": "video"
                    })
        return videos
    except Exception as e:
        return []

# --- HELPER 3: ARTICLE SCRAPER (Smart Search Links - No 404s) ---


def scrape_articles(topic, max_results=4):
    # Try scraping first... (Keep your existing try/except block)
    url = f"https://html.duckduckgo.com/html/?q={topic} tutorial geeksforgeeks w3schools medium"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0'}
    articles = []

    try:
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            for item in soup.find_all('div', class_='result', limit=max_results):
                title = item.find('a', class_='result__a')
                snippet = item.find('a', class_='result__snippet')
                if title and snippet:
                    articles.append({
                        "title": title.text,
                        "url": title['href'],
                        "snippet": snippet.text,
                        "type": "article"
                    })
    except:
        pass

    # --- THE FIX: Use SEARCH Links instead of Direct Links ---
    if not articles:
        safe_topic = urllib.parse.quote(topic)  # Encodes spaces correctly
        articles = [
            {
                "title": f"GeeksforGeeks: {topic} Tutorials",
                "url": f"https://www.geeksforgeeks.org/search?q={safe_topic}",
                "type": "article",
                "snippet": "Click to search for tutorials on GeeksforGeeks."
            },
            {
                "title": f"W3Schools: Learn {topic}",
                "url": f"https://www.google.com/search?q=site:w3schools.com+{safe_topic}",
                "type": "article",
                "snippet": "Beginner-friendly guides and references."
            },
            {
                "title": f"Medium: Top Articles on {topic}",
                "url": f"https://medium.com/search?q={safe_topic}",
                "type": "article",
                "snippet": "Community-written insights and deep dives."
            },
            {
                "title": f"Dev.to: Developer Guides for {topic}",
                "url": f"https://dev.to/search?q={safe_topic}",
                "type": "article",
                "snippet": "Practical tutorials from developers."
            }
        ]
    return articles
# --- HELPER 4: PDF/CHEAT SHEETS (No Research Papers) ---


def get_pdfs(topic, max_results=4):
    pdfs = []
    headers = {'User-Agent': 'Mozilla/5.0'}

    search_queries = [f"{topic} cheat sheet filetype:pdf",
                      f"{topic} lecture notes filetype:pdf"]
    for query in search_queries:
        if len(pdfs) >= 3:
            break
        try:
            url = f"https://html.duckduckgo.com/html/?q={query}"
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                for item in soup.find_all('div', class_='result', limit=2):
                    title_el = item.find('a', class_='result__a')
                    if title_el:
                        title_text = title_el.text
                        if "PDF" not in title_text:
                            title_text = f"[PDF] {title_text}"
                        pdfs.append(
                            {"title": title_text, "url": title_el['href'], "type": "PDF"})
        except:
            pass

    # Fallback Shortcuts
    safe_topic = urllib.parse.quote(topic)
    if len(pdfs) < 4:
        smart_links = [
            {"title": f"🔍 {topic} Cheat Sheet (Google)",
             "url": f"https://www.google.com/search?q={safe_topic}+cheat+sheet+filetype:pdf", "type": "PDF"},
            {"title": f"🎓 {topic} Lecture Notes (PDF)",
             "url": f"https://www.google.com/search?q={safe_topic}+lecture+notes+filetype:pdf", "type": "PDF"},
            {"title": f"📝 {topic} Interview Qs (PDF)",
             "url": f"https://www.google.com/search?q={safe_topic}+interview+questions+filetype:pdf", "type": "PDF"}
        ]
        for link in smart_links:
            if len(pdfs) >= max_results:
                break
            pdfs.append(link)

    return pdfs


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

# --- AI ENDPOINTS ---


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
        completion = groq_client.chat.completions.create(
            model=GROQ_MODEL, messages=[{"role": "user", "content": prompt}], temperature=0.1, response_format={"type": "json_object"}
        )
        data = parse_json_safely(completion.choices[0].message.content, "dict")
        return jsonify(data if data else {"nodes": [{"id": "1", "label": f"{topic} Basics"}]})
    except Exception as e:
        return jsonify({"nodes": [{"id": "1", "label": f"{topic} Basics"}]})


@app.route('/api/quiz', methods=['GET'])
def get_quiz():
    main = request.args.get('main_topic')
    sub = request.args.get('sub_topic')
    # Default to 10, but allow requesting 5
    num_questions = request.args.get('num', '10')

    print(f"🧠 Generating {num_questions}-Question Quiz: {sub}...")

    prompt = f"""
    Create a {num_questions}-question multiple-choice assessment for '{sub}' (Context: {main}).
    STRICT RULES:
    1. Return strictly a JSON Array.
    2. Difficulty: Mix of Conceptual and Practical.
    3. Format: [{{ "question": "...", "options": ["A","B","C","D"], "correct_answer": 0 }}]
    """
    try:
        completion = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        data = parse_json_safely(completion.choices[0].message.content, "list")

        if isinstance(data, dict):
            for k in data:
                if isinstance(data[k], list):
                    return jsonify(data[k])

        return jsonify(data if data else [])
    except:
        return jsonify([{"question": "Quiz Generation Failed", "options": ["OK"], "correct_answer": 0}])


@app.route('/api/resources', methods=['GET'])
def get_resources():
    topic = request.args.get('topic')
    return jsonify({
        "videos": get_youtube_videos(topic),
        "articles": scrape_articles(topic),  # Now includes GFG/W3Schools
        "pdfs": get_pdfs(topic)
    })

# --- DELETE APIs ---


@app.route('/api/delete_roadmap', methods=['DELETE'])
def delete_roadmap():
    user_id = request.args.get('user_id')
    topic = request.args.get('topic')
    try:
        # Delete the roadmap graph entry
        supabase.table('user_roadmaps').delete().eq(
            'user_id', user_id).eq('topic', topic).execute()
        return jsonify({"message": "Roadmap deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/delete_resource', methods=['DELETE'])
def delete_resource():
    res_id = request.args.get('id')
    try:
        supabase.table('saved_resources').delete().eq('id', res_id).execute()
        return jsonify({"message": "Resource deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
