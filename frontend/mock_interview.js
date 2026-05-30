document.addEventListener("DOMContentLoaded", () => {
    const answerInput = document.getElementById("user-answer");
    const submitAnswerBtn = document.getElementById("submit-answer-btn");
    const roundIndicator = document.getElementById("round-indicator");
    const transcriptContainer = document.getElementById("transcript-container");

    let currentRound = 1;
    let maxRounds = 5;

    if (submitAnswerBtn) {
        submitAnswerBtn.addEventListener("click", async () => {
            const userText = answerInput.value.trim();
            if (!userText) return;

            // 1. Append User Text to UI immediately
            appendMessage("user", userText);
            answerInput.value = ""; // Clear input

            // 2. Lock down input
            submitAnswerBtn.disabled = true;
            submitAnswerBtn.innerText = "Processing...";
            
            try {
                let response = await fetch("http://127.0.0.1:5000/submit-answer", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: userText })
                });

                let data = await response.json();

                // AUTO-HEAL: If session isn't found, wake it up silently and retry!
                if (response.status === 400 && data.message && data.message.includes("No active interview session")) {
                    console.log("🔄 Session missing. Initializing handshake...");
                    
                    const startRes = await fetch("http://127.0.0.1:5000/start-interview", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ topic: "Full Stack Developer (Java, JSP, MySQL)" })
                    });
                    
                    if (startRes.ok) {
                        response = await fetch("http://127.0.0.1:5000/submit-answer", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ message: userText })
                        });
                        data = await response.json();
                    }
                }

                // 3. Process the Response Payload
                if (data.status === "success") {
                    currentRound = data.round;
                    if (roundIndicator) {
                        roundIndicator.innerText = `Question ${currentRound} of ${maxRounds}`;
                    }
                    
                    // Append the AI follow-up question to your transcript container
                    appendMessage("ai", data.question);
                    
                    submitAnswerBtn.disabled = false;
                    submitAnswerBtn.innerText = "Send";

                } else if (data.status === "completed") {
                    if (roundIndicator) roundIndicator.innerText = "Interview Complete 🎉";
                    appendMessage("ai", data.message);
                    
                    // Change Send button behavior to act as an evaluation report trigger
                    submitAnswerBtn.innerText = "View Report 📊";
                    submitAnswerBtn.disabled = false;
                    
                    // Clone the button to wipe old message click listeners cleanly
                    const newBtn = submitAnswerBtn.cloneNode(true);
                    submitAnswerBtn.parentNode.replaceChild(newBtn, submitAnswerBtn);
                    
                    newBtn.addEventListener("click", () => {
                        // Extract a rating out of the text block dynamically (looks for X/10 patterns)
                        const scoreMatch = data.message.match(/(\d+)\s*\/\s*10/);
                        const isolatedScore = scoreMatch ? scoreMatch[1] : "!";
                        
                        // Inject data into Modal components
                        document.getElementById("modal-score-num").innerText = isolatedScore;
                        document.getElementById("modal-assessment").innerHTML = data.message.replace(/\n/g, '<br>');
                        
                        // Reveal Modal view overlay
                        document.getElementById("report-modal").style.display = "flex";
                    });
                    
                    answerInput.disabled = true;

                } else {
                    alert("Error: " + data.message);
                    submitAnswerBtn.disabled = false;
                    submitAnswerBtn.innerText = "Send";
                }

            } catch (error) {
                console.error("Transmission breakdown:", error);
                alert("Interviewer disconnected from stream. Is your Flask backend running?");
                submitAnswerBtn.disabled = false;
                submitAnswerBtn.innerText = "Send";
            }
        });

        // Enter key shortcut
        answerInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitAnswerBtn.click();
            }
        });
    }

    function appendMessage(sender, text) {
        if (!transcriptContainer) return;

        const msgDiv = document.createElement("div");
        msgDiv.className = sender === "ai" ? "message ai-message" : "message user-message";
        
        msgDiv.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
        
        transcriptContainer.appendChild(msgDiv);
        transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
    }
});