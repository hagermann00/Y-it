const STORAGE_KEY = "yit-workflow";
const DEFAULT_PROMPTS = [
  {
    id: "customer-handoff",
    category: "Support",
    title: "Customer escalation triage",
    description: "Collect context from email, gather CRM notes, and prepare a copilot handoff message.",
    prompt: `You are helping with a customer escalation. Summarise the email thread, note the latest customer sentiment, and
list the last three CRM interactions. Prepare a suggested response that acknowledges each concern and proposes the next
step.`,
    app: "Shared inbox + CRM",
  },
  {
    id: "design-qa",
    category: "Product",
    title: "Design QA review",
    description: "Walk through new designs, capture bugs, and suggest fixes while hopping across tabs.",
    prompt: `Open the new Figma file and review the linked Jira or Linear ticket. List any visual or UX issues you notice. For
serious issues include a screenshot URL, the impacted component, and a suggested fix. Mention which stakeholders need a
follow-up.`,
    app: "Figma + Linear",
  },
  {
    id: "campaign-launch",
    category: "Marketing",
    title: "Campaign launch double-check",
    description: "Verify assets, URLs, and analytics configuration before publishing.",
    prompt: `Open the launch checklist doc. Confirm creative assets are final, URLs resolve, UTMs match the campaign sheet, and
analytics dashboards are ready. Capture anything missing plus the exact tab or tool to fix it.`,
    app: "Notion + Ads manager",
  },
  {
    id: "sales-followup",
    category: "Sales",
    title: "Sales follow-up prep",
    description: "Combine meeting notes, CRM signals, and AI guidance for a tight reply.",
    prompt: `Review the meeting recording summary, highlight the top three buyer priorities, and list any open questions. Draft
an email that references those points and suggests a clear next step with a deadline.`,
    app: "CRM + Email",
  },
];

const statusLabels = {
  pending: "Pending",
  active: "In progress",
  done: "Done",
};

let workflow = loadWorkflow();
let activeRunStep = workflow.activeRunStep ?? null;

// ------- Event wiring -------
document.getElementById("addBlankStep").addEventListener("click", () => {
  addStep(createEmptyStep());
});

document.getElementById("clearWorkspace").addEventListener("click", () => {
  if (confirm("Clear all steps and restart?")) {
    workflow = { steps: [], activeRunStep: null };
    activeRunStep = null;
    persist();
    renderAll();
  }
});

document.getElementById("exportWorkflow").addEventListener("click", () => {
  const summary = createPlanSummary();
  navigator.clipboard
    .writeText(summary)
    .then(() => notify("Plan copied to your clipboard."))
    .catch(() => notify("Copy failed. Please select and copy manually."));
});

// ------- Prompt library -------
const promptLibrary = document.getElementById("promptLibrary");

function renderPromptLibrary() {
  promptLibrary.innerHTML = "";
  DEFAULT_PROMPTS.forEach((prompt) => {
    const card = document.createElement("article");
    card.className = "prompt-card";
    card.setAttribute("role", "listitem");
    card.innerHTML = `
      <span class="prompt-card__category">${prompt.category}</span>
      <span class="prompt-card__title">${prompt.title}</span>
      <p class="prompt-card__meta">${prompt.description}</p>
      <p class="prompt-card__meta"><strong>Suggested tabs:</strong> ${prompt.app}</p>
    `;
    card.addEventListener("click", () => {
      const newStep = createEmptyStep();
      newStep.title = prompt.title;
      newStep.app = prompt.app;
      newStep.prompt = prompt.prompt;
      addStep(newStep);
      notify(`Added “${prompt.title}” to your plan.`);
    });
    promptLibrary.appendChild(card);
  });
}

// ------- Workflow rendering -------
const stepList = document.getElementById("stepList");
const stepTemplate = document.getElementById("stepTemplate");

function renderSteps() {
  stepList.innerHTML = "";

  if (workflow.steps.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No steps yet. Add one above or pick a preset from the library.";
    stepList.appendChild(empty);
    document.getElementById("progressSummary").textContent = "";
    renderRunMode();
    return;
  }

  workflow.steps.forEach((step, index) => {
    const element = stepTemplate.content.firstElementChild.cloneNode(true);
    element.dataset.id = step.id;
    element.querySelector(".step__number").textContent = `Step ${index + 1}`;

    const titleInput = element.querySelector(".step__title");
    titleInput.value = step.title;
    titleInput.addEventListener("input", (event) => updateStep(step.id, { title: event.target.value }));

    const appInput = element.querySelector(".step__app");
    appInput.value = step.app;
    appInput.addEventListener("input", (event) => updateStep(step.id, { app: event.target.value }));

    const promptArea = element.querySelector(".step__prompt");
    promptArea.value = step.prompt;
    promptArea.addEventListener("input", (event) => updateStep(step.id, { prompt: event.target.value }));

    const copyButton = element.querySelector(".step__copy");
    copyButton.addEventListener("click", () => copyPrompt(step));

    const notesArea = element.querySelector(".step__notes");
    notesArea.value = step.notes;
    notesArea.addEventListener("input", (event) => updateStep(step.id, { notes: event.target.value }));

    const statusInputs = element.querySelectorAll("input[name='status']");
    statusInputs.forEach((input) => {
      const inputName = `status-${step.id}`;
      input.name = inputName;
      if (input.value === step.status) {
        input.checked = true;
      }
      input.addEventListener("change", (event) => {
        updateStep(step.id, { status: event.target.value });
        if (event.target.value === "active") {
          activeRunStep = step.id;
        }
        renderRunMode();
      });
    });

    element
      .querySelector("[data-action='delete']")
      .addEventListener("click", () => removeStep(step.id));

    stepList.appendChild(element);
  });

  updateProgressSummary();
  renderRunMode();
}

function updateProgressSummary() {
  const counts = workflow.steps.reduce(
    (acc, step) => {
      acc[step.status] += 1;
      return acc;
    },
    { pending: 0, active: 0, done: 0 }
  );

  const total = workflow.steps.length;
  const summary = `${counts.done}/${total} done · ${counts.active} in progress · ${counts.pending} waiting`;
  document.getElementById("progressSummary").textContent = summary;
}

// ------- Run mode -------
const runStepList = document.getElementById("runStepList");
const runDetail = document.getElementById("runDetail");

function renderRunMode() {
  runStepList.innerHTML = "";

  if (workflow.steps.length === 0) {
    runDetail.innerHTML = '<p class="run-detail__placeholder">Add steps to see run details.</p>';
    return;
  }

  workflow.steps.forEach((step) => {
    const item = document.createElement("li");
    item.className = "run-step";
    if (step.id === activeRunStep) {
      item.classList.add("is-active");
    }
    item.innerHTML = `
      <span class="run-step__title">${step.title || "Untitled step"}</span>
      <span class="run-step__meta">${statusLabels[step.status]} • ${step.app || "Tab not assigned"}</span>
    `;
    item.addEventListener("click", () => {
      activeRunStep = step.id;
      renderRunMode();
    });
    runStepList.appendChild(item);
  });

  const current = workflow.steps.find((step) => step.id === activeRunStep) ?? workflow.steps[0];
  if (current) {
    activeRunStep = current.id;
    runDetail.innerHTML = `
      <header>
        <h3 class="run-detail__title">${current.title || "Untitled step"}</h3>
        <span class="run-detail__status">${statusLabels[current.status]}</span>
      </header>
      <div class="run-detail__section">
        <h3>Use this tab</h3>
        <p>${current.app || "Add the tool you need to open."}</p>
      </div>
      <div class="run-detail__section">
        <h3>Prompt</h3>
        <pre>${current.prompt || "Add or paste the instructions you want to reuse."}</pre>
        <button class="button button--secondary" data-action="copy-run-prompt">Copy prompt</button>
      </div>
      <div class="run-detail__section">
        <h3>Notes</h3>
        <p>${current.notes ? current.notes.replace(/\n/g, "<br>") : "Add reminders for yourself or the next teammate."}</p>
      </div>
      <div class="run-detail__actions">
        <button class="button button--ghost" data-action="mark-active">Mark in progress</button>
        <button class="button button--primary" data-action="mark-done">Mark done</button>
      </div>
    `;
    runDetail.querySelector("[data-action='copy-run-prompt']").addEventListener("click", () => copyPrompt(current));
    runDetail.querySelector("[data-action='mark-active']").addEventListener("click", () => {
      updateStep(current.id, { status: "active" });
      activeRunStep = current.id;
      renderRunMode();
      renderSteps();
    });
    runDetail.querySelector("[data-action='mark-done']").addEventListener("click", () => {
      updateStep(current.id, { status: "done" });
      renderRunMode();
      renderSteps();
    });
  }

  persist();
}

// ------- Helpers -------
function renderAll() {
  renderSteps();
  renderRunMode();
}

function addStep(step) {
  workflow.steps.push(step);
  persist();
  renderSteps();
}

function createEmptyStep() {
  return {
    id: createId(),
    title: "",
    app: "",
    prompt: "",
    notes: "",
    status: "pending",
  };
}

function createId() {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  return `step-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function updateStep(id, data) {
  const step = workflow.steps.find((item) => item.id === id);
  if (!step) return;
  Object.assign(step, data);
  persist();
  updateProgressSummary();
  renderRunMode();
}

function removeStep(id) {
  const index = workflow.steps.findIndex((item) => item.id === id);
  if (index === -1) return;
  workflow.steps.splice(index, 1);
  if (activeRunStep === id) {
    activeRunStep = workflow.steps[index]?.id ?? workflow.steps[index - 1]?.id ?? null;
  }
  persist();
  renderSteps();
}

function copyPrompt(step) {
  if (!step.prompt) {
    notify("No prompt to copy yet. Add text first.");
    return;
  }

  navigator.clipboard
    .writeText(step.prompt)
    .then(() => notify("Prompt copied."))
    .catch(() => notify("Copy failed. Select the text and copy manually."));
}

function createPlanSummary() {
  if (workflow.steps.length === 0) {
    return "Workflow is empty. Add steps first.";
  }
  const lines = workflow.steps.map((step, index) => {
    return [
      `Step ${index + 1}: ${step.title || "(untitled)"}`,
      `  Tab: ${step.app || "(not set)"}`,
      `  Status: ${statusLabels[step.status]}`,
      `  Prompt: ${step.prompt ? step.prompt.replace(/\n/g, " ") : "(none)"}`,
      `  Notes: ${step.notes ? step.notes.replace(/\n/g, " ") : "(none)"}`,
    ].join("\n");
  });
  return lines.join("\n\n");
}

function notify(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function persist() {
  workflow.activeRunStep = activeRunStep;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workflow));
}

function loadWorkflow() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { steps: [], activeRunStep: null };
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed.steps)) {
      return { steps: [], activeRunStep: null };
    }
    return { steps: parsed.steps, activeRunStep: parsed.activeRunStep ?? null };
  } catch (error) {
    console.error("Failed to load workflow", error);
    return { steps: [], activeRunStep: null };
  }
}

// Toast styles injected once so we do not repeat CSS in HTML
(function injectToastStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .toast {
      position: fixed;
      left: 50%;
      bottom: 2rem;
      transform: translate(-50%, 120%);
      background: var(--text);
      color: var(--bg);
      padding: 0.8rem 1.4rem;
      border-radius: 999px;
      box-shadow: var(--shadow);
      opacity: 0;
      transition: transform 0.2s ease, opacity 0.2s ease;
      z-index: 50;
      font-weight: 600;
    }
    .toast.is-visible {
      transform: translate(-50%, 0);
      opacity: 1;
    }
  `;
  document.head.appendChild(style);
})();

renderPromptLibrary();
renderAll();
