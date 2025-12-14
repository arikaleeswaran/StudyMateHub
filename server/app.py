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
from duckduckgo_search import DDGS

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

# --- HELPER: JSON PARSER ---


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
        return json.loads(text)
    except:
        return None

# --- HELPER: SMART KEYWORD EXTRACTOR (NEW) ---


def get_smart_search_term(long_text):
    """
    Uses AI to turn a long description into a 3-5 word search query.
    Example: "Operating System Process Management... (long text)" -> "OS Process Management"
    """
    try:
        prompt = f"Extract the core technical topic from this text into a 3-5 word search query. Return ONLY the raw string, no quotes: '{long_text}'"
        completion = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=20
        )
        return completion.choices[0].message.content.strip().replace('"', '')
    except:
        # Fallback: Just take the first 4 words if AI fails
        return " ".join(long_text.split()[:4])

# --- HELPER: YOUTUBE ---


def get_youtube_videos(topic, max_results=5):
    # Search uses the raw topic, or you can use smart_term here too if results are bad
    search_term = get_smart_search_term(topic)

    if not youtube_client:
        return []
    try:
        search_request = youtube_client.search().list(
            q=f"{search_term} tutorial", part='snippet', type='video',
            maxResults=15, relevanceLanguage='en', videoCategoryId='27'
        )
        search_response = search_request.execute()
        video_ids = [item['id']['videoId']
                     for item in search_response.get('items', [])]

        if not video_ids:
            return []

        video_details = youtube_client.videos().list(
            part='snippet,contentDetails', id=','.join(video_ids)
        ).execute()
        videos = []

        for item in video_details.get('items', []):
            if len(videos) >= max_results:
                break
            duration_str = item['contentDetails']['duration']
            if "M" in duration_str:
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

# --- HELPER: ARTICLE SCRAPER (UPDATED) ---


def scrape_articles(topic, max_results=4):

    # 1. GENERATE SMART KEYWORDS (The Fix)
    smart_topic = get_smart_search_term(topic)
    print(f"🔍 Original: {topic[:30]}... | Smart: {smart_topic}")  # Debug print

    # Try scraping first with smart topic
    url = f"https://html.duckduckgo.com/html/?q={smart_topic} tutorial geeksforgeeks w3schools"
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

    # --- FALLBACK: USE SMART LINKS WITH KEYWORDS ---
    if not articles:
        safe_topic = urllib.parse.quote(smart_topic)  # Use the short keywords!

        articles = [
            {
                "title": f"GeeksforGeeks: {smart_topic}",
                "url": f"https://www.geeksforgeeks.org/search?q={safe_topic}",
                "type": "article",
                "snippet": "Click to search for tutorials on GeeksforGeeks."
            },
            {
                "title": f"W3Schools: Learn {smart_topic}",
                # Use Google Site Search for W3Schools (better than internal)
                "url": f"https://www.google.com/search?q=site:w3schools.com+{safe_topic}",
                "type": "article",
                "snippet": "Beginner-friendly guides and references."
            },
            {
                "title": f"Medium: Articles on {smart_topic}",
                "url": f"https://medium.com/search?q={safe_topic}",
                "type": "article",
                "snippet": "Community-written insights."
            },
            {
                "title": f"Dev.to: Guides for {smart_topic}",
                "url": f"https://dev.to/search?q={safe_topic}",
                "type": "article",
                "snippet": "Practical tutorials from developers."
            }
        ]
    return articles

# --- HELPER: PDF/CHEAT SHEETS (UPDATED) ---


def get_pdfs(topic, max_results=4):
    smart_topic = get_smart_search_term(topic)  # Use smart topic here too
    pdfs = []
    headers = {'User-Agent': 'Mozilla/5.0'}

    # Search specifically for PDF files
    search_queries = [
        f"{smart_topic} cheat sheet filetype:pdf",
        f"{smart_topic} lecture notes filetype:pdf"
    ]

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
    safe_topic = urllib.parse.quote(smart_topic)
    if len(pdfs) < 4:
        smart_links = [
            {"title": f"🔍 {smart_topic} Cheat Sheet (Google)",
             "url": f"https://www.google.com/search?q={safe_topic}+cheat+sheet+filetype:pdf", "type": "PDF"},
            {"title": f"🎓 {smart_topic} Lecture Notes (PDF)",
             "url": f"https://www.google.com/search?q={safe_topic}+lecture+notes+filetype:pdf", "type": "PDF"},
            {"title": f"📝 {smart_topic} Interview Qs (PDF)",
             "url": f"https://www.google.com/search?q={safe_topic}+interview+questions+filetype:pdf", "type": "PDF"}
        ]
        for link in smart_links:
            if len(pdfs) >= max_results:
                break
            pdfs.append(link)

    return pdfs

# --- API ROUTES ---


@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    user_id = request.args.get('user_id')
    try:
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

        if not sorted_recs:
            return jsonify([
                {"title": "🔥 Popular: Python Roadmap", "url": "https://roadmap.sh/python",
                    "resource_type": "article", "topic": "Python", "count": 150},
                {"title": "🎥 Watch: Machine Learning Basics", "url": "https://www.youtube.com/watch?v=GwIo3gDZCVQ",
                    "resource_type": "video", "topic": "Machine Learning", "count": 120},
                {"title": "📄 PDF: System Design Cheat Sheet", "url": "https://github.com/donnemartin/system-design-primer",
                    "resource_type": "article", "topic": "System Design", "count": 95}
            ])
        return jsonify(sorted_recs)
    except Exception as e:
        print(f"Rec Error: {e}")
        return jsonify([])


@app.route('/api/save_roadmap', methods=['POST'])
def save_roadmap():
    data = request.json
    try:
        supabase.table('user_roadmaps').upsert({
            "user_id": data.get('user_id'),
            "topic": data.get('topic', '').strip().title(),
            "graph_data": data.get('graph_data')
        }).execute()
        return jsonify({"message": "Saved"})
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
        return jsonify({"message": "Saved"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/roadmap', methods=['GET'])
def get_roadmap():
    topic = request.args.get('topic', '').strip().title()
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
        return jsonify([{"question": "Error generating quiz", "options": ["OK"], "correct_answer": 0}])


@app.route('/api/resources', methods=['GET'])
def get_resources():
    topic = request.args.get('topic')  # This is the long string
    return jsonify({
        "videos": get_youtube_videos(topic),
        # Now calls get_smart_search_term internally
        "articles": scrape_articles(topic),
        # Now calls get_smart_search_term internally
        "pdfs": get_pdfs(topic)
    })


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
