document.addEventListener("DOMContentLoaded", () => {
    // UI Elements
    const answerInput = document.getElementById("user-answer");
    const submitAnswerBtn = document.getElementById("submit-answer-btn");
    const roundIndicator = document.getElementById("round-indicator");
    const transcriptContainer = document.getElementById("transcript-container");
    const muteBtn = document.getElementById("mute-btn");
    const cameraBtn = document.getElementById("camera-btn");
    const micTypeBtn = document.getElementById("mic-type-btn");
    const userFeedBox = document.querySelector(".user-feed");

    // Session State
    let currentRound = 1;
    let maxRounds = 5;
    let isMuted = false;
    let isCameraOff = false;
    let webcamStream = null;

    // =========================================
    //  WEBCAM ENGINE
    // =========================================
    async function startWebcam() {
        if (!userFeedBox) return;
        try {
            webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            userFeedBox.innerHTML = ""; 
            const videoElement = document.createElement("video");
            videoElement.srcObject = webcamStream;
            videoElement.autoplay = true;
            videoElement.playsInline = true;
            videoElement.style.width = "100%";
            videoElement.style.height = "100%";
            videoElement.style.objectFit = "cover";
            videoElement.style.borderRadius = "12px";
            videoElement.id = "live-webcam-video";
            userFeedBox.appendChild(videoElement);
        } catch (err) {
            console.error("Webcam hardware error:", err);
        }
    }
    startWebcam();

    // =========================================
    //  VOICE-TO-TEXT (STT) ENGINE
    // =========================================
    let isListening = false;
    let recognition = null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        if (micTypeBtn) micTypeBtn.style.display = "none";
    } else {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event) => {
            let finalTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (answerInput && finalTranscript) {
                // Appends spoken words to the textarea live
                answerInput.value += (answerInput.value ? " " : "") + finalTranscript;
                answerInput.scrollTop = answerInput.scrollHeight;
            }
        };

        recognition.onerror = () => stopVoiceTyping();
        recognition.onend = () => { if (isListening) recognition.start(); };
    }

    if (micTypeBtn && recognition) {
        micTypeBtn.addEventListener("click", () => {
            if (!isListening) startVoiceTyping();
            else stopVoiceTyping();
        });
    }

    function startVoiceTyping() {
        isListening = true;
        recognition.start();
        micTypeBtn.innerText = "🛑 Stop Listening";
        micTypeBtn.style.background = "#e11d48";
        if (answerInput) answerInput.placeholder = "Listening... Speak clearly!";
    }

    function stopVoiceTyping() {
        isListening = false;
        if (recognition) recognition.stop();
        micTypeBtn.innerText = "🎙️ Start Speaking";
        micTypeBtn.style.background = "rgba(255, 255, 255, 0.1)";
        if (answerInput) answerInput.placeholder = "Type your technical answer here...";
    }

    // =========================================
    //  CONTROL BAR HANDLERS
    // =========================================
    if (muteBtn) {
        muteBtn.addEventListener("click", () => {
            isMuted = !isMuted;
            muteBtn.innerText = isMuted ? "🔇 Unmute" : "🎙️ Mute";
            muteBtn.style.background = isMuted ? "#b91c1c" : "rgba(255, 255, 255, 0.1)";
        });
    }

    if (cameraBtn) {
        cameraBtn.addEventListener("click", () => {
            isCameraOff = !isCameraOff;
            const videoEl = document.getElementById("live-webcam-video");
            cameraBtn.innerText = isCameraOff ? "🎥 Camera On" : "📷 Camera Off";
            cameraBtn.style.background = isCameraOff ? "#b91c1c" : "rgba(255, 255, 255, 0.1)";
            
            if (webcamStream) {
                webcamStream.getVideoTracks().forEach(track => track.enabled = !isCameraOff);
            }
            if (videoEl) videoEl.style.opacity = isCameraOff ? "0" : "1";
        });
    }

    // =========================================
    //  CHAT SUBMISSION ENGINE
    // =========================================
    if (submitAnswerBtn) {
        submitAnswerBtn.addEventListener("click", async () => {
            const userText = answerInput.value.trim();
            if (!userText) return;

            // Stop mic if user clicks send while talking
            if (isListening) stopVoiceTyping();

            appendMessage("user", userText);
            answerInput.value = ""; 

            submitAnswerBtn.disabled = true;
            submitAnswerBtn.innerText = "Processing...";
            
            const activeUserEmail = localStorage.getItem("userEmail") || "nabhapote@gmail.com";
            
            try {
                const response = await fetch("http://127.0.0.1:5000/submit-answer", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        message: userText,
                        email: activeUserEmail,
                        topic: "Software Developer"
                    })
                });

                const data = await response.json();

                if (data.status === "success") {
                    currentRound = data.round;
                    if (roundIndicator) roundIndicator.innerText = `Question ${currentRound} of ${maxRounds}`;
                    appendMessage("ai", data.question);
                    submitAnswerBtn.disabled = false;
                    submitAnswerBtn.innerText = "Send";
                } else if (data.status === "completed") {
                    handleInterviewCompletion(data);
                }
            } catch (error) {
                console.error("Fetch error:", error);
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

        if (sender === "ai") speakInterviewerQuestion(text);
    }

    function handleInterviewCompletion(data) {
        if (roundIndicator) roundIndicator.innerText = "Interview Complete 🎉";
        appendMessage("ai", data.message);
        
        submitAnswerBtn.innerText = "View Report 📊";
        submitAnswerBtn.disabled = false;
        
        // Re-bind button to open modal
        const newBtn = submitAnswerBtn.cloneNode(true);
        submitAnswerBtn.parentNode.replaceChild(newBtn, submitAnswerBtn);
        
        newBtn.addEventListener("click", () => {
            const scoreMatch = data.message.match(/(\d+)\s*\/\s*10/);
            document.getElementById("modal-score-num").innerText = scoreMatch ? scoreMatch[1] : "!";
            document.getElementById("modal-assessment").innerHTML = data.message.replace(/\n/g, '<br>');
            document.getElementById("report-modal").style.display = "flex";
        });
        
        answerInput.disabled = true;
    }
});

// =========================================
//  TEXT-TO-SPEECH (TTS) - GLOBAL
// =========================================
function speakInterviewerQuestion(textToSpeak) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    let cleanText = textToSpeak.replace(/[\*\#\`\_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find(v => v.name.includes("Google US English")) || 
                        voices.find(v => v.lang.includes("en-"));
    
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
}

// =========================================
//  EARLY TERMINATION - GLOBAL
// =========================================
async function forceEndInterview() {
    if (!confirm("End early and evaluate performance?")) return;

    const endBtn = document.getElementById("end-interview-btn");
    if (endBtn) {
        endBtn.disabled = true;
        endBtn.innerText = "Ending...";
    }

    try {
        const activeUserEmail = localStorage.getItem("userEmail") || "nabhapote@gmail.com";
        const response = await fetch("http://127.0.0.1:5000/submit-answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                message: "I would like to end the interview now.",
                email: activeUserEmail,
                topic: "Software Developer"
            })
        });

        const data = await response.json();
        if (data.status === "completed" || data.status === "success") {
            const msgText = data.message || "Interview ended.";
            speakInterviewerQuestion(msgText);
            
            document.getElementById("modal-score-num").innerText = (msgText.match(/(\d+)\/10/) || [null, "5"])[1];
            document.getElementById("modal-assessment").innerHTML = msgText.replace(/\n/g, '<br>');
            document.getElementById("report-modal").style.display = "flex";
        } else {
            window.location.href = "dashboard.html";
        }
    } catch (error) {
        window.location.href = "dashboard.html";
    }
}