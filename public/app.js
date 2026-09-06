const analyzeBtn = document.getElementById("analyzeBtn");
const results = document.getElementById("results");
const messageInput = document.getElementById("message");

const crmBtn = document.getElementById("crmBtn");
const crmStatus = document.getElementById("crmStatus");

const refreshActivityBtn =
  document.getElementById("refreshActivityBtn");

let latestAnalysis = null;

analyzeBtn.addEventListener("click", analyzeMessage);
crmBtn.addEventListener("click", createCrmTask);
refreshActivityBtn.addEventListener("click", loadActivity);

loadActivity();

async function analyzeMessage() {
  const message = messageInput.value.trim();

  if (!message) {
    alert("Please enter a customer message.");
    return;
  }

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Analyzing...";

  results.classList.add("hidden");

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Something went wrong"
      );
    }

    latestAnalysis = data;

    displayAnalysis(data);

    await loadActivity();

  } catch (error) {
    console.error(error);

    alert(
      `Error: ${error.message}`
    );

  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "Analyze Message";
  }
}

function displayAnalysis(data) {
  document.getElementById("intent").textContent =
    data.intent;

  document.getElementById("priority").textContent =
    data.priority;

  document.getElementById("sentiment").textContent =
    data.sentiment;

  document.getElementById("leadScore").textContent =
    data.leadScore;

  document.getElementById("confidence").textContent =
    `${data.confidence}%`;

  document.getElementById("nextAction").textContent =
    data.nextAction;

  document.getElementById("reply").textContent =
    data.reply;

  displayExtractedData(
    data.extractedData || {}
  );

  crmStatus.classList.add("hidden");

  crmBtn.disabled = false;
  crmBtn.textContent = "Create CRM Task";

  results.classList.remove("hidden");

  results.scrollIntoView({
    behavior: "smooth",
  });
}

function displayExtractedData(data = {}) {
  const container =
    document.getElementById("extractedData");

  container.innerHTML = "";

  const fields = [
    ["Service", data.service || "Not provided"],
    ["Location", data.location || "Not provided"],
    ["Deadline", data.deadline || "Not provided"],
    ["Contact Request", data.contactRequest || "Not provided"],
  ];

  fields.forEach(([label, value]) => {
    const item = document.createElement("div");

    item.className = "extracted-item";

    const labelElement =
      document.createElement("span");

    labelElement.className =
      "extracted-label";

    labelElement.textContent = label;

    const valueElement =
      document.createElement("span");

    valueElement.textContent = value;

    item.appendChild(labelElement);
    item.appendChild(valueElement);

    container.appendChild(item);
  });
}

async function createCrmTask() {
  if (!latestAnalysis) {
    alert("Analyze a message first.");
    return;
  }

  crmBtn.disabled = true;
  crmBtn.textContent = "Creating Task...";

  try {
    const response = await fetch("/api/crm-task", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        intent: latestAnalysis.intent,
        priority: latestAnalysis.priority,
        leadScore: latestAnalysis.leadScore,
        nextAction: latestAnalysis.nextAction,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Failed to create CRM task"
      );
    }

    crmStatus.textContent =
      `✓ CRM task created: ${data.task.title}`;

    crmStatus.classList.remove("hidden");

    crmBtn.textContent =
      "Task Created";

    await loadActivity();

  } catch (error) {
    console.error(error);

    crmBtn.disabled = false;
    crmBtn.textContent = "Create CRM Task";

    alert(error.message);
  }
}

async function loadActivity() {
  try {
    const response = await fetch("/api/activity");

    const items = await response.json();

    const container =
      document.getElementById("activityLog");

    if (!items.length) {
      container.innerHTML =
        `<p class="empty-state">No activity yet.</p>`;

      return;
    }

    container.innerHTML = "";

    items.forEach((item) => {
      const row =
        document.createElement("div");

      row.className = "activity-item";

      const message =
        document.createElement("div");

      message.className =
        "activity-message";

      message.textContent =
        item.message;

      const time =
        document.createElement("div");

      time.className =
        "activity-time";

      time.textContent =
        new Date(
          item.timestamp
        ).toLocaleString();

      row.appendChild(message);
      row.appendChild(time);

      container.appendChild(row);
    });

  } catch (error) {
    console.error(
      "Failed to load activity:",
      error
    );
  }
}