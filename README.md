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
