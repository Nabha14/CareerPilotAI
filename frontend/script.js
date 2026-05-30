document.addEventListener("DOMContentLoaded", () => {
    console.log("CareerPilotAI Engine Loaded & Ready! 🚀");

    // =========================================
    // 1. LOGIN PAGE LOGIC
    // =========================================
    const loginForm = document.querySelector(".login-card form");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault(); 
            
            const submitBtn = loginForm.querySelector("button");
            submitBtn.innerText = "Authenticating...";

            const inputs = loginForm.querySelectorAll("input");
            const loginData = {
                email: inputs[0].value,
                password: inputs[1].value
            };

            try {
                const response = await fetch("http://127.0.0.1:5000/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(loginData)
                });

                const result = await response.json();
                
                if (result.status === "success") {
                    localStorage.setItem("userEmail", loginData.email);
                    localStorage.setItem("userName", result.user.name);
                    localStorage.setItem("targetRole", result.user.role);
                    
                    alert("Welcome back!");
                    window.location.href = "dashboard.html"; 
                } else {
                    alert(result.message); 
                }
                
            } catch (error) {
                console.error("Login Error:", error);
                alert("Could not connect to Python server. Ensure app.py is running.");
            } finally {
                submitBtn.innerText = "Login";
            }
        });
    }

    // =========================================
    // 2. REGISTER PAGE LOGIC
    // =========================================
    const registerForm = document.querySelector(".register-card form");

    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault(); 
            
            const submitBtn = registerForm.querySelector("button");
            submitBtn.innerText = "Saving to Database...";

            const inputs = registerForm.querySelectorAll("input");
            const selects = registerForm.querySelectorAll("select");

            const userData = {
                full_name: inputs[0].value,
                email: inputs[1].value,
                password: inputs[2].value,
                degree: inputs[3].value,
                cgpa: inputs[4].value,
                skills: inputs[5].value,
                current_role: selects[0].value,
                target_role: selects[1].value
            };

            try {
                const response = await fetch("http://127.0.0.1:5000/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(userData)
                });

                const result = await response.json();
                alert(result.message); 
                
                if (result.status === "success") {
                    window.location.href = "login.html"; 
                }
                
            } catch (error) {
                console.error("Register Error:", error);
                alert("Could not connect to Python server.");
            } finally {
                submitBtn.innerText = "Register";
            }
        });
    }

    // =========================================
    // 3. DASHBOARD DYNAMIC DATA
    // =========================================
    if (document.getElementById("welcome-text")) {
        const savedName = localStorage.getItem("userName");
        const savedRole = localStorage.getItem("targetRole");

        if (savedName) {
            document.getElementById("welcome-text").innerText = `Welcome back, ${savedName}! 👋`;
        }
        if (savedRole) {
            document.getElementById("target-role-text").innerHTML = `Your target role: <strong>${savedRole}</strong>`;
        }
    }
// =========================================
    // 4. AI STUDY PLAN LOGIC
    // =========================================
    const studyForm = document.getElementById("ai-study-form");

    if (studyForm) {
        studyForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const submitBtn = studyForm.querySelector("button");
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "🧠 AI is building your plan... Please wait...";
            submitBtn.disabled = true;

            const topic = document.getElementById("topic").value;
            const timeframe = document.getElementById("timeframe").value;

            try {
                const response = await fetch("http://127.0.0.1:5000/generate-plan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ topic, timeframe })
                });

                const result = await response.json();

                if (result.status === "success") {
                    const outputSection = document.getElementById("ai-output-section");
                    const contentArea = document.getElementById("ai-response-content");

                    outputSection.style.display = "block";
                    contentArea.innerHTML = result.plan_html;
                    
                    // 🛠️ FIX: Force high-contrast text styling for the injected HTML content
                    contentArea.style.color = "#1e293b"; // Dark charcoal for prose/lists
                    
                    // Force any internal headings or list items to stand out cleanly
                    const headings = contentArea.querySelectorAll("h3, h4, h5, strong");
                    headings.forEach(el => el.style.color = "#0f172a"); // Deep slate bold text
                    
                    const listItems = contentArea.querySelectorAll("li");
                    listItems.forEach(el => el.style.color = "#334155"); // Medium charcoal for clear lists

                    outputSection.scrollIntoView({ behavior: 'smooth' });
                } else {
                    alert("Error: " + result.message);
                }

            } catch (error) {
                console.error("AI Fetch Error:", error);
                alert("Could not connect to the AI server. Is Python running?");
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // =========================================
    // 5. DASHBOARD QUICK AI PLAN LOGIC (MODAL)
    // =========================================
    const skillTags = document.querySelectorAll('.skill-tag');
    const modal = document.getElementById('quick-plan-modal');
    const closeBtn = document.getElementById('close-quick-plan');
    const planContent = document.getElementById('quick-plan-content');
    const planTitle = document.getElementById('quick-plan-title');

    if (skillTags.length > 0 && modal) {
        skillTags.forEach(tag => {
            tag.addEventListener('click', async () => {
                const skill = tag.innerText;
                
                modal.style.display = 'flex';
                planTitle.innerText = `1-Week Crash Course: ${skill}`;
                planContent.innerHTML = `<p style="text-align:center; margin-top:2rem;">🧠 AI is building your fast-track plan for ${skill}...<br>Please wait a few seconds.</p>`;

                try {
                    const response = await fetch("http://127.0.0.1:5000/generate-plan", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ topic: skill, timeframe: "1" })
                    });

                    const result = await response.json();
                    
                    if (result.status === "success") {
                        planContent.innerHTML = result.plan_html;
                    } else {
                        planContent.innerHTML = `<p style="color:red;">Error: ${result.message}</p>`;
                    }
                } catch (error) {
                    console.error("Popup AI Error:", error);
                    planContent.innerHTML = `<p style="color:red;">Failed to connect to the AI.</p>`;
                }
            });
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
        }

        window.addEventListener('click', (e) => {
            if (e.target === modal) { modal.style.display = 'none'; }
        });
    }

    // =========================================
    // 6. PROFILE MANAGER LOGIC
    // =========================================
    const profileForm = document.getElementById("profile-form");

    if (profileForm) {
        const nameInput = document.getElementById("profile-name");
        const emailInput = document.getElementById("profile-email");
        const roleInput = document.getElementById("profile-role");
        const messageBox = document.getElementById("profile-message");

        const savedEmail = localStorage.getItem("userEmail") || localStorage.getItem("email");
        const savedName = localStorage.getItem("userName") || localStorage.getItem("name");
        const savedRole = localStorage.getItem("targetRole") || localStorage.getItem("role");

        if (emailInput) emailInput.value = savedEmail || "No Email Stored";
        if (nameInput) nameInput.value = savedName || "";
        if (roleInput && savedRole) roleInput.value = savedRole;

        profileForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const newName = nameInput.value;
            const newRole = roleInput.value;
            const userEmail = emailInput.value; 

            try {
                const response = await fetch("http://127.0.0.1:5000/update-profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: userEmail, name: newName, role: newRole })
                });

                const result = await response.json();

                if (result.status === "success") {
                    localStorage.setItem("userName", newName);
                    localStorage.setItem("targetRole", newRole);

                    if (messageBox) {
                        messageBox.style.display = "block";
                        messageBox.style.color = "#4ade80"; 
                        messageBox.innerText = "✅ " + result.message;
                        setTimeout(() => messageBox.style.display = "none", 3000);
                    }
                } else if (messageBox) {
                    messageBox.style.display = "block";
                    messageBox.style.color = "#ff4757"; 
                    messageBox.innerText = "❌ " + result.message;
                }

            } catch (error) {
                console.error("Profile Update Error:", error);
                alert("Failed to connect to the server.");
            }
        });
    }

    // =========================================
    // 7. INTERACTIVE MOCK INTERVIEWER LOGIC
    // =========================================
    const interviewSetupForm = document.getElementById("start-interview-form");
    if (interviewSetupForm) {
        console.log("Interview arena system primed. Waiting for selection...");
        // This is ready to capture arena commands for Step 2!
    }
});