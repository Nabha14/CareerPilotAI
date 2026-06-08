document.addEventListener("DOMContentLoaded", () => {
    const answerInput = document.getElementById("user-answer");
    const submitAnswerBtn = document.getElementById("submit-answer-btn");
    const roundIndicator = document.getElementById("round-indicator");
    const transcriptContainer = document.getElementById("transcript-container");
    const muteBtn = document.getElementById("mute-btn");
    const cameraBtn = document.getElementById("camera-btn");
    const userFeedBox = document.querySelector(".user-feed");

    let currentRound = 1;
    let maxRounds = 5;
    let isMuted = false;
    let isCameraOff = false;
    let webcamStream = null;

    // =========================================
    // 🎥 ACTIVE WEBCAM HARDWARE STREAM
    // =========================================
    async function startWebcam() {
        if (!userFeedBox) return;

        try {
            // Request video stream from browser hardware directly
            webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            
            // Wipe out everything inside the grey box completely (deletes that dead icon!)
            userFeedBox.innerHTML = ""; 
            
            // Build the video element dynamically
            const videoElement = document.createElement("video");
            videoElement.srcObject = webcamStream;
            videoElement.autoplay = true;
            videoElement.playsInline = true;
            
            // Frame styling rules to fill your layout box perfectly
            videoElement.style.width = "100%";
            videoElement.style.height = "100%";
            videoElement.style.objectFit = "cover";
            videoElement.style.borderRadius = "12px";
            videoElement.id = "live-webcam-video";
            
            userFeedBox.appendChild(videoElement);
            console.log("✅ Webcam feed successfully rendered on screen.");
        } catch (err) {
            console.error("Webcam hardware execution error:", err);
        }
    }

    // Launch camera stream immediately on page mount
    startWebcam();

    // =========================================
    // 🎙️🎙️ CONTROL BAR HARDWARE TOGGLES
    // =========================================
    if (muteBtn) {
        muteBtn.addEventListener("click", () => {
            isMuted = !isMuted;
            if (isMuted) {
                muteBtn.innerText = "🔇 Unmute";
                muteBtn.style.background = "#b91c1c";
            } else {
                muteBtn.innerText = "🎙️ Mute";
                muteBtn.style.background = "rgba(255, 255, 255, 0.1)";
            }
        });
    }

    if (cameraBtn) {
        cameraBtn.addEventListener("click", () => {
            isCameraOff = !isCameraOff;
            const videoEl = document.getElementById("live-webcam-video");
            
            if (isCameraOff) {
                cameraBtn.innerText = "🎥 Camera On";
                cameraBtn.style.background = "#b91c1c";
                
                // Stop the active camera video tracks cleanly
                if (webcamStream) {
                    webcamStream.getVideoTracks().forEach(track => track.enabled = false);
                }
                if (videoEl) videoEl.style.opacity = "0"; 
            } else {
                cameraBtn.innerText = "📷 Camera Off";
                cameraBtn.style.background = "rgba(255, 255, 255, 0.1)";
                
                // Re-enable tracking
                if (webcamStream) {
                    webcamStream.getVideoTracks().forEach(track => track.enabled = true);
                }
                if (videoEl) videoEl.style.opacity = "1";
            }
        });
    }

    // =========================================
    // 🛑 FORCE END INTERVIEW EARLY HANDLER
    // =========================================
    const endInterviewBtn = document.getElementById("end-interview-btn");
    if (endInterviewBtn) {
        endInterviewBtn.addEventListener("click", async () => {
            if (!confirm("Are you sure you want to end the interview early? Your performance so far will be evaluated.")) {
                return; 
            }

            endInterviewBtn.disabled = true;
            endInterviewBtn.innerText = "Ending...";

            try {
                const activeUserEmail = localStorage.getItem("userEmail") || "nabhapote@gmail.com";
                
                const response = await fetch("http://127.0.0.1:5000/submit-answer", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        message: "I would like to end the interview now and see my evaluation.",
                        email: activeUserEmail,
                        topic: "Software Developer"
                    })
                });

                const data = await response.json();

                if (data.status === "completed" || data.status === "success") {
                    if (roundIndicator) roundIndicator.innerText = "Interview Complete 🎉";
                    
                    const msgText = data.message || data.question || "Interview ended early.";
                    
                    // 🌟 SPEAK OUT LOUD THE FINAL ASSESSMENT SUMMARY OVER THE AUDIO PIPELINE
                    speakInterviewerQuestion(msgText);

                    const scoreMatch = msgText.match(/(\d+)\s*\/\s*10/);
                    const isolatedScore = scoreMatch ? scoreMatch[1] : "5";

                    document.getElementById("modal-score-num").innerText = isolatedScore;
                    document.getElementById("modal-assessment").innerHTML = msgText.replace(/\n/g, '<br>');
                    
                    alert("📊 Performance report successfully saved to your CareerPilot account!");
                    
                    document.getElementById("report-modal").style.display = "flex";

                    const startNewSessionBtn = document.querySelector(".modal-action-btn") || document.getElementById("start-new-session-btn");
                    if (startNewSessionBtn) {
                        startNewSessionBtn.innerText = "Go to Dashboard 📊";
                        startNewSessionBtn.onclick = () => {
                            window.location.href = "dashboard.html";
                        };
                    }

                    const closeModalBtn = document.querySelector(".close-modal-btn");
                    if (closeModalBtn) {
                        closeModalBtn.onclick = () => {
                            window.location.href = "dashboard.html";
                        };
                    }

                } else {
                    window.location.href = "dashboard.html";
                }
            } catch (error) {
                console.error("Failed to end session cleanly:", error);
                window.location.href = "dashboard.html";
            }
        });
    }

    // =========================================
    // 💬 CHAT STREAM ENGINE & LOOP CONTEXT
    // =========================================
    if (submitAnswerBtn) {
        submitAnswerBtn.addEventListener("click", async () => {
            const userText = answerInput.value.trim();
            if (!userText) return;

            appendMessage("user", userText);
            answerInput.value = ""; 

            submitAnswerBtn.disabled = true;
            submitAnswerBtn.innerText = "Processing...";
            
            const activeUserEmail = localStorage.getItem("userEmail") || "nabhapote@gmail.com";
            
            try {
                let response = await fetch("http://127.0.0.1:5000/submit-answer", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        message: userText,
                        email: activeUserEmail,
                        topic: "Software Developer"
                    })
                });

                let data = await response.json();

                if (response.status === 400 && data.message && data.message.includes("No active interview session")) {
                    console.log("🔄 Session missing. Initializing handshake...");
                    
                    const startRes = await fetch("http://127.0.0.1:5000/start-interview", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ topic: "Software Developer" })
                    });
                    
                    if (startRes.ok) {
                        response = await fetch("http://127.0.0.1:5000/submit-answer", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ 
                                message: userText,
                                email: activeUserEmail,
                                topic: "Software Developer"
                            })
                        });
                        data = await response.json();
                    }
                }

                if (data.status === "success") {
                    currentRound = data.round;
                    if (roundIndicator) {
                        roundIndicator.innerText = `Question ${currentRound} of ${maxRounds}`;
                    }
                    appendMessage("ai", data.question);
                    
                    submitAnswerBtn.disabled = false;
                    submitAnswerBtn.innerText = "Send";

                } else if (data.status === "completed") {
                    if (roundIndicator) roundIndicator.innerText = "Interview Complete 🎉";
                    appendMessage("ai", data.message);
                    
                    submitAnswerBtn.innerText = "View Report 📊";
                    submitAnswerBtn.disabled = false;
                    
                    const newBtn = submitAnswerBtn.cloneNode(true);
                    submitAnswerBtn.parentNode.replaceChild(newBtn, submitAnswerBtn);
                    
                    newBtn.addEventListener("click", () => {
                        const scoreMatch = data.message.match(/(\d+)\s*\/\s*10/);
                        const isolatedScore = scoreMatch ? scoreMatch[1] : "!";
                        
                        document.getElementById("modal-score-num").innerText = isolatedScore;
                        document.getElementById("modal-assessment").innerHTML = data.message.replace(/\n/g, '<br>');
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

        // 🌟 DYNAMIC TRIGGER ENGINE: Instantly read AI questions out loud as they drop into the layout transcript container!
        if (sender === "ai") {
            speakInterviewerQuestion(text);
        }
    }
});

// =========================================
// 🛑 GLOBAL FORCE END INTERVIEW EXECUTION
// =========================================
async function forceEndInterview() {
    if (!confirm("Are you sure you want to end the interview early? Your performance so far will be evaluated.")) {
        return; 
    }

    const endBtn = document.getElementById("end-interview-btn");
    if (endBtn) {
        endBtn.disabled = true;
        endBtn.innerText = "Ending...";
    }

    try {
        const activeUserEmail = localStorage.getItem("userEmail") || "nabhapote@gmail.com";
        console.log("💾 Sending final save state request for:", activeUserEmail);

        const response = await fetch("http://127.0.0.1:5000/submit-answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                message: "I would like to end the interview now and see my evaluation.",
                email: activeUserEmail,
                topic: "Software Developer"
            })
        });

        const data = await response.json();
        console.log("📥 Backend response received:", data);

        if (data.status === "completed" || data.status === "success") {
            const msgText = data.message || data.question || "Interview ended early.";
            
            // 🌟 READ EVALUATION SUMMARY LOGIC AT TERMINATION
            speakInterviewerQuestion(msgText);

            const scoreMatch = msgText.match(/(\d+)\s*\/\s*10/);
            const isolatedScore = scoreMatch ? scoreMatch[1] : "5";

            const modalScore = document.getElementById("modal-score-num");
            const modalAssess = document.getElementById("modal-assessment");
            const reportModal = document.getElementById("report-modal");

            if (modalScore) modalScore.innerText = isolatedScore;
            if (modalAssess) modalAssess.innerHTML = msgText.replace(/\n/g, '<br>');
            
            alert("📊 Performance report successfully saved to your CareerPilot account database!");
            
            if (reportModal) {
                reportModal.style.display = "flex";

                const startNewSessionBtn = document.querySelector(".modal-action-btn");
                if (startNewSessionBtn) {
                    startNewSessionBtn.innerText = "Go to Dashboard 📊";
                    startNewSessionBtn.onclick = () => { window.location.href = "dashboard.html"; };
                }
            } else {
                window.location.href = "dashboard.html";
            }
        } else {
            window.location.href = "dashboard.html";
        }
    } catch (error) {
        console.error("❌ Failed to end session cleanly:", error);
        window.location.href = "dashboard.html";
    }
}

// =========================================
// 🔊 LOCKED-IN TEXT-TO-SPEECH (TTS) ENGINE
// =========================================
function speakInterviewerQuestion(textToSpeak) {
    if (!('speechSynthesis' in window)) {
        console.warn("⚠️ Text-to-speech features are not supported on this browser.");
        return;
    }

    // Stop any overlapping audio queues immediately
    window.speechSynthesis.cancel();

    let cleanText = textToSpeak.replace(/[\*\#\`\_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);

    const assignVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        
        // 🌟 LOCKED VOICE LOOKUP ENGINE:
        // Try to find natural Google/Microsoft premium English voices first
        let selectedVoice = voices.find(voice => voice.name.includes("Google US English")) ||
                            voices.find(voice => voice.name.includes("Microsoft David")) ||
                            voices.find(voice => voice.lang === "en-US") ||
                            voices.find(voice => voice.lang === "en-GB") ||
                            voices.find(voice => voice.lang.includes("en-"));

        // Lock it to the chosen voice profile permanently
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.rate = 1.0;  // Standard professional conversational speed
        utterance.pitch = 1.0; // Professional vocal pitch tone

        window.speechSynthesis.speak(utterance);
    };

    // If voices are fully loaded in memory, fire it up
    if (window.speechSynthesis.getVoices().length > 0) {
        assignVoiceAndSpeak();
    } else {
        // If the list is still loading asynchronously, bind it to wait until it is ready
        window.speechSynthesis.onvoiceschanged = assignVoiceAndSpeak;
    }
}