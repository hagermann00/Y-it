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
