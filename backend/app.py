import os
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
CORS(app, resources={r"/*": {"origins": "*"}})

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
# --- YOUR API ROUTES CONTINUE BELOW (e.g., @app.route('/login')) ---
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
    
    # Grab all the data from the frontend
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
        # Connect to database
        db = get_db_connection()
        cursor = db.cursor()

        # Encrypt the password
        hashed_password = generate_password_hash(password)

        # Insert into MySQL
        sql = """INSERT INTO users 
                 (full_name, email, password_hash, degree, cgpa, skills, current_role, target_role) 
                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
        values = (full_name, email, hashed_password, degree, cgpa, skills, current_role, target_role)
        
        cursor.execute(sql, values)
        db.commit() # Save the changes!
        
        # Send the welcome email
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
    # Handle CORS preflight request safely
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"status": "error", "message": "Missing email or password!"}), 400

    try:
        db = get_db_connection()
        # dictionary=True makes sure we get columns by name (like user['password_hash'])
        cursor = db.cursor(dictionary=True) 
        
        # Find the user by email
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        # Check if user exists AND password matches the encrypted hash
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

@app.route('/generate-plan', methods=['POST'])
def generate_plan():
    data = request.get_json()
    topic = data.get('topic')
    timeframe = data.get('timeframe')

    if not topic or not timeframe:
        return jsonify({"status": "error", "message": "Missing topic or timeframe"}), 400

    try:
        # 🛠️ SECURITY FIX: Use the variable loaded from your secure .env file instead of a hardcoded string
        api_key_val = os.getenv("GEMINI_API_KEY")
        client = genai.Client(api_key=api_key_val)

        # 1. We write a highly specific prompt for the AI
        prompt = f"""
        You are an expert career coach and technical tutor.
        Create a detailed, actionable, week-by-week study plan for a student who wants to learn "{topic}" in exactly {timeframe} weeks.
        
        CRITICAL INSTRUCTIONS:
        - Format your entire response using ONLY clean HTML tags (like <h3>, <h4>, <ul>, <li>, <strong>).
        - Do not use any markdown backticks (like ```html). 
        - Make it look professional and easy to read.
        """

        # 2. Call the Gemini API using the CORRECT model name
        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=prompt
        )

        # 3. Send the HTML directly back to the frontend
        return jsonify({
            "status": "success",
            "plan_html": response.text
        })

    except Exception as e:
        print("AI Error:", e) # This prints the exact error in your terminal!
        return jsonify({
            "status": "error",
            "message": "The AI is currently resting. Please try again."
        }), 500
        
        
@app.route('/start-interview', methods=['POST'])
def start_interview():
    global active_chat_session, interview_round
    
    data = request.get_json() or {}
    topic = data.get('topic', 'Full Stack Developer (Java, JSP, MySQL)')
    
    try:
        # Reset interview counter
        interview_round = 1
        
        # 1. Initialize a conversational multi-turn chat session with custom system behavior
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
        
        # 2. Kick off the chat stream
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


@app.route('/submit-answer', methods=['POST'])
def submit_answer():
    global active_chat_session, interview_round
    
    if not active_chat_session:
        return jsonify({"status": "error", "message": "No active interview session found. Please restart."}), 400
        
    data = request.get_json() or {}
    user_message = data.get('message', '')
    
    if not user_message.strip():
        return jsonify({"status": "error", "message": "Answer cannot be empty."}), 400
        
    try:
        interview_round += 1
        
        # Check if the interview rounds are completed
        if interview_round > MAX_ROUNDS:
            # Instruct the AI to wrap things up and give a direct report
            final_prompt = (
                f"This is the final turn. Evaluate my answer: '{user_message}'. "
                "Conclude the interview gracefully, thank me, and provide a brief performance rating out of 10 "
                "with 2 actionable areas for technical improvement."
            )
            response = active_chat_session.send_message(final_prompt)
            
            # Reset session after completion
            active_chat_session = None
            
            return jsonify({
                "status": "completed",
                "round": MAX_ROUNDS,
                "message": response.text
            })
            
        else:
            # Keep rolling the interview loop forward
            response = active_chat_session.send_message(user_message)
            
            return jsonify({
                "status": "success",
                "round": interview_round,
                "max_rounds": MAX_ROUNDS,
                "question": response.text
            })
            
    except Exception as e:
        print("AI Interview Loop Error:", e)
        return jsonify({"status": "error", "message": "The interviewer lost connection to the stream."}), 500
if __name__ == '__main__':
    app.run(debug=True, port=5000)