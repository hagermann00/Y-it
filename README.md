# Y-It Browser Workflow Coach

This single-page helper lets you design a repeatable checklist, keep recommended prompts handy, and walk through complex
multi-tab work without wiring up APIs. Everything lives in your browser – no account, no backend, nothing to deploy.

## What you can do

- **Name the workflow** so you remember what you were working on next time you open the page.
- **Drop in a ready-made prompt** from the starter library or begin with a blank step.
- **Write the tab to visit and the exact instructions** an operator should follow, including what to paste into other tools.
- **Run the checklist** using the guided panel: move forward or backward, tick off progress, and copy the current instructions to
  your clipboard.
- **Come back later** – the workflow is saved automatically inside `localStorage`.

## Getting started

1. Open `index.html` in your browser. You can double-click it from Finder/File Explorer or drag it into a new browser tab.
2. Give the workflow a short name, then either add a blank step or press “Use this prompt” on one of the preset cards.
3. For each step, describe what needs to happen, which tab to visit, and any notes or prompts the operator should paste.
4. Switch to the “Run the checklist” panel and use the buttons to move through your steps while you jump between tabs.
5. When you are finished, hit “Start from scratch” to clear everything and build a fresh runbook.

## Tips for smooth teamwork

- Keep this helper open in one tab and arrange the other tools in separate tabs so you can alt-tab quickly.
- The “Copy instructions” button grabs the title, target tab, and prompt for the current step. Paste it straight into your AI
  copilot, chat widget, or task form.
- Status resets are manual: use “Reset progress” if you want to walk the same list again with a new teammate.
- Want to store multiple workflows? Save this file under a new name (for example `support-workflow.html`) and each version will
  remember its own steps inside your browser storage.
# Y-It Workflow Companion

This single-page helper keeps your workflow visible while you operate other web apps in neighbouring tabs. Think of it as a
living checklist that stores reusable prompts, notes, and status updates so you can run complex browser-based processes without
building any integrations.

## How it helps

- **Prompt library** – tap a preset card to instantly add a fully written step to your plan, then tweak it to match your
  situation.
- **Workflow planner** – arrange steps, set the app you will visit, capture notes, and keep everything aligned as you swap tabs.
- **Run mode** – select a step to focus on, copy the prompt into the target app, and mark your progress while the companion stays
  open in a second window.
- **Local saving** – your plan stays in the browser’s localStorage, so refreshing or closing the tab will keep the last plan ready
  for next time.

## Getting started

1. Open each tool you need (email, CRM, docs, etc.) in its own browser tab.
2. Keep `index.html` open in another tab or window. Split your screen if you prefer seeing both at once.
3. Click a preset prompt or add a blank step, then adapt the title, app, prompt, and notes.
4. When you are ready to execute, switch to the **Run mode** panel, pick the current step, and copy prompts into the other tabs as
   you work.
5. Use the status buttons to keep track of what is pending, active, or complete so teammates can resume without guesswork.

## Copying your plan

Use the “Copy plan summary” button to grab a plain-text version of every step. Paste it into documentation, a ticket, or chat to
hand off the workflow to someone else.
