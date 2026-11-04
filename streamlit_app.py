import os
import json
import time
from datetime import datetime, timedelta
import streamlit as st
from pypdf import PdfReader
from google import genai

# ---------------------------------------------------------
# Page Configuration
# ---------------------------------------------------------
st.set_page_config(
    page_title="CogniLearn AI - Study & Question Generator",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------------------------------------------------------
# Session State Initialization
# ---------------------------------------------------------
if "study_material" not in st.session_state:
    st.session_state.study_material = None

if "question_suite" not in st.session_state:
    st.session_state.question_suite = None

if "user_answers" not in st.session_state:
    st.session_state.user_answers = {}

if "quiz_submitted" not in st.session_state:
    st.session_state.quiz_submitted = False

if "last_studied_at" not in st.session_state:
    st.session_state.last_studied_at = None

if "card_index" not in st.session_state:
    st.session_state.card_index = 0

if "show_card_back" not in st.session_state:
    st.session_state.show_card_back = False

if "card_mastery" not in st.session_state:
    st.session_state.card_mastery = {}

if "quiz_history" not in st.session_state:
    st.session_state.quiz_history = []

# ---------------------------------------------------------
# API Client Setup
# ---------------------------------------------------------
def get_gemini_client():
    api_key = (
        st.secrets.get("GEMINI_API_KEY")
        or os.environ.get("GEMINI_API_KEY")
        or st.session_state.get("user_gemini_api_key", "")
    )
    if not api_key:
        return None
    return genai.Client(api_key=api_key)

# ---------------------------------------------------------
# Utility Helpers
# ---------------------------------------------------------
def extract_pdf_text(uploaded_file, max_pages=30) -> str:
    try:
        reader = PdfReader(uploaded_file)
        text_parts = []
        for i, page in enumerate(reader.pages[:max_pages]):
            txt = page.extract_text()
            if txt:
                text_parts.append(txt)
        return "\n".join(text_parts).strip()
    except Exception as e:
        st.error(f"Error reading PDF: {e}")
        return ""

def clean_json_string(text: str) -> str:
    s = text.strip()
    if s.startswith("```json"):
        s = s[7:]
    elif s.startswith("```"):
        s = s[3:]
    if s.endswith("```"):
        s = s[:-3]
    return s.strip()

# ---------------------------------------------------------
# Gemini Generation Functions
# ---------------------------------------------------------
def generate_study_material(client, topic: str, context_text: str, education_level: str, study_goal: str, language: str):
    prompt = f"""
You are an expert pedagogical designer. Create a comprehensive, structured study guide on:
Topic: "{topic}"
Education Level: {education_level}
Study Goal: {study_goal}
Output Language: {language}

Context/Reference Material provided by the user:
\"\"\"{context_text[:12000]}\"\"\"

Generate a valid JSON object matching this schema:
{{
  "id": "study-{int(time.time())}",
  "title": "Comprehensive Study Guide: {topic}",
  "topic": "{topic}",
  "educationLevel": "{education_level}",
  "studyGoal": "{study_goal}",
  "overview": {{
    "summary": "3-4 sentence high-yield summary of key principles",
    "coreMentalModel": "The foundational intuitive analogy or model",
    "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"]
  }},
  "modules": [
    {{
      "id": "mod-1",
      "title": "Module Title",
      "readingTimeMinutes": 5,
      "concepts": [
        {{
          "id": "c1",
          "name": "Key Concept Name",
          "definition": "Clear concise definition",
          "feynmanExplanation": "Intuitive breakdown using an everyday analogy",
          "realWorldExample": "Practical concrete application",
          "pitfallWarning": "Common misconception to avoid"
        }}
      ]
    }}
  ],
  "cheatSheet": {{
    "crucialDefinitions": ["Term 1: Definition", "Term 2: Definition"],
    "keyFormulasOrRules": ["Rule / Formula 1", "Rule / Formula 2"],
    "highYieldQuickFacts": ["Fact 1", "Fact 2"],
    "mnemonics": ["Mnemonic rule / memory trick"]
  }},
  "flashcards": [
    {{
      "id": "fc-1",
      "front": "Core question or term",
      "back": "Clear, high-yield explanation",
      "topic": "{topic}"
    }}
  ]
}}
Return ONLY valid JSON.
"""
    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=prompt,
        config={"response_mime_type": "application/json"}
    )
    raw = clean_json_string(response.text or "{}")
    return json.loads(raw)

def generate_questions(client, topic: str, context_text: str, count: int = 8, difficulty: str = "Medium"):
    prompt = f"""
Create an adaptive diagnostic question bank and examination suite on:
Topic: "{topic}"
Target Count: {count} questions
Difficulty: {difficulty}

Reference Context:
\"\"\"{context_text[:12000]}\"\"\"

Include a balanced mix of:
- Multiple-choice questions (MCQs)
- Realistic clinical/applied scenario case questions
- True / False conceptual checks
- Short-answer free response questions

Generate a valid JSON object with this exact structure:
{{
  "id": "quiz-{int(time.time())}",
  "testTitle": "{topic} Diagnostic Examination",
  "topic": "{topic}",
  "difficulty": "{difficulty}",
  "estimatedTimeMinutes": {max(5, count * 2)},
  "questions": [
    {{
      "id": "q-1",
      "type": "mcq",
      "difficulty": "Medium",
      "topicTag": "{topic}",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "explanation": "Clear explanation of why this answer is correct",
      "distractorRationales": {{
        "Option B": "Why Option B is incorrect",
        "Option C": "Why Option C is incorrect",
        "Option D": "Why Option D is incorrect"
      }}
    }},
    {{
      "id": "q-2",
      "type": "scenario",
      "difficulty": "Hard",
      "topicTag": "{topic}",
      "scenarioContext": "A realistic scenario describing a situation, patient, or system behavior...",
      "question": "Based on the scenario above, what is the best course of action?",
      "options": ["Action A", "Action B", "Action C", "Action D"],
      "correctAnswerIndex": 1,
      "explanation": "Detailed rationale based on scenario data",
      "distractorRationales": {{
        "Action A": "Why Action A is suboptimal",
        "Action C": "Why Action C fails",
        "Action D": "Why Action D is dangerous"
      }}
    }},
    {{
      "id": "q-3",
      "type": "true-false",
      "difficulty": "Easy",
      "topicTag": "{topic}",
      "question": "State whether this proposition is True or False.",
      "statementIsTrue": true,
      "explanation": "Why this statement is True"
    }}
  ]
}}
Return ONLY valid JSON.
"""
    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=prompt,
        config={"response_mime_type": "application/json"}
    )
    raw = clean_json_string(response.text or "{}")
    return json.loads(raw)

# ---------------------------------------------------------
# Sidebar
# ---------------------------------------------------------
with st.sidebar:
    st.title("🧠 CogniLearn AI")
    st.caption("GenAI Study Material & Diagnostic Exam Generator")

    # API Key Handling
    client = get_gemini_client()
    if not client:
        st.warning("⚠️ Gemini API Key not detected in secrets or environment.")
        user_key = st.text_input("Enter GEMINI_API_KEY", type="password")
        if user_key:
            st.session_state.user_gemini_api_key = user_key
            st.rerun()
    else:
        st.success("✅ Gemini AI Connected")

    st.markdown("---")
    st.subheader("📚 Deck Status")
    if st.session_state.study_material:
        st.write(f"**Active Topic:** {st.session_state.study_material.get('topic')}")
        cards_count = len(st.session_state.study_material.get('flashcards', []))
        st.write(f"**Flashcards:** {cards_count}")
    else:
        st.info("No study material loaded yet.")

    if st.session_state.question_suite:
        q_count = len(st.session_state.question_suite.get('questions', []))
        st.write(f"**Exam Questions:** {q_count}")
    else:
        st.caption("No diagnostic questions generated yet.")

    # Smart Scheduler indicator
    if st.session_state.last_studied_at:
        last_dt = datetime.fromtimestamp(st.session_state.last_studied_at)
        st.write(f"**Last Studied:** {last_dt.strftime('%b %d, %H:%M')}")
        hours_since = (datetime.now() - last_dt).total_seconds() / 3600
        if hours_since >= 24:
            st.error("🚨 Spaced Review Overdue (>24h)!")
        else:
            st.success("✨ Review schedule up to date")

# ---------------------------------------------------------
# Main Tabs
# ---------------------------------------------------------
tab_gen, tab_study, tab_cards, tab_quiz, tab_perf = st.tabs([
    "⚡ Generate",
    "📖 Study Guide",
    "🗂️ Flashcards",
    "📝 Questions & Quiz Hub",
    "📊 Performance & Scheduler"
])

# ---------------------------------------------------------
# TAB 1: GENERATE
# ---------------------------------------------------------
with tab_gen:
    st.header("⚡ Synthesize Study Materials & Practice Questions")
    st.write("Upload a PDF document or enter any topic to autonomously generate structured study guides, flashcards, cheat sheets, and diagnostic exams.")

    col1, col2 = st.columns([1, 1])

    with col1:
        topic_input = st.text_input(
            "Topic / Subject Title",
            placeholder="e.g., Cellular Respiration, Docker & Kubernetes, Contract Law..."
        )

        uploaded_pdf = st.file_uploader(
            "Upload Document (PDF or TXT)",
            type=["pdf", "txt"],
            help="Extracts text directly for context-grounded study guides."
        )

        direct_notes = st.text_area(
            "Or paste notes / syllabus text directly",
            height=130,
            placeholder="Paste syllabus, textbook excerpts, or lecture transcripts..."
        )

    with col2:
        edu_level = st.selectbox(
            "Target Academic Level",
            ["Undergraduate", "High School", "Graduate / Master's", "Professional Certification"]
        )

        study_goal = st.selectbox(
            "Primary Study Goal",
            ["Deep Conceptual Understanding", "Rapid Exam Cramming", "Practical Application & Problem Solving"]
        )

        q_count = st.slider("Diagnostic Questions Count", min_value=3, max_value=20, value=8)
        difficulty = st.select_slider("Question Difficulty", options=["Easy", "Medium", "Hard"], value="Medium")

    col_btn1, col_btn2 = st.columns(2)

    with col_btn1:
        gen_all = st.button("🚀 Generate Comprehensive Suite (Guide + Questions)", type="primary", use_container_width=True)

    with col_btn2:
        gen_q_only = st.button("⚡ Generate Questions Only (Fastest)", use_container_width=True)

    if gen_all or gen_q_only:
        client = get_gemini_client()
        if not client:
            st.error("Please supply a valid GEMINI_API_KEY in the sidebar or via Streamlit Secrets.")
        else:
            # Gather text
            extracted_context = ""
            if uploaded_pdf:
                if uploaded_pdf.name.endswith(".pdf"):
                    with st.spinner("Extracting text from PDF..."):
                        extracted_context = extract_pdf_text(uploaded_pdf)
                else:
                    extracted_context = uploaded_pdf.read().decode("utf-8", errors="ignore")

            combined_context = (direct_notes + "\n\n" + extracted_context).strip()
            effective_topic = topic_input.strip() or (uploaded_pdf.name if uploaded_pdf else "Document Study")

            with st.spinner(f"Generating for '{effective_topic}' using Gemini AI..."):
                try:
                    q_suite = generate_questions(
                        client=client,
                        topic=effective_topic,
                        context_text=combined_context,
                        count=q_count,
                        difficulty=difficulty
                    )
                    st.session_state.question_suite = q_suite
                    st.session_state.user_answers = {}
                    st.session_state.quiz_submitted = False
                    st.session_state.last_studied_at = time.time()

                    if gen_all:
                        mat = generate_study_material(
                            client=client,
                            topic=effective_topic,
                            context_text=combined_context,
                            education_level=edu_level,
                            study_goal=study_goal,
                            language="English"
                        )
                        st.session_state.study_material = mat

                    st.success(f"🎉 Generated successfully! Check the 'Questions & Quiz Hub' or 'Study Guide' tab.")
                except Exception as e:
                    st.error(f"Generation failed: {e}")

# ---------------------------------------------------------
# TAB 2: STUDY GUIDE
# ---------------------------------------------------------
with tab_study:
    mat = st.session_state.study_material
    if not mat:
        st.info("No study guide generated yet. Generate one in the 'Generate' tab!")
    else:
        st.title(mat.get("title", "Study Guide"))
        st.caption(f"Academic Level: {mat.get('educationLevel')} | Goal: {mat.get('studyGoal')}")

        # Overview Card
        overview = mat.get("overview", {})
        st.subheader("💡 Core Mental Model & Overview")
        st.info(overview.get("summary", ""))
        st.markdown(f"**Foundational Analogy:** *{overview.get('coreMentalModel', '')}*")

        if overview.get("learningObjectives"):
            st.markdown("**Learning Objectives:**")
            for obj in overview.get("learningObjectives", []):
                st.markdown(f"- {obj}")

        st.markdown("---")

        # Modules
        st.subheader("📖 Deep-Dive Curriculum Modules")
        for mod in mat.get("modules", []):
            with st.expander(f"📌 {mod.get('title')} ({mod.get('readingTimeMinutes', 5)} min read)", expanded=True):
                for c in mod.get("concepts", []):
                    st.markdown(f"### {c.get('name')}")
                    st.markdown(f"**Definition:** {c.get('definition')}")
                    st.markdown(f"**Intuitive Feynman Analogy:** {c.get('feynmanExplanation')}")
                    if c.get("realWorldExample"):
                        st.markdown(f"**Real-world Example:** `{c.get('realWorldExample')}`")
                    if c.get("pitfallWarning"):
                        st.warning(f"⚠️ **Common Pitfall:** {c.get('pitfallWarning')}")
                    st.markdown("---")

        # Cheat Sheet
        cheat = mat.get("cheatSheet", {})
        if cheat:
            st.subheader("⚡ High-Yield Cheat Sheet")
            col_c1, col_c2 = st.columns(2)
            with col_c1:
                st.markdown("**Crucial Definitions:**")
                for d in cheat.get("crucialDefinitions", []):
                    st.markdown(f"• {d}")
                st.markdown("**Formulas & Rules:**")
                for r in cheat.get("keyFormulasOrRules", []):
                    st.markdown(f"• `{r}`")
            with col_c2:
                st.markdown("**High-Yield Facts:**")
                for f in cheat.get("highYieldQuickFacts", []):
                    st.markdown(f"• {f}")
                st.markdown("**Memory Mnemonics:**")
                for m in cheat.get("mnemonics", []):
                    st.markdown(f"• 💡 *{m}*")

        # Markdown Download
        st.markdown("---")
        guide_md = f"# {mat.get('title')}\n\n## Overview\n{overview.get('summary')}\n"
        st.download_button(
            "📥 Download Study Guide as Markdown",
            data=guide_md,
            file_name=f"{mat.get('topic', 'study-guide')}.md",
            mime="text/markdown"
        )

# ---------------------------------------------------------
# TAB 3: FLASHCARDS
# ---------------------------------------------------------
with tab_cards:
    mat = st.session_state.study_material
    cards = mat.get("flashcards", []) if mat else []

    if not cards:
        st.info("No flashcards available. Generate a study guide to unlock active recall cards!")
    else:
        st.subheader("🗂️ Active Recall 3D Flashcards")
        curr_idx = st.session_state.card_index % len(cards)
        card = cards[curr_idx]

        st.progress((curr_idx + 1) / len(cards), text=f"Card {curr_idx + 1} of {len(cards)}")

        # Card container
        card_box = st.container(border=True)
        with card_box:
            if not st.session_state.show_card_back:
                st.markdown(f"### ❓ Front / Question")
                st.markdown(f"## {card.get('front')}")
                st.caption("Click 'Flip Card' to test your recall.")
            else:
                st.markdown(f"### 💡 Back / Solution")
                st.markdown(f"## {card.get('back')}")
                st.success("Mastery note: Explain this in your own words before advancing.")

        col_f1, col_f2, col_f3 = st.columns([1, 1, 1])
        with col_f1:
            if st.button("⬅️ Previous Card", use_container_width=True):
                st.session_state.card_index = max(0, curr_idx - 1)
                st.session_state.show_card_back = False
                st.rerun()

        with col_f2:
            if st.button("🔄 Flip Card", type="primary", use_container_width=True):
                st.session_state.show_card_back = not st.session_state.show_card_back
                st.rerun()

        with col_f3:
            if st.button("Next Card ➡️", use_container_width=True):
                st.session_state.card_index = (curr_idx + 1) % len(cards)
                st.session_state.show_card_back = False
                st.rerun()

# ---------------------------------------------------------
# TAB 4: QUESTIONS & QUIZ HUB
# ---------------------------------------------------------
with tab_quiz:
    suite = st.session_state.question_suite
    if not suite or not suite.get("questions"):
        st.info("No exam questions currently generated. Create questions in the 'Generate' tab!")
    else:
        questions = suite.get("questions", [])
        st.title(f"📝 {suite.get('testTitle', 'Diagnostic Exam')}")
        st.caption(f"Topic: {suite.get('topic')} | Difficulty: {suite.get('difficulty')} | Total Items: {len(questions)}")

        view_mode = st.radio(
            "Display Format",
            ["📋 View All Questions & Solutions", "🎯 Interactive Test Mode"],
            horizontal=True
        )

        # ---------------------------------------------
        # MODE 1: ALL QUESTIONS LIST VIEW
        # ---------------------------------------------
        if view_mode == "📋 View All Questions & Solutions":
            st.markdown("### Complete Question Sheet & Answer Key")
            search_query = st.text_input("🔍 Search Questions or Explanations", "")

            for idx, q in enumerate(questions):
                if search_query and search_query.lower() not in q.get("question", "").lower():
                    continue

                with st.container(border=True):
                    q_type = q.get("type", "mcq")
                    col_h1, col_h2 = st.columns([3, 1])
                    with col_h1:
                        st.markdown(f"**Question {idx + 1}** `[{q.get('difficulty')}]` `[{q_type.upper()}]`")
                    with col_h2:
                        st.caption(f"Topic: {q.get('topicTag')}")

                    if q.get("scenarioContext"):
                        st.info(f"**Applied Scenario:** {q.get('scenarioContext')}")

                    st.markdown(f"### {q.get('question')}")

                    # Options
                    if q_type in ["mcq", "scenario"] and q.get("options"):
                        correct_idx = q.get("correctAnswerIndex", 0)
                        for opt_idx, opt in enumerate(q.get("options", [])):
                            letter = chr(65 + opt_idx)
                            if opt_idx == correct_idx:
                                st.success(f"**{letter}. {opt}** *(✓ Correct Answer)*")
                            else:
                                st.write(f"{letter}. {opt}")

                    elif q_type == "true-false":
                        is_true = q.get("statementIsTrue", True)
                        st.write(f"**Correct Proposition:** `{'TRUE' if is_true else 'FALSE'}`")

                    # Explanation & Distractor Breakdown
                    with st.expander("💡 Solution & Distractor Breakdown", expanded=True):
                        st.markdown(f"**Educational Rationale:** {q.get('explanation')}")
                        distractors = q.get("distractorRationales", {})
                        if distractors:
                            st.markdown("**Distractor Analysis (Why other choices fail):**")
                            for dist_k, dist_v in distractors.items():
                                st.markdown(f"- **{dist_k}:** {dist_v}")

        # ---------------------------------------------
        # MODE 2: INTERACTIVE TEST MODE
        # ---------------------------------------------
        else:
            st.markdown("### 🎯 Interactive Exam Session")
            form = st.form(key="exam_form")
            with form:
                for idx, q in enumerate(questions):
                    st.markdown(f"#### Question {idx + 1}")
                    if q.get("scenarioContext"):
                        st.caption(f"Scenario: {q.get('scenarioContext')}")
                    st.write(q.get("question"))

                    q_type = q.get("type", "mcq")
                    q_key = f"q_ans_{q.get('id', idx)}"

                    if q_type in ["mcq", "scenario"] and q.get("options"):
                        st.radio(
                            "Select your answer:",
                            options=q.get("options"),
                            key=q_key,
                            index=None
                        )
                    elif q_type == "true-false":
                        st.radio(
                            "True or False:",
                            options=["True", "False"],
                            key=q_key,
                            index=None
                        )
                    else:
                        st.text_area("Your response:", key=q_key, height=80)

                    st.markdown("---")

                submit_btn = st.form_submit_button("Submit & Grade Exam", type="primary")

            if submit_btn:
                st.session_state.quiz_submitted = True
                st.session_state.last_studied_at = time.time()

                # Calculate score
                total_scored = 0
                correct_count = 0
                for idx, q in enumerate(questions):
                    q_type = q.get("type", "mcq")
                    q_key = f"q_ans_{q.get('id', idx)}"
                    user_val = st.session_state.get(q_key)

                    if q_type in ["mcq", "scenario"] and q.get("options"):
                        total_scored += 1
                        correct_opt = q.get("options")[q.get("correctAnswerIndex", 0)]
                        if user_val == correct_opt:
                            correct_count += 1
                    elif q_type == "true-false":
                        total_scored += 1
                        expected = "True" if q.get("statementIsTrue") else "False"
                        if user_val == expected:
                            correct_count += 1

                score_pct = round((correct_count / max(1, total_scored)) * 100)
                st.session_state.quiz_history.append({
                    "timestamp": time.time(),
                    "score": score_pct,
                    "correct": correct_count,
                    "total": total_scored
                })

                st.balloons()
                st.success(f"🏆 Exam Complete! Your Grade: **{score_pct}%** ({correct_count} of {total_scored} correct)")

# ---------------------------------------------------------
# TAB 5: PERFORMANCE & SCHEDULER
# ---------------------------------------------------------
with tab_perf:
    st.header("📊 Performance Overview & Smart Study Scheduler")

    col_m1, col_m2, col_m3 = st.columns(3)

    history = st.session_state.quiz_history
    avg_score = round(sum(h["score"] for h in history) / len(history)) if history else 0
    attempts_count = len(history)

    with col_m1:
        st.metric("Total Quiz Attempts", attempts_count)
    with col_m2:
        st.metric("Average Score", f"{avg_score}%")
    with col_m3:
        status_txt = "Ready for Review"
        if st.session_state.last_studied_at:
            hrs = (time.time() - st.session_state.last_studied_at) / 3600
            if hrs >= 24:
                status_txt = "🚨 Overdue (>24h)"
            else:
                status_txt = "Up to date"
        st.metric("Review Due Status", status_txt)

    st.markdown("---")
    st.subheader("⏰ Spaced Repetition Memory Tracker")
    st.write("CogniLearn automatically tracks the last time you reviewed or tested on this subject. If more than 24 hours pass, a review reminder triggers.")

    if st.session_state.last_studied_at:
        dt_str = datetime.fromtimestamp(st.session_state.last_studied_at).strftime('%Y-%m-%d %H:%M:%S')
        st.write(f"**Last Studied Timestamp:** `{dt_str}`")

        if st.button("Mark Subject Reviewed Today"):
            st.session_state.last_studied_at = time.time()
            st.success("Updated last studied time to now!")
            st.rerun()
    else:
        st.info("Study or complete a quiz to initiate the spaced scheduler.")
