// Simple FitSynth chat widget powered by the backend / Mistral API

const CHAT_STORAGE_KEY = "fitsynth:chatHistory";

function loadChatHistory() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveChatHistory(history) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(history.slice(-50)));
  } catch {
    // ignore
  }
}

function createChatWidget() {
  if (document.getElementById("fitsynthChatRoot")) return;

  const root = document.createElement("div");
  root.id = "fitsynthChatRoot";
  root.innerHTML = `
    <button id="fsChatToggle" class="fs-chat-toggle" aria-label="Open FitSynth coach chat">
      <i class="bx bx-message-dots"></i>
    </button>
    <div id="fsChatPanel" class="fs-chat-panel hidden" aria-label="FitSynth chat" role="dialog" aria-modal="false">
      <div class="fs-chat-header">
        <div>
          <div class="fs-chat-title">FitSynth Coach</div>
          <div class="fs-chat-subtitle">Ask questions about your plan, workouts, or diet.</div>
        </div>
        <button id="fsChatClose" class="fs-chat-close" aria-label="Close chat">
          <i class="bx bx-x"></i>
        </button>
      </div>
      <div id="fsChatMessages" class="fs-chat-messages" aria-live="polite"></div>
      <form id="fsChatForm" class="fs-chat-form">
        <input id="fsChatInput" class="fs-chat-input" type="text" autocomplete="off"
          placeholder="Ask something like “How should I warm up for leg day?”" />
        <button id="fsChatSend" class="fs-chat-send" type="submit">
          <i class="bx bx-send"></i>
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(root);

  const toggle = document.getElementById("fsChatToggle");
  const panel = document.getElementById("fsChatPanel");
  const closeBtn = document.getElementById("fsChatClose");
  const form = document.getElementById("fsChatForm");
  const input = document.getElementById("fsChatInput");
  const messagesEl = document.getElementById("fsChatMessages");

  function setOpen(open) {
    if (open) {
      panel.classList.remove("hidden");
      panel.classList.add("open");
      input.focus();
    } else {
      panel.classList.remove("open");
      panel.classList.add("hidden");
    }
  }

  toggle.addEventListener("click", () => {
    const isHidden = panel.classList.contains("hidden");
    setOpen(isHidden);
  });
  closeBtn.addEventListener("click", () => setOpen(false));

  const history = loadChatHistory();

  function renderMessage(msg) {
    const wrap = document.createElement("div");
    wrap.className = "fs-chat-message " + (msg.role === "user" ? "fs-chat-user" : "fs-chat-bot");
    wrap.innerHTML = `
      <div class="fs-chat-avatar">
        <i class="bx ${msg.role === "user" ? "bx-user" : "bx-dumbbell"}"></i>
      </div>
      <div class="fs-chat-bubble">${msg.text}</div>
    `;
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // initial system message
  if (!history.length) {
    const welcome = {
      role: "bot",
      text: "Hi! I’m your FitSynth coach. Ask me about your routine, how to adjust your plan, or diet ideas.",
      ts: Date.now(),
    };
    history.push(welcome);
    saveChatHistory(history);
  }

  history.forEach(renderMessage);

  let sending = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sending) return;
    const value = input.value.trim();
    if (!value) return;

    const userMsg = { role: "user", text: value, ts: Date.now() };
    history.push(userMsg);
    renderMessage(userMsg);
    saveChatHistory(history);

    input.value = "";
    input.focus();

    sending = true;
    const typingEl = document.createElement("div");
    typingEl.className = "fs-chat-message fs-chat-bot";
    typingEl.innerHTML = `
      <div class="fs-chat-avatar">
        <i class="bx bx-dumbbell"></i>
      </div>
      <div class="fs-chat-bubble fs-chat-typing">
        <span></span><span></span><span></span>
      </div>
    `;
    messagesEl.appendChild(typingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value, includePlanContext: true }),
      });
      const data = await res.json();
      typingEl.remove();

      if (!res.ok || !data || !data.reply) {
        const errMsg = {
          role: "bot",
          text: "I couldn’t reach the coach service just now. Please try again in a moment.",
          ts: Date.now(),
        };
        history.push(errMsg);
        renderMessage(errMsg);
        saveChatHistory(history);
      } else {
        const botMsg = { role: "bot", text: data.reply, ts: Date.now() };
        history.push(botMsg);
        renderMessage(botMsg);
        saveChatHistory(history);
      }
    } catch (err) {
      console.warn("Chat error", err);
      typingEl.remove();
      const errMsg = {
        role: "bot",
        text: "I had trouble connecting. Check your connection and try again.",
        ts: Date.now(),
      };
      history.push(errMsg);
      renderMessage(errMsg);
      saveChatHistory(history);
    } finally {
      sending = false;
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  try {
    createChatWidget();
  } catch (e) {
    console.warn("Chat widget error", e);
  }
});


