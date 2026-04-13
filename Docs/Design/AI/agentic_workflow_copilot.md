# Design: Restmon AI Copilot (Agentic Workflow Generation)

Status: **Proposed** | Priority: **High** | Version: **1.0**

## 1. Overview
The **Restmon AI Copilot** is an agentic assistant designed to transform human-readable goals and API documentation into functional Restmon building blocks (Tasks and Workflows). Its primary goal is to eliminate the manual "lookup and wire" effort required when integrating new systems.

## 2. Core Concepts

### A. The "Copilot" Persona
Instead of a simple "Generator," the system acts as a **Pair Programmer**. 
- It understands the current project context (Existing Tasks, Global Variables, Folder structure).
- It asks clarifying questions (e.g., "Which authentication method does System 1 use for this endpoint?").
- It generates draft implementations that the user can inspect/edit before saving.

### B. Contextual Intelligence
To be effective, the AI must know:
- **Project Context**: What variables are already available? What folder names exist?
- **Restmon Schema**: The exact JSON structure of a `Task` and `Workflow`.
- **System Documentation**: User-provided API specs, Swagger/OpenAPI files, or raw text documentation.

---

## 3. Architecture

### 1. AI Connector (apps/api/src/ai)
A new module in the NestJS API that communicates with an LLM (recommended: **Gemini 1.5 Pro** via Google Generative AI SDK).
- **Tool Calling**: The AI will have "Tools" it can call, such as `createTask`, `updateWorkflowNodes`, `getAvailableGlobalVars`.
- **System Prompting**: Highly specialized prompts that define how to map API concepts (JSONPath, regex, headers) to Restmon fields.

### 2. Generative Side-Panel (apps/web/src/components/AICopilot)
A persistent chat interface available in both the **Workflows List** and **Workflow Designer**.

### 3. LLM Connection Management & Fallback (Admin Settings)
To ensure reliability and continuous service, the system supports configurable, prioritized LLM connections manageable directly from the **Administration** tab (`apps/web/src/pages/AdminSettings.tsx`).
- **Multi-Connection Support**: Administrators can define multiple API connections with unique keys (e.g., Google Gemini 1.5 Pro, Gemini 1.5 Flash, or custom endpoints).
- **Fallback Strategy (Chaining)**: Connections are arranged in an ordered list based on priority. If the primary LLM is exhausted (e.g., rate-limited on a free tier) or returns an error, the backend Copilot service automatically falls back to the next *enabled* LLM in the queue.
- **Granular Control**: Connections can be toggled ON or OFF instantly without deleting their credentials.

---

## 4. Phased Implementation

### Phase 1: The "Smart Task Architect" (The Quick Win)
**Focus**: Convert "Raw API Docs" to "Restmon Tasks".
- **User Action**: Opens the Task Creator, chooses "AI Generation", and pastes documentation.
- **AI Action**: Parses the text, identifies method/URL/Params, creates a suggested Payload template, and defines `variableExtraction` paths.
- **Outcome**: A 10-minute manual task reduced to 10 seconds.

### Phase 2: The "Workflow Architect"
**Focus**: Goal-oriented orchestration.
- **User Action**: "I want to sync new SQL users to our Slack channel."
- **AI Action**: 
    1. Identifies necessary steps (Fetch from SQL -> Filter -> Post to Slack).
    2. Suggests creating the required Tasks if they don't exist.
    3. Drafts the Workflow graph (Nodes/Edges) with the correct `Variable Transformations` (VMA nodes).

### Phase 3: "Agentic Reconciliation"
**Focus**: Automatic fixing.
- **User Action**: "The Slack integration is failing with HTTP 400."
- **AI Action**: Analyzes the execution log/recap, compares with documentation, and suggests a fix (e.g., "The payload structure changed, update the JSON mapping").

---

## 5. Why this Approach Works
1. **Developer Experience**: It doesn't replace the developer; it removes the "boring" part of integration.
2. **Reliability**: By starting with **Tasks** (the building blocks) and allowing user validation, we minimize the risk of "halucinated" logic in complex workflows.
3. **Restmon Synergy**: Restmon's structured JSON architecture is perfectly suited for LLM generation compared to complex code-based platforms.

## 6. Next Steps
1. **Dependency Injection**: Add `@google/generative-ai` to the API.
2. **Prototype**: Create a simple endpoint that takes a documentation string and returns a `CreateTaskDto` JSON.
3. **UI Integration**: Add a "Magic Wand" icon to the Task creation shelf.
