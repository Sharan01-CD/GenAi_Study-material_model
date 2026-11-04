import { StudyMaterial, QuestionSuite } from '../types/study';

export function exportStudyMaterialToMarkdown(material: StudyMaterial): string {
  const parts: string[] = [];

  parts.push(`# ${material.title}`);
  parts.push(`*Topic: ${material.topic} | Level: ${material.educationLevel} | Goal: ${material.studyGoal}*`);
  parts.push(`*Generated with CogniLearn AI on ${new Date(material.createdAt).toLocaleDateString()}*\n`);

  parts.push(`## 🧭 Overview & Core Mental Model`);
  parts.push(`${material.overview.summary}\n`);
  parts.push(`**Core Mental Model:** ${material.overview.coreMentalModel}\n`);
  parts.push(`### Learning Objectives`);
  material.overview.learningObjectives.forEach((obj, idx) => {
    parts.push(`${idx + 1}. ${obj}`);
  });
  parts.push('\n---\n');

  parts.push(`## 📖 Structured Study Modules\n`);
  material.modules.forEach((mod, mIdx) => {
    parts.push(`### Module ${mIdx + 1}: ${mod.title}`);
    parts.push(`*${mod.summary}*\n`);

    mod.concepts.forEach((concept) => {
      parts.push(`#### 💡 ${concept.name}`);
      parts.push(`${concept.explanation}\n`);
      parts.push(`- **Intuitive Analogy:** ${concept.analogy}`);
      parts.push(`- **Key Takeaway:** ${concept.keyTakeaway}`);
      parts.push(`- **Common Pitfalls & Misconceptions:** ${concept.commonPitfalls}`);
      if (concept.examples && concept.examples.length > 0) {
        parts.push(`- **Practical Examples:**`);
        concept.examples.forEach((ex) => parts.push(`  - ${ex}`));
      }
      parts.push('');
    });
  });

  parts.push('\n---\n');
  parts.push(`## ⚡ High-Yield Cheat Sheet\n`);
  
  if (material.cheatSheet.keyFormulasOrRules?.length) {
    parts.push(`### 📐 Core Formulas & Rules`);
    material.cheatSheet.keyFormulasOrRules.forEach((rule) => parts.push(`- \`${rule}\``));
    parts.push('');
  }

  if (material.cheatSheet.mnemonics?.length) {
    parts.push(`### 🧠 Mnemonics`);
    material.cheatSheet.mnemonics.forEach((m) => {
      parts.push(`- **${m.phrase}**: ${m.meaning}`);
    });
    parts.push('');
  }

  if (material.cheatSheet.highYieldQuickFacts?.length) {
    parts.push(`### 🎯 High-Yield Quick Facts`);
    material.cheatSheet.highYieldQuickFacts.forEach((fact) => parts.push(`- ${fact}`));
    parts.push('');
  }

  if (material.cheatSheet.crucialDefinitions?.length) {
    parts.push(`### 📚 Crucial Definitions`);
    material.cheatSheet.crucialDefinitions.forEach((def) => {
      parts.push(`- **${def.term}**: ${def.definition}`);
    });
    parts.push('');
  }

  parts.push('\n---\n');
  parts.push(`## 🗂️ Flashcard Deck (${material.flashcards.length} Cards)\n`);
  material.flashcards.forEach((fc, idx) => {
    parts.push(`### Card ${idx + 1} [${fc.difficulty} - ${fc.category}]`);
    parts.push(`**Q:** ${fc.front}`);
    parts.push(`**A:** ${fc.back}`);
    if (fc.hint) parts.push(`*Hint: ${fc.hint}*`);
    parts.push('');
  });

  return parts.join('\n');
}

export function exportFlashcardsToAnki(flashcards: StudyMaterial['flashcards']): string {
  // Anki TSV format: Front <tab> Back <tab> Tags
  const rows = flashcards.map((fc) => {
    const cleanFront = fc.front.replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const cleanBack = (fc.back + (fc.hint ? `<br><small><i>Hint: ${fc.hint}</i></small>` : '')).replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const tags = `${fc.category.replace(/\s+/g, '_')} ${fc.difficulty}`;
    return `${cleanFront}\t${cleanBack}\t${tags}`;
  });
  return rows.join('\n');
}

export function exportQuestionsToMarkdown(suite: QuestionSuite): string {
  const parts: string[] = [];
  parts.push(`# Diagnostic Exam: ${suite.testTitle}`);
  parts.push(`*Topic: ${suite.topic} | Difficulty: ${suite.difficulty} | Time: ~${suite.estimatedTimeMinutes} min*\n`);
  parts.push(`**Instructions:** ${suite.instructions}\n`);
  parts.push('---\n');

  suite.questions.forEach((q, idx) => {
    parts.push(`### Question ${idx + 1} [${q.type.toUpperCase()}] (${q.topicTag})`);
    if (q.scenarioContext) {
      parts.push(`> **Scenario Context:**\n> ${q.scenarioContext}\n`);
    }
    parts.push(`**${q.question}**\n`);

    if (q.options && (q.type === 'mcq' || q.type === 'scenario')) {
      q.options.forEach((opt, oIdx) => {
        const letter = String.fromCharCode(65 + oIdx);
        parts.push(`  ${letter}. ${opt}`);
      });
      parts.push('');
    }

    if (q.type === 'true-false') {
      parts.push('  [ ] True\n  [ ] False\n');
    }

    if (q.type === 'short-answer') {
      parts.push('_Write your response below:_\n\n\n');
    }

    parts.push('<details><summary>Click for Solution & Explanation</summary>');
    if (q.correctAnswerIndex !== undefined && q.options) {
      parts.push(`\n**Correct Option:** ${String.fromCharCode(65 + q.correctAnswerIndex)}: ${q.options[q.correctAnswerIndex]}`);
    }
    if (q.statementIsTrue !== undefined) {
      parts.push(`\n**Statement is:** ${q.statementIsTrue ? 'TRUE' : 'FALSE'}`);
    }
    if (q.sampleAnswer) {
      parts.push(`\n**Sample Exemplar Answer:** ${q.sampleAnswer}`);
    }
    parts.push(`\n**Explanation:** ${q.explanation}`);
    if (q.rubric) {
      parts.push(`\n**Scoring Rubric:** ${q.rubric}`);
    }
    parts.push('</details>\n');
    parts.push('---\n');
  });

  return parts.join('\n');
}

export function triggerDownload(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
