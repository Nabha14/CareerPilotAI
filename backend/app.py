import os
import re
import time  # 🛠️ Added to support the API traffic backoff retry delay loops
import smtplib  # 📬 Added for email connectivity
from email.mime.multipart import MIMEMultipart  # 📬 Added for structuring email containers
from email.mime.text import MIMEText  # 📬 Added for plain-text formatting
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
from google import genai

# Load environment variables
load_dotenv()

app = Flask(__name__)
# 🛠️ FULL CORNERSTONE OVERRIDE: Open origins globally to prevent browser preflight blocks
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})

API_KEY = os.getenv("GEMINI_API_KEY")
active_chat_session = None
interview_round = 0
MAX_ROUNDS = 5

if API_KEY:
    client = genai.Client(api_key=API_KEY)
    print("✅ Success: Modern Gemini Client initialized perfectly!")
else:
    client = None
    print("⚠️ WARNING: GEMINI_API_KEY was not found in the environment variables.")

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")       
    )

# --- EMAIL CONFIGURATION ---
SENDER_EMAIL = "nabhapote@gmail.com" 
APP_PASSWORD = "jwmmxagpaznybgoh" 

def send_welcome_email(receiver_email, user_name):
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = receiver_email
        msg['Subject'] = "Welcome to CareerPilot AI! 🚀"

        body = f"Hello {user_name},\n\nWelcome to CareerPilot AI! Your account is created and your data is securely saved in our database."
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, APP_PASSWORD)
        server.sendmail(SENDER_EMAIL, receiver_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Email Error: {e}")
        return False

# --- API ENDPOINTS ---

# 1. REGISTER ROUTE
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    
    full_name = data.get('full_name')
    email = data.get('email')
    password = data.get('password')
    degree = data.get('degree')
    cgpa = data.get('cgpa')
    skills = data.get('skills')
    current_role = data.get('current_role')
    target_role = data.get('target_role')

    if not email or not password or not full_name:
        return jsonify({"status": "error", "message": "Missing required fields!"}), 400

    try:
        db = get_db_connection()
        cursor = db.cursor()

        hashed_password = generate_password_hash(password)

        sql = """INSERT INTO users 
                 (full_name, email, password_hash, degree, cgpa, skills, current_role, target_role) 
                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
        values = (full_name, email, hashed_password, degree, cgpa, skills, current_role, target_role)
        
        cursor.execute(sql, values)
        db.commit()
        
        send_welcome_email(email, full_name)

        return jsonify({"status": "success", "message": "Registration successful! Welcome email sent."}), 200

    except mysql.connector.IntegrityError:
        return jsonify({"status": "error", "message": "An account with this email already exists."}), 409
    except Exception as e:
        print(f"Database Error: {e}")
        return jsonify({"status": "error", "message": "Server error while creating account."}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'db' in locals(): db.close()

# 2. LOGIN ROUTE
@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"status": "error", "message": "Missing email or password!"}), 400

    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True) 
        
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if user and check_password_hash(user['password_hash'], password):
            return jsonify({
                "status": "success", 
                "message": "Login successful!",
                "user": {
                    "name": user['full_name'],
                    "role": user['target_role']
                }
            }), 200
        else:
            return jsonify({"status": "error", "message": "Invalid email or password."}), 401
            
    except Exception as e:
        print(f"Login Error: {e}")
        return jsonify({"status": "error", "message": "Server error during login."}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'db' in locals(): db.close()

# 3. GENERATE PLAN ROUTE
@app.route('/generate-plan', methods=['POST'])
def generate_plan():
    data = request.get_json()
    topic = data.get('topic')
    timeframe = data.get('timeframe')

    if not topic or not timeframe:
        return jsonify({"status": "error", "message": "Missing topic or timeframe"}), 400

    try:
        api_key_val = os.getenv("GEMINI_API_KEY")
        client = genai.Client(api_key=api_key_val)

        prompt = f"""
        You are an expert career coach and technical tutor.
        Create a detailed, actionable, week-by-week study plan for a student who wants to learn "{topic}" in exactly {timeframe} weeks.
        
        CRITICAL INSTRUCTIONS:
        - Format your entire response using ONLY clean HTML tags (like <h3>, <h4>, <ul>, <li>, <strong>).
        - Do not use any markdown backticks (like ```html). 
        - Make it look professional and easy to read.
        """

        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=prompt
        )

        return jsonify({
            "status": "success",
            "plan_html": response.text
        })

    except Exception as e:
        print("AI Error:", e)
        return jsonify({
            "status": "error",
            "message": "The AI is currently resting. Please try again."
        }), 500
        
        
# 4. START INTERVIEW ROUTE
@app.route('/start-interview', methods=['POST'])
def start_interview():
    global active_chat_session, interview_round
    
    data = request.get_json() or {}
    topic = data.get('topic', 'Full Stack Developer (Java, JSP, MySQL)')
    
    try:
        interview_round = 1
        
        active_chat_session = client.chats.create(
            model="gemini-2.5-flash",
            config=genai.types.GenerateContentConfig(
                system_instruction=(
                    f"You are an expert technical interviewer conducting a live, realistic video-call interview.\n"
                    f"The candidate is interviewing for a role focused on: {topic}.\n\n"
                    f"CRITICAL INSTRUCTIONS:\n"
                    f"- Ask exactly ONE concise technical question at a time.\n"
                    f"- Treat the candidate's answers conversationally. Acknowledge their response briefly, then ask a follow-up or move to the next concept.\n"
                    f"- Do not break character, do not give away solutions upfront, and keep your questions brief (1-3 sentences) so they look clean in a chat transcript.\n"
                    f"- Start immediately by welcoming them and asking the first core question."
                )
            )
        )
        
        response = active_chat_session.send_message("Let's begin the interview.")
        
        return jsonify({
            "status": "success",
            "round": interview_round,
            "max_rounds": MAX_ROUNDS,
            "question": response.text
        })
        
    except Exception as e:
        print("AI Interview Setup Error:", e)
        return jsonify({"status": "error", "message": "Failed to boot up the interviewer engine."}), 500


# 5. SUBMIT ANSWER ROUTE (WITH DISPATCH RETRY AND DATABASE SAVING)
@app.route('/submit-answer', methods=['POST'])
def submit_answer():
    global active_chat_session, interview_round
    
    data = request.get_json() or {}
    user_message = data.get('message', '')
    user_email = data.get('email', 'test_user@careerpilot.com')
    topic = data.get('topic', 'Full Stack Developer (Java, JSP, MySQL)')
    
    if not user_message.strip():
        return jsonify({"status": "error", "message": "Answer cannot be empty."}), 400
        
    if not active_chat_session:
        print("🔄 Backend session missing. Re-initializing Gemini client stream...")
        try:
            interview_round = 1
            active_chat_session = client.chats.create(
                model="gemini-2.5-flash",
                config=genai.types.GenerateContentConfig(
                    system_instruction=(
                        f"You are an expert technical interviewer conducting a live, realistic video-call interview.\n"
                        f"The candidate is interviewing for a role focused on: {topic}.\n\n"
                        f"CRITICAL INSTRUCTIONS:\n"
                        f"- Ask exactly ONE concise technical question at a time.\n"
                        f"- Treat the candidate's answers conversationally. Acknowledge their response briefly, then ask a follow-up.\n"
                        f"- Keep questions brief (1-3 sentences)."
                    )
                )
            )
        except Exception as startup_err:
            print("Failed to auto-heal session:", startup_err)
            return jsonify({"status": "error", "message": "No active interview session found. Please refresh."}), 400
        
    try:
        if interview_round >= MAX_ROUNDS:
            final_prompt = (
                f"This is the final turn. Evaluate my answer: '{user_message}'. "
                "Conclude the interview gracefully, thank me, and provide a brief performance rating out of 10 "
                "formatted explicitly as 'Score: X/10' followed by 2 actionable areas for technical improvement."
            )
            
            # 🛠️ TRAFFIC RESILIENCY ENGINE: Retry connection loops if Gemini hits a 503 or 429 quota bottleneck
            ai_final_text = None
            for attempt in range(3):
                try:
                    response = active_chat_session.send_message(final_prompt)
                    ai_final_text = response.text
                    break
                except Exception as api_err:
                    if attempt < 2:
                        print(f"⚠️ Model busy or rate-limited. Retrying final evaluation stream in 2 seconds... (Attempt {attempt + 1}/3)")
                        time.sleep(2)
                        continue
                    else:
                        raise api_err

            score_match = re.search(r'(\d+)\s*/\s*10', ai_final_text)
            extracted_score = int(score_match.group(1)) if score_match else 5
            
            try:
                db = get_db_connection()
                cursor = db.cursor()
                
                sql = """INSERT INTO mock_interviews (user_email, topic, score, feedback) 
                         VALUES (%s, %s, %s, %s)"""
                values = (user_email, topic, extracted_score, ai_final_text)
                
                cursor.execute(sql, values)
                db.commit()
                print(f"💾 Success: Interview saved to MySQL with a score of {extracted_score}/10!")
                
            except Exception as db_err:
                print("⚠️ Database Save Error:", db_err)
            finally:
                if 'cursor' in locals(): cursor.close()
                if 'db' in locals(): db.close()
            
            active_chat_session = None
            interview_round = 0
            
            return jsonify({
                "status": "completed",
                "round": MAX_ROUNDS,
                "message": ai_final_text
            })
            
        else:
            interview_round += 1
            response_text = ""
            
            # 🛠️ TRAFFIC RESILIENCY ENGINE (ROUND TURNS)
            for attempt in range(3):
                try:
                    response = active_chat_session.send_message(user_message)
                    response_text = response.text
                    break
                except Exception as api_err:
                    if attempt < 2:
                        print(f"⚠️ Model busy. Retrying transaction turn in 2 seconds... (Attempt {attempt + 1}/3)")
                        time.sleep(2)
                        continue
                    else:
                        interview_round -= 1  # Rollback counter before giving up
                        raise api_err
            
            return jsonify({
                "status": "success",
                "round": interview_round,
                "max_rounds": MAX_ROUNDS,
                "question": response_text
            })
            
    except Exception as e:
        print("AI Interview Loop Error:", e)
        return jsonify({"status": "error", "message": "The interviewer lost connection to the stream."}), 500


# 6. DYNAMIC HISTORICAL REPORT FETCH ROUTE (ENHANCED ENGINE)
@app.route('/interview-history', methods=['GET'])
def get_interview_history():
    user_email = request.args.get('email', 'test_user@careerpilot.com')
    
    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        
        # Query A: Get all historical entries
        sql = """SELECT id, topic, score, feedback, DATE_FORMAT(date_taken, '%b %d, %Y') as date_str 
                 FROM mock_interviews 
                 WHERE user_email = %s 
                 ORDER BY date_taken DESC"""
        cursor.execute(sql, (user_email,))
        history = cursor.fetchall()
        
        # Query B: Dynamically compute readiness metric percentage average
        avg_sql = "SELECT AVG(score) as avg_score FROM mock_interviews WHERE user_email = %s"
        cursor.execute(avg_sql, (user_email,))
        avg_result = cursor.fetchone()
        
        # Calculate dynamic matching math (e.g., Average score of 7.5 out of 10 becomes 75%)
        computed_readiness = 0
        if avg_result and avg_result['avg_score'] is not None:
            computed_readiness = int(float(avg_result['avg_score']) * 10)
        else:
            computed_readiness = 50 # Default baseline fallback if history table data is zero
        
        return jsonify({
            "status": "success",
            "history": history,
            "readiness": computed_readiness
        }), 200
        
    except Exception as e:
        print("Error fetching aggregated dashboard metrics:", e)
        return jsonify({"status": "error", "message": "Could not retrieve performance metrics."}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'db' in locals(): db.close()

# =========================================
# 🚀 FLASK APPLICATION RUNTIME CONFIGURATION
# =========================================
if __name__ == '__main__':
    print("📢 Flask server booting up on port 5000... Keeping process active!")
    app.run(host='127.0.0.1', port=5000, debug=True)