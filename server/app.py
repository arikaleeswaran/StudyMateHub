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

# --- HELPER FUNCTIONS ---


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


def get_smart_search_term(long_text):
    try:
        prompt = f"Extract the core technical topic from this text into a 3-5 word English search query. Return ONLY the raw string, no quotes: '{long_text}'"
        completion = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=20
        )
        return completion.choices[0].message.content.strip().replace('"', '')
    except:
        return " ".join(long_text.split()[:4])


def get_youtube_videos(topic, mode='standard', max_results=5):
    search_term = get_smart_search_term(topic)

    if mode == 'panic':
        query = f"{search_term} crash course in 10 minutes"
    else:
        query = f"{search_term} tutorial"

    if not youtube_client:
        return []
    try:
        search_request = youtube_client.search().list(
            q=query, part='snippet', type='video',
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

            if mode == 'panic' and "H" in duration_str:
                continue

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


def scrape_articles(topic, mode='standard', max_results=4):
    smart_topic = get_smart_search_term(topic)
    suffix = "cheat sheet summary" if mode == 'panic' else "tutorial geeksforgeeks w3schools"
    url = f"https://html.duckduckgo.com/html/?q={smart_topic} {suffix}&kl=us-en"
    headers = {'User-Agent': 'Mozilla/5.0'}
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
                        "title": title.text, "url": title['href'],
                        "snippet": snippet.text, "type": "article"
                    })
    except:
        pass

    if not articles:
        safe_topic = urllib.parse.quote(smart_topic)
        if mode == 'panic':
            articles = [
                {"title": f"⚡ Quick Ref: {smart_topic}", "url": f"https://www.google.com/search?q={safe_topic}+quick+reference",
                    "type": "article", "snippet": "Fast facts."},
                {"title": f"📝 Exam Notes: {smart_topic}", "url": f"https://www.google.com/search?q={safe_topic}+exam+notes",
                 "type": "article", "snippet": "Revision notes."},
            ]
        else:
            articles = [
                {"title": f"GeeksforGeeks: {smart_topic}", "url": f"https://www.geeksforgeeks.org/search?q={safe_topic}",
                    "type": "article", "snippet": "Click to search."},
                {"title": f"W3Schools: Learn {smart_topic}", "url": f"https://www.google.com/search?q=site:w3schools.com+{safe_topic}",
                 "type": "article", "snippet": "Beginner guides."},
                {"title": f"Medium: Articles on {smart_topic}", "url": f"https://medium.com/search?q={safe_topic}",
                 "type": "article", "snippet": "Community insights."},
                {"title": f"Dev.to: Guides for {smart_topic}", "url": f"https://dev.to/search?q={safe_topic}",
                 "type": "article", "snippet": "Practical tutorials."}
            ]
    return articles


def get_pdfs(topic, mode='standard', max_results=4):
    smart_topic = get_smart_search_term(topic)
    pdfs = []
    headers = {'User-Agent': 'Mozilla/5.0'}
    search_queries = [f"{smart_topic} cheat sheet filetype:pdf",
                      f"{smart_topic} lecture notes filetype:pdf"]

    for query in search_queries:
        if len(pdfs) >= 3:
            break
        try:
            url = f"https://html.duckduckgo.com/html/?q={query}&kl=us-en"
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

    safe_topic = urllib.parse.quote(smart_topic)
    if len(pdfs) < 4:
        smart_links = [
            {"title": f"🔍 {smart_topic} Cheat Sheet",
                "url": f"https://www.google.com/search?q={safe_topic}+cheat+sheet+filetype:pdf", "type": "PDF"},
            {"title": f"🎓 {smart_topic} Lecture Notes",
                "url": f"https://www.google.com/search?q={safe_topic}+lecture+notes+filetype:pdf", "type": "PDF"},
            {"title": f"📝 {smart_topic} Interview Qs",
                "url": f"https://www.google.com/search?q={safe_topic}+interview+questions+filetype:pdf", "type": "PDF"}
        ]
        for link in smart_links:
            if len(pdfs) >= max_results:
                break
            pdfs.append(link)
    return pdfs

# --- API ROUTES ---


@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@studymate.com")
    admin_pass = os.environ.get("ADMIN_PASSWORD", "admin123")
    if email == admin_email and password == admin_pass:
        return jsonify({"success": True, "message": "Welcome, Admin!"})
    else:
        return jsonify({"success": False, "error": "Invalid credentials"}), 401


@app.route('/api/sync_guest_data', methods=['POST'])
def sync_guest_data():
    data = request.json
    user_id = data.get('user_id')
    guest_data = data.get('guest_data', {})

    if not user_id or not guest_data:
        return jsonify({"error": "Missing data"}), 400

    try:
        # 1. Sync Roadmap
        roadmap = guest_data.get('roadmap')
        if roadmap:
            supabase.table('user_roadmaps').upsert({
                "user_id": user_id,
                "topic": roadmap.get('topic', '').strip().title(),
                "graph_data": roadmap.get('graph_data')
            }).execute()

        # 2. Sync Progress (Quiz Scores)
        progress_list = guest_data.get('progress', [])
        if progress_list:
            for item in progress_list:
                item['user_id'] = user_id
                supabase.table('node_progress').insert(item).execute()

                # Update Leaderboard
                score = item.get('quiz_score', 0)
                username = item.get('username', 'Scholar')
                try:
                    existing = supabase.table('leaderboard').select(
                        '*').eq('user_id', user_id).execute()
                    if existing.data:
                        new_score = existing.data[0]['score'] + score
                        supabase.table('leaderboard').update(
                            {"score": new_score}).eq('user_id', user_id).execute()
                    else:
                        supabase.table('leaderboard').insert(
                            {"user_id": user_id, "full_name": username, "score": score}).execute()
                except:
                    pass

        # 3. Sync Saved Resources
        resources_list = guest_data.get('resources', [])
        if resources_list:
            for res in resources_list:
                res['user_id'] = user_id
                supabase.table('saved_resources').insert(res).execute()

        return jsonify({"success": True, "message": "Guest data merged successfully"})

    except Exception as e:
        print(f"Sync Error: {e}")
        return jsonify({"error": str(e)}), 500


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
    user_id = data.get('user_id')
    username = data.get('username', 'Anonymous')
    score = data.get('score', 0)

    blob = TextBlob(feedback)
    try:
        supabase.table('node_progress').insert({
            "user_id": user_id,
            "topic": data.get('topic', 'General').strip().title(),
            "node_label": data.get('node_label'),
            "quiz_score": score,
            "feedback_text": feedback,
            "sentiment_score": blob.sentiment.polarity
        }).execute()

        try:
            existing = supabase.table('leaderboard').select(
                '*').eq('user_id', user_id).execute()
            if existing.data:
                new_score = existing.data[0]['score'] + score
                supabase.table('leaderboard').update(
                    {"score": new_score, "full_name": username}).eq('user_id', user_id).execute()
            else:
                supabase.table('leaderboard').insert(
                    {"user_id": user_id, "full_name": username, "score": score}).execute()
        except Exception as lb_error:
            print(f"Leaderboard Error: {lb_error}")

        return jsonify({"message": "Saved"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        response = supabase.table('leaderboard').select(
            '*').order('score', desc=True).limit(10).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify([])


@app.route('/api/roadmap', methods=['GET'])
def get_roadmap():
    topic = request.args.get('topic', '').strip().title()
    mode = request.args.get('mode', 'standard')

    if mode == 'standard':
        try:
            existing = supabase.table('user_roadmaps').select(
                'graph_data').eq('topic', topic).limit(1).execute()
            if existing.data:
                return jsonify(existing.data[0]['graph_data'])
        except:
            pass

    if mode == 'panic':
        prompt = f"""
        The user has an EXAM TOMORROW on '{topic}'. 
        Create a customized 'Crash Course' learning path in English with exactly 4 steps.
        Focus ONLY on the high-yield, most critical concepts that appear in exams.
        Skip the history/intro. Go straight to the hard/important stuff.
        Return strict JSON: {{ "nodes": [ {{"id": "1", "label": "Core Concept 1"}}, ... ] }}
        """
    else:
        prompt = f"""
        Create a comprehensive, linear 7-step learning path for '{topic}' in English.
        Start from basics and progress to advanced.
        Return strict JSON: {{ "nodes": [ {{"id": "1", "label": "Basics"}}, ... ] }}
        """

    try:
        completion = groq_client.chat.completions.create(model=GROQ_MODEL, messages=[
                                                         {"role": "user", "content": prompt}], temperature=0.1, response_format={"type": "json_object"})
        data = parse_json_safely(completion.choices[0].message.content, "dict")
        return jsonify(data if data else {"nodes": [{"id": "1", "label": f"{topic} Basics"}]})
    except:
        return jsonify({"nodes": [{"id": "1", "label": f"{topic} Basics"}]})


@app.route('/api/quiz', methods=['GET'])
def get_quiz():
    main = request.args.get('main_topic')
    sub = request.args.get('sub_topic')
    num = request.args.get('num', '10')
    history = request.args.get('history', '')

    difficulty_instruction = """
    DIFFICULTY: INTERMEDIATE to ADVANCED. 
    - Questions must be SCENARIO-BASED or CODE ANALYSIS (e.g., "What is the output?", "Find the bug", "Best pattern for...").
    - No simple definitions.
    """

    if history:
        # CUMULATIVE EXAM
        prompt = f"""
        Create a {num}-question multiple-choice assessment for a student learning '{main}'.
        
        CURRENT TOPIC: '{sub}'
        PREVIOUSLY LEARNED: '{history}'
        
        {difficulty_instruction}
        
        DISTRIBUTION INSTRUCTIONS:
        1. ~70% of questions must focus strictly on the CURRENT TOPIC ('{sub}').
        2. ~30% of questions should integrate concepts from PREVIOUSLY LEARNED topics to test retention (e.g., how '{sub}' interacts with '{history}').
        
        Return strict JSON Array: [{{ "question": "...", "options": ["A","B","C","D"], "correct_answer": 0 }}]
        """
    else:
        # FIRST MODULE
        prompt = f"""
        Create a {num}-question multiple-choice assessment for the topic: '{sub}' (Context: '{main}').
        
        {difficulty_instruction}
        
        INSTRUCTIONS:
        - Focus 100% on '{sub}'.
        - Deep dive into edge cases and implementation details.
        
        Return strict JSON Array: [{{ "question": "...", "options": ["A","B","C","D"], "correct_answer": 0 }}]
        """

    try:
        completion = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        data = parse_json_safely(completion.choices[0].message.content, "list")

        if isinstance(data, dict):
            for k in data:
                if isinstance(data[k], list):
                    return jsonify(data[k])

        return jsonify(data if data else [])
    except Exception as e:
        print(f"Quiz Gen Error: {e}")
        return jsonify([{"question": "Error generating quiz. Please retry.", "options": ["OK"], "correct_answer": 0}])


@app.route('/api/resources', methods=['GET'])
def get_resources():
    search_query = request.args.get('search_query')
    topic_key = request.args.get('topic_key', '').strip().title()
    node_label = request.args.get('node_label', '').strip()
    mode = request.args.get('mode', 'standard')

    if not search_query:
        search_query = request.args.get('topic')

    trust_score = None
    satisfaction_level = "Neutral"
    review_count = 0

    try:
        response = supabase.table('node_progress').select('sentiment_score').eq(
            'topic', topic_key).eq('node_label', node_label).execute()
        scores = [item['sentiment_score']
                  for item in response.data if item['sentiment_score'] is not None]
        review_count = len(scores)

        if scores:
            avg_raw = sum(scores) / len(scores)
            trust_score = int(((avg_raw + 1) / 2) * 100)

            if trust_score >= 80:
                satisfaction_level = "High"
            elif trust_score >= 50:
                satisfaction_level = "Medium"
            else:
                satisfaction_level = "Low"

    except Exception as e:
        print(f"⚠️ Sentiment Calc Error: {e}")

    return jsonify({
        "videos": get_youtube_videos(search_query, mode),
        "articles": scrape_articles(search_query, mode),
        "pdfs": get_pdfs(search_query, mode),
        "trust_score": trust_score,
        "satisfaction_level": satisfaction_level,
        "review_count": review_count
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

# --- ADMIN ROUTES ---


@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    try:
        users = supabase.table('leaderboard').select(
            '*', count='exact').execute()
        total_users = users.count if users.count else len(users.data)
        roadmaps = supabase.table('user_roadmaps').select(
            '*', count='exact').execute()
        total_roadmaps = roadmaps.count if roadmaps.count else len(
            roadmaps.data)
        feedback = supabase.table('node_progress').select(
            'sentiment_score').execute()
        scores = [f['sentiment_score']
                  for f in feedback.data if f['sentiment_score']]
        avg_satisfaction = int(
            ((sum(scores)/len(scores) + 1)/2)*100) if scores else 0
        return jsonify({"users": total_users, "roadmaps": total_roadmaps, "satisfaction": avg_satisfaction})
    except:
        return jsonify({"users": 0, "roadmaps": 0, "satisfaction": 0})


@app.route('/api/admin/roadmaps', methods=['GET'])
def get_admin_roadmaps():
    try:
        res = supabase.table('user_roadmaps').select(
            '*').order('created_at', desc=True).limit(20).execute()
        return jsonify(res.data)
    except:
        return jsonify([])


@app.route('/api/admin/feedback', methods=['GET'])
def get_admin_feedback():
    try:
        res = supabase.table('node_progress').select(
            '*').neq('feedback_text', '').order('created_at', desc=True).limit(20).execute()
        return jsonify(res.data)
    except:
        return jsonify([])


@app.route('/api/admin/users', methods=['GET'])
def get_admin_users():
    try:
        res = supabase.table('leaderboard').select(
            '*').order('score', desc=True).execute()
        return jsonify(res.data)
    except:
        return jsonify([])


@app.route('/api/admin/delete_roadmap', methods=['DELETE'])
def admin_delete_roadmap():
    try:
        supabase.table('user_roadmaps').delete().eq(
            'topic', request.args.get('topic')).execute()
        return jsonify({"message": "Deleted by Admin"})
    except:
        return jsonify({"error": "Failed"}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
