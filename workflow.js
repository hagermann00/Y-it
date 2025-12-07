const STORAGE_KEY = 'yit-workflow-v2';

const promptStarters = [
  {
    id: 'support-triage',
    title: 'Customer support triage',
    description: 'Quickly understand the issue, gather context, and route to the right team.',
    suggestion: 'Support inbox',
    prompt: `You are handling a fresh customer ticket. Complete the following before handing it off:\n\n1. Summarise the customer\'s problem in two bullet points.\n2. List any account links, plan details, or recent changes mentioned in the ticket.\n3. Suggest the best internal team to own the follow-up and why.\n4. Draft a short acknowledgement reply for the customer.`
  },
  {
    id: 'handoff',
    title: 'Design to engineering hand-off',
    description: 'Confirm assets, note tricky interactions, and set expectations for the next build.',
    suggestion: 'Project board',
    prompt: `You are preparing an engineering hand-off for a design. Capture: \n\n- Link to the approved file and version.\n- Components or behaviours that need extra attention.\n- Outstanding questions the team must answer.\n- Definition of done in plain language.`
  },
  {
    id: 'campaign',
    title: 'Launch marketing campaign',
    description: 'Outline the essential checks before pushing a new campaign live.',
    suggestion: 'Ads manager',
    prompt: `Before activating the campaign, confirm the following:\n\n• Targeting, budget, and duration match the brief.\n• Creative assets link to the correct landing page.\n• Tracking pixels or UTM parameters are applied.\n• Stakeholders who need to approve the launch are tagged.`
  },
  {
    id: 'sales-demo',
    title: 'Prep a tailored sales demo',
    description: 'Collect intel and draft a tight plan for the meeting.',
    suggestion: 'CRM tab',
    prompt: `Build a fast prep sheet for the upcoming demo:\n\n1. Note the prospect\'s goal, blockers, and any prior products tried.\n2. Pick three features that prove we solve the blocker.\n3. Draft three discovery questions to confirm fit.\n4. Outline the closing action you want from the meeting.`
  },
  {
    id: 'handover',
    title: 'Shift handover summary',
    description: 'Log what happened, what is pending, and what to watch next.',
    suggestion: 'Team chat',
    prompt: `Wrap up the shift with a quick summary:\n\n- Major events resolved (with ticket or case IDs).\n- Items still open, with owners and deadlines.\n- Risks or watch-outs for the next person on shift.\n- Where the full notes live (docs, dashboards, folders).`
  },
  {
    id: 'gemini-brief',
    title: 'Draft a Gemini-ready brief',
    description: 'Shape messy notes into a clear ask for Gemini before you paste it over.',
    suggestion: 'Gemini tab',
    prompt: `You are preparing a request for Gemini using the notes below. Clean them up into a crisp prompt that:\n\n- Names the goal and the audience.\n- Lists the facts Gemini should rely on.\n- Calls out what to avoid or any constraints.\n- Ends with the exact format you want back.\n\nNotes to organise:`
  }
];

const state = {
  workflow: loadWorkflow(),
  currentStepIndex: 0
};

const elements = {};

document.addEventListener('DOMContentLoaded', init);

function init() {
  cacheElements();
  wireEvents();
  renderPrompts();
  hydrateInputs();
  renderSteps();
  renderExecution();
}

function cacheElements() {
  elements.workflowNameInput = document.getElementById('workflowNameInput');
  elements.promptList = document.getElementById('promptList');
  elements.stepsContainer = document.getElementById('stepsContainer');
  elements.executionCurrent = document.getElementById('executionCurrent');
  elements.executionList = document.getElementById('executionList');
  elements.prevStepButton = document.getElementById('prevStepButton');
  elements.nextStepButton = document.getElementById('nextStepButton');
  elements.markDoneButton = document.getElementById('markDoneButton');
  elements.copyCurrentButton = document.getElementById('copyCurrentButton');
  elements.newWorkflowButton = document.getElementById('newWorkflowButton');
  elements.addStepButton = document.getElementById('addStepButton');
  elements.clearStepsButton = document.getElementById('clearStepsButton');
  elements.resetStatusButton = document.getElementById('resetStatusButton');
}

function wireEvents() {
  elements.workflowNameInput.addEventListener('input', event => {
    state.workflow.name = event.target.value;
    saveWorkflow();
  });

  elements.newWorkflowButton.addEventListener('click', () => {
    const shouldReset = confirm('Start a brand new workflow? This clears the current name, steps, and progress.');
    if (!shouldReset) return;
    state.workflow = createBlankWorkflow();
    state.currentStepIndex = 0;
    hydrateInputs();
    renderSteps();
    renderExecution();
    saveWorkflow();
  });

  elements.addStepButton.addEventListener('click', () => {
    addStep();
  });

  elements.clearStepsButton.addEventListener('click', () => {
    if (state.workflow.steps.length === 0) return;
    const confirmed = confirm('Remove all steps from this workflow?');
    if (!confirmed) return;
    state.workflow.steps = [];
    state.currentStepIndex = 0;
    renderSteps();
    renderExecution();
    saveWorkflow();
  });

  elements.resetStatusButton.addEventListener('click', () => {
    if (state.workflow.steps.length === 0) return;
    state.workflow.steps = state.workflow.steps.map(step => ({
      ...step,
      status: 'pending'
    }));
    state.currentStepIndex = 0;
    renderSteps();
    renderExecution();
    saveWorkflow();
  });

  elements.prevStepButton.addEventListener('click', () => {
    moveToStep(state.currentStepIndex - 1);
  });

  elements.nextStepButton.addEventListener('click', () => {
    moveToStep(state.currentStepIndex + 1);
  });

  elements.markDoneButton.addEventListener('click', () => {
    toggleCurrentStepDone();
  });

  elements.copyCurrentButton.addEventListener('click', () => {
    copyCurrentInstructions();
  });
}

function hydrateInputs() {
  elements.workflowNameInput.value = state.workflow.name || '';
}

function renderPrompts() {
  if (!elements.promptList) return;
  elements.promptList.innerHTML = '';

  promptStarters.forEach(prompt => {
    const card = document.createElement('article');
    card.className = 'prompt-card';

    const title = document.createElement('h3');
    title.className = 'prompt-card__title';
    title.textContent = prompt.title;

    const body = document.createElement('p');
    body.className = 'prompt-card__body';
    body.textContent = prompt.description;

    const promptText = document.createElement('pre');
    promptText.className = 'prompt-card__prompt';
    promptText.textContent = prompt.prompt;

    const footer = document.createElement('div');
    footer.className = 'header-actions';

    const suggestion = document.createElement('span');
    suggestion.className = 'badge';
    suggestion.textContent = `Suggested tab: ${prompt.suggestion}`;

    const addButton = document.createElement('button');
    addButton.className = 'button button--primary';
    addButton.textContent = 'Use this prompt';
    addButton.addEventListener('click', () => {
      addStep({
        title: prompt.title,
        tab: prompt.suggestion,
        instructions: prompt.prompt
      });
      flashButton(addButton, 'Added!');
    });

    footer.append(suggestion, addButton);
    card.append(title, body, promptText, footer);
    elements.promptList.appendChild(card);
  });
}

function renderSteps() {
  const { steps } = state.workflow;
  const container = elements.stepsContainer;
  container.innerHTML = '';

  if (!steps.length) {
    const empty = document.createElement('p');
    empty.className = 'helper-text';
    empty.textContent = 'No steps yet. Add a blank step or pick a prompt from above to get started.';
    container.appendChild(empty);
  } else {
    steps.forEach((step, index) => {
      container.appendChild(createStepCard(step, index));
    });
  }

  elements.clearStepsButton.disabled = steps.length === 0;
  elements.resetStatusButton.disabled = steps.length === 0;
}

function createStepCard(step, index) {
  const card = document.createElement('article');
  card.className = 'step-card';

  const top = document.createElement('div');
  top.className = 'step-card__top';

  const title = document.createElement('h3');
  title.className = 'step-card__title';
  title.textContent = `Step ${index + 1}`;

  const status = document.createElement('span');
  status.className = 'step-card__status';
  status.textContent = step.status === 'done' ? 'Complete' : 'Waiting';

  top.append(title, status);

  const fields = document.createElement('div');
  fields.className = 'step-card__fields';

  const titleField = buildLabeledInput('What happens?', step.title, value => {
    updateStep(index, 'title', value);
  });

  const tabField = buildLabeledInput('Which tab or tool?', step.tab, value => {
    updateStep(index, 'tab', value);
  });

  const notesField = buildLabeledTextarea('Instructions or prompt', step.instructions, value => {
    updateStep(index, 'instructions', value);
  });

  const actions = document.createElement('div');
  actions.className = 'step-card__actions';

  const toggleButton = document.createElement('button');
  toggleButton.className = 'button';
  toggleButton.textContent = step.status === 'done' ? 'Mark as pending' : 'Mark as done';
  toggleButton.addEventListener('click', () => {
    toggleStepStatus(index);
  });

  const removeButton = document.createElement('button');
  removeButton.className = 'button';
  removeButton.textContent = 'Remove';
  removeButton.addEventListener('click', () => {
    removeStep(index);
  });

  actions.append(toggleButton, removeButton);

  card.append(top, fields, actions);
  fields.append(titleField, tabField, notesField);

  return card;
}

function buildLabeledInput(labelText, value, onInput) {
  const wrapper = document.createElement('label');
  wrapper.className = 'field';

  const label = document.createElement('span');
  label.className = 'field__label';
  label.textContent = labelText;

  const input = document.createElement('input');
  input.type = 'text';
  input.value = value || '';
  input.addEventListener('input', event => onInput(event.target.value));

  wrapper.append(label, input);
  return wrapper;
}

function buildLabeledTextarea(labelText, value, onInput) {
  const wrapper = document.createElement('label');
  wrapper.className = 'field';

  const label = document.createElement('span');
  label.className = 'field__label';
  label.textContent = labelText;

  const textarea = document.createElement('textarea');
  textarea.value = value || '';
  textarea.addEventListener('input', event => onInput(event.target.value));

  wrapper.append(label, textarea);
  return wrapper;
}

function renderExecution() {
  const { steps } = state.workflow;
  const { executionCurrent, executionList, prevStepButton, nextStepButton, markDoneButton, copyCurrentButton } = elements;

  executionList.innerHTML = '';

  if (!steps.length) {
    executionCurrent.innerHTML = '<p class="helper-text">Add a step to unlock the guided checklist.</p>';
    prevStepButton.disabled = true;
    nextStepButton.disabled = true;
    markDoneButton.disabled = true;
    copyCurrentButton.disabled = true;
    return;
  }

  const safeIndex = Math.min(Math.max(state.currentStepIndex, 0), steps.length - 1);
  state.currentStepIndex = safeIndex;
  const step = steps[safeIndex];

  const title = document.createElement('h3');
  title.className = 'execution__title';
  title.textContent = step.title || `Step ${safeIndex + 1}`;

  const meta = document.createElement('div');
  meta.className = 'execution__meta';
  meta.innerHTML = `<span class="badge">Tab: ${step.tab || 'Decide on the fly'}</span>`;

  const instructions = document.createElement('p');
  instructions.className = 'execution__instructions';
  instructions.textContent = step.instructions || 'Write clear instructions above to make this easier next time.';

  executionCurrent.innerHTML = '';
  executionCurrent.append(title, meta, instructions);

  prevStepButton.disabled = safeIndex === 0;
  nextStepButton.disabled = safeIndex >= steps.length - 1;
  markDoneButton.disabled = false;
  markDoneButton.textContent = step.status === 'done' ? 'Mark as pending' : 'Mark complete';
  copyCurrentButton.disabled = !step.instructions && !step.title && !step.tab;

  steps.forEach((item, index) => {
    const listItem = document.createElement('li');
    listItem.className = 'execution__item';

    const info = document.createElement('div');
    info.innerHTML = `<strong>${index + 1}. ${item.title || 'Untitled step'}</strong><br><span class="helper-text">${item.tab || 'No tab noted yet'}</span>`;

    const status = document.createElement('span');
    status.className = item.status === 'done' ? 'badge badge--done' : 'badge';
    status.textContent = item.status === 'done' ? 'Done' : 'To do';

    const jumpButton = document.createElement('button');
    jumpButton.className = 'button';
    jumpButton.textContent = index === safeIndex ? 'Viewing' : 'Go';
    jumpButton.disabled = index === safeIndex;
    jumpButton.addEventListener('click', () => {
      moveToStep(index);
    });

    listItem.append(info, status, jumpButton);
    executionList.appendChild(listItem);
  });
}

function addStep(overrides = {}) {
  state.workflow.steps.push({
    title: overrides.title || '',
    tab: overrides.tab || '',
    instructions: overrides.instructions || '',
    status: 'pending'
  });
  state.currentStepIndex = state.workflow.steps.length - 1;
  renderSteps();
  renderExecution();
  saveWorkflow();
}

function updateStep(index, key, value) {
  if (!state.workflow.steps[index]) return;
  state.workflow.steps[index][key] = value;
  saveWorkflow();
  renderExecution();
}

function toggleStepStatus(index) {
  const step = state.workflow.steps[index];
  if (!step) return;
  step.status = step.status === 'done' ? 'pending' : 'done';
  saveWorkflow();
  renderSteps();
  renderExecution();
}

function removeStep(index) {
  state.workflow.steps.splice(index, 1);
  if (state.currentStepIndex >= state.workflow.steps.length) {
    state.currentStepIndex = Math.max(state.workflow.steps.length - 1, 0);
  }
  renderSteps();
  renderExecution();
  saveWorkflow();
}

function moveToStep(targetIndex) {
  const { steps } = state.workflow;
  if (!steps.length) return;
  const nextIndex = Math.min(Math.max(targetIndex, 0), steps.length - 1);
  state.currentStepIndex = nextIndex;
  renderExecution();
}

function toggleCurrentStepDone() {
  const { steps } = state.workflow;
  if (!steps.length) return;
  const current = steps[state.currentStepIndex];
  if (!current) return;

  const wasDone = current.status === 'done';
  current.status = wasDone ? 'pending' : 'done';
  saveWorkflow();
  renderSteps();

  if (!wasDone) {
    const nextUnfinished = steps.findIndex((step, index) => index > state.currentStepIndex && step.status !== 'done');
    if (nextUnfinished !== -1) {
      state.currentStepIndex = nextUnfinished;
    } else if (state.currentStepIndex < steps.length - 1) {
      state.currentStepIndex += 1;
    }
  }

  renderExecution();
}

function copyCurrentInstructions() {
  const step = state.workflow.steps[state.currentStepIndex];
  if (!step) return;

  const textToCopy = [step.title, step.tab, step.instructions]
    .filter(Boolean)
    .join('\n\n')
    .trim();

  if (!textToCopy) {
    alert('Add a title, tab, or instructions before copying.');
    return;
  }

  const originalLabel = elements.copyCurrentButton.textContent;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      flashButton(elements.copyCurrentButton, 'Copied!');
    }).catch(() => {
      fallbackCopy(textToCopy, originalLabel);
    });
  } else {
    fallbackCopy(textToCopy, originalLabel);
  }
}

function fallbackCopy(text, originalLabel) {
  const temp = document.createElement('textarea');
  temp.value = text;
  document.body.appendChild(temp);
  temp.select();
  try {
    document.execCommand('copy');
    flashButton(elements.copyCurrentButton, 'Copied!');
  } catch (error) {
    alert('Copy failed. Select the text manually and copy with Ctrl+C or Cmd+C.');
  }
  document.body.removeChild(temp);
  if (originalLabel) {
    setTimeout(() => {
      elements.copyCurrentButton.textContent = originalLabel;
    }, 1500);
  }
}

function flashButton(button, message) {
  const previous = button.textContent;
  button.textContent = message;
  button.disabled = true;
  setTimeout(() => {
    button.textContent = previous;
    button.disabled = false;
  }, 1200);
}

function saveWorkflow() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.workflow));
  } catch (error) {
    console.error('Unable to save workflow', error);
  }
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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createBlankWorkflow();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return createBlankWorkflow();
    return {
      name: typeof parsed.name === 'string' ? parsed.name : 'Untitled workflow',
      steps: Array.isArray(parsed.steps)
        ? parsed.steps.map(step => ({
            title: typeof step.title === 'string' ? step.title : '',
            tab: typeof step.tab === 'string' ? step.tab : '',
            instructions: typeof step.instructions === 'string' ? step.instructions : '',
            status: step.status === 'done' ? 'done' : 'pending'
          }))
        : []
    };
  } catch (error) {
    console.warn('Could not load saved workflow, starting fresh.', error);
    return createBlankWorkflow();
  }
}

function createBlankWorkflow() {
  return {
    name: 'Untitled workflow',
    steps: []
  };
}
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
