// =========================================
// 🌐 GLOBAL ANALYTICS METRIC CONTROLLERS
// =========================================
let performanceChartInstance = null;

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
    // 3. DASHBOARD INITIAL STATIC TEXT FILL
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
        
        // Boot up core database synchronization metrics
        loadDashboardMetrics();
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
                    
                    contentArea.style.color = "#1e293b"; 
                    
                    const headings = contentArea.querySelectorAll("h3, h4, h5, strong");
                    headings.forEach(el => el.style.color = "#0f172a"); 
                    
                    const listItems = contentArea.querySelectorAll("li");
                    listItems.forEach(el => el.style.color = "#334155"); 

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

        // 📐 CLOSING HANDLERS WITH CHART DYNAMIC AUTO-HEAL REDRAWS
        if (closeBtn) {
            closeBtn.addEventListener('click', () => { 
                modal.style.display = 'none'; 
                if (performanceChartInstance) {
                    setTimeout(() => {
                        performanceChartInstance.resize();
                        performanceChartInstance.update();
                    }, 50);
                }
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === modal) { 
                modal.style.display = 'none'; 
                if (performanceChartInstance) {
                    setTimeout(() => {
                        performanceChartInstance.resize();
                        performanceChartInstance.update();
                    }, 50);
                }
            }
        });
    }

    // =========================================
    // 5b. DASHBOARD MAIN 4-WEEK BULK PLAN MASTER TRIGGER
    // =========================================
    const dashMainPlanBtn = document.getElementById("dashboard-generate-plan-btn");
    
    if (dashMainPlanBtn && modal) {
        dashMainPlanBtn.addEventListener("click", async () => {
            const activeTags = document.querySelectorAll('.skills-card .skill-tag');
            let combinedSkills = [];
            
            activeTags.forEach(tag => combinedSkills.push(tag.innerText));
            
            const cleanTopicString = combinedSkills.length > 0 ? combinedSkills.join(", ") : "Advanced SQL, System Design, React.js";
            
            modal.style.display = 'flex';
            planTitle.innerText = `4-Week Master Curriculum`;
            planContent.innerHTML = `<p style="text-align:center; margin-top:2rem;">🧠 AI is mapping your 4-week performance strategy for:<br><strong>${cleanTopicString}</strong>...<br><br>Please wait a few seconds while the pipeline compiles.</p>`;

            try {
                const response = await fetch("http://127.0.0.1:5000/generate-plan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        topic: cleanTopicString, 
                        timeframe: "4" 
                    })
                });

                const result = await response.json();
                
                if (result.status === "success") {
                    planContent.innerHTML = result.plan_html;

                    // Clean embedded content backgrounds
                    const embeddedContainers = planContent.querySelectorAll("div, section, article, [style*='background']");
                    embeddedContainers.forEach(container => {
                        container.style.backgroundColor = "rgba(255, 255, 255, 0.03)";
                        container.style.background = "rgba(255, 255, 255, 0.03)";
                        container.style.color = "#cbd5e1"; 
                        container.style.border = "1px solid rgba(255, 255, 255, 0.08)";
                        container.style.borderRadius = "12px";
                        container.style.padding = "20px";
                        container.style.marginBottom = "15px";
                        container.style.boxShadow = "none";
                    });

                    const allParagraphs = planContent.querySelectorAll("p, span, li");
                    allParagraphs.forEach(p => {
                        p.style.color = "rgba(255, 255, 255, 0.9)";
                    });

                    const allHeadings = planContent.querySelectorAll("h1, h2, h3, h4, h5, h6, strong");
                    allHeadings.forEach(h => {
                        h.style.color = "#06b6d4";
                    });

                } else {
                    planContent.innerHTML = `<p style="color:#ff4757; text-align:center; padding: 20px;">Backend Error: ${result.message}</p>`;
                }
            } catch (error) {
                console.error("Dashboard Global AI Plan Compilation Error:", error);
                planContent.innerHTML = `<p style="color:#ff4757; text-align:center; padding: 20px;">Failed to connect to the Python backend server. Ensure app.py is running.</p>`;
            }
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
});

// =========================================
// FETCH AND AGGREGATE CORE DASHBOARD METRICS
// =========================================
async function loadDashboardMetrics() {
    const grid = document.getElementById("history-grid");
    const readinessNumber = document.querySelector(".score-number");
    const recentList = document.getElementById("recent-interviews-list");
    
    if (!grid) return; 

    const userEmail = localStorage.getItem("userEmail") || "nabhapote@gmail.com"; 

    try {
        const response = await fetch(`http://127.0.0.1:5000/interview-history?email=${userEmail}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();

        // -----------------------------------------
        // 1. UPDATE PLACEMENT READINESS PERCENTAGE DYNAMICALLY
        // -----------------------------------------
        if (readinessNumber && data.readiness !== undefined) {
            readinessNumber.innerText = `${data.readiness}%`;
        }

        // -----------------------------------------
        // 2. RENDER PERFORMANCE HISTORY REPORT CARDS & INITIALIZE CHART.JS
        // -----------------------------------------
        grid.innerHTML = "";

        if (data.status === "success" && data.history && data.history.length > 0) {
            
            // 📊 PROCESSING HISTORICAL TIMELINE FOR TREND LINE ENGINE
            const sortedHistory = [...data.history].reverse(); // Oldest to newest
            const chartLabels = sortedHistory.map((item, index) => `Session ${index + 1}`);
            const chartScores = sortedHistory.map(item => item.score);

            const ctx = document.getElementById('performanceChart');
            if (ctx) {
                if (performanceChartInstance) {
                    performanceChartInstance.destroy(); // Clear active overlay loops
                }

                performanceChartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: chartLabels,
                        datasets: [{
                            label: 'Performance Trends',
                            data: chartScores,
                            borderColor: '#06b6d4', // Cyan theme accent
                            backgroundColor: 'rgba(6, 182, 212, 0.12)',
                            borderWidth: 2.5,
                            pointBackgroundColor: '#7c3aed', // Purple pointer markers
                            pointRadius: 4,
                            tension: 0.3, // Smooth curvy curves
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,            // 🌟 Keeps chart dynamic
                        maintainAspectRatio: false,  // 🌟 Forces chart into wrapper container bounds
                        resizeDelay: 50,             // 🌟 Pauses render loop until HTML grid calculation finishes
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { display: false }, // Hides chaotic date stamps to preserve glass layout spacing
                            y: {
                                min: 0,
                                max: 10,
                                ticks: { stepSize: 2, color: 'rgba(255,255,255,0.4)', font: { size: 9 } },
                                grid: { color: 'rgba(255,255,255,0.05)' }
                            }
                        }
                    }
                });
            }

            // Populate cards inside history wrapper container
            grid.innerHTML = data.history.map(item => {
                const sanitizedFeedback = item.feedback.replace(/`/g, '\\`').replace(/"/g, '&quot;');
                
                return `
                <div class="history-card" style="background: rgba(255, 255, 255, 0.04); padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; justify-content: space-between; height: 180px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); margin-bottom: 15px; box-sizing: border-box;">
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 500;">${item.date_str || 'Recent Session'}</span>
                            <span style="background: linear-gradient(135deg, #4f46e5, #a855f7); padding: 2px 10px; border-radius: 20px; font-weight: 700; font-size: 0.8rem; color: white;">${item.score}/10</span>
                        </div>
                        <h4 style="color: #60a5fa; margin: 0 0 6px 0; font-size: 1rem; text-align: left; font-weight: 600;">${item.topic}</h4>
                        <p style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.4; text-align: left; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; white-space: normal;">
                            ${item.feedback}
                        </p>
                    </div>
                    <button style="margin-top: 10px; width: 100%; padding: 6px; font-size: 0.8rem; background: rgba(124, 58, 237, 0.15); border: 1px solid rgba(124, 58, 237, 0.3); color: #c084fc; border-radius: 6px; cursor: pointer; font-weight: 500; transition: 0.2s;" 
                            onclick="showFullReportModal(\`${sanitizedFeedback}\`, '${item.score}')">
                        Read Full Assessment →
                    </button>
                </div>
                `;
            }).join('');

            // -----------------------------------------
            // 3. RENDER RECENT MOCK INTERVIEWS LIST WITH DYNAMIC STATUS
            // -----------------------------------------
            if (recentList) {
                const recentEntries = data.history.slice(0, 3);
                
                recentList.innerHTML = recentEntries.map(item => {
                    const isPassed = item.score >= 7;
                    const statusText = isPassed ? "Passed" : "Needs Review";
                    const statusClass = isPassed ? "status passed" : "status review";
                    
                    return `
                    <li style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span>${item.topic} (${item.score}/10)</span>
                        <span class="${statusClass}">${statusText}</span>
                    </li>
                    `;
                }).join('');
            }

        } else {
            grid.innerHTML = `<p style="color: #94a3b8; font-style: italic; margin: 0;">No interviews completed yet. Complete a session to see your report here!</p>`;
            if (recentList) {
                recentList.innerHTML = `<li style="color: #94a3b8; font-style: italic; font-size: 0.9rem;">No dynamic interview tracks found.</li>`;
            }
        }
    } catch (err) {
        console.error("❌ Failed to parse or render dashboard metrics:", err);
        
        const fallbackGrid = document.getElementById("history-grid");
        if (fallbackGrid && fallbackGrid.innerHTML.includes("Loading")) {
            fallbackGrid.innerHTML = `
                <p style="color: #94a3b8; font-style: italic; margin: 0; font-size: 0.9rem;">
                    The AI engine is currently resting due to high traffic limits. Your completed reports remain safely saved in MySQL!
                </p>`;
        }
    }
}

// =========================================
// 🔲 MODAL CONTROLLER FOR FULL DETAILS VIEW
// =========================================
function showFullReportModal(feedbackText, score) {
    const modal = document.getElementById("quick-plan-modal");
    const modalTitle = document.getElementById("quick-plan-title");
    const modalContent = document.getElementById("quick-plan-content");
    
    if (modal && modalContent && modalTitle) {
        modalTitle.innerHTML = `Performance Evaluation Summary (${score}/10)`;
        modalContent.innerHTML = `<div style="text-align:left; color:#cbd5e1; font-size:0.95rem; line-height:1.6; max-height:60vh; overflow-y:auto; padding-right:5px;">${feedbackText.replace(/\n/g, '<br>')}</div>`;
        modal.style.display = "flex";
        
        const closeBtn = document.getElementById("close-quick-plan");
        if (closeBtn) {
            closeBtn.onclick = () => { 
                modal.style.display = "none"; 
                if (performanceChartInstance) {
                    setTimeout(() => {
                        performanceChartInstance.resize();
                        performanceChartInstance.update();
                    }, 50);
                }
            };
        }
    } else {
        alert(`Your Performance Score: ${score}/10\n\n${feedbackText}`);
    }
}