## Understand the concept

Confidentiality limits disclosure, integrity protects against unauthorized modification, and availability supports timely use. Authentication establishes a claimed identity; authorization decides permitted actions; accounting records what occurred. Successfully signing in does not mean every action should be allowed.

## Apply it to a realistic decision

In a zero-trust design, location alone grants no blanket trust. Evaluate identity, device state and requested resource at an enforcement point. A student on a campus network should still need permission to access a grading system. Signatures can support attribution, but key theft and weak identity binding undermine that assurance.

## Practice and explain

Draw an access decision for a student downloading their own report. Identify the authentication evidence, authorization rule and audit event.

Write a short answer before checking the flashcard or quiz. Include the evidence you would collect, a likely failure case, and a limitation of your proposed control. Good security work makes assumptions visible and gives another person a way to verify the result.

## Check your understanding

Which CIA goal is harmed by an unauthorized grade change?

**Expected reasoning:** Integrity: the record no longer faithfully represents an authorized result. Authentication establishes identity; authorization evaluates whether that identity may perform this action.

## Continue your study

This is introductory coverage of objective 1.2, not a complete treatment of all exam subtopics. Compare your notes with the [official objectives document](https://assets.ctfassets.net/82ripq7fjls2/6TYWUym0Nudqa8nGEnegjG/0f9b974d3b1837fe85ab8e6553f4d623/CompTIA-Security-Plus-SY0-701-Exam-Objectives.pdf) and identify terms you cannot yet explain. Revisit the related local labs and the original practice questions after hands-on work. No practice score here predicts a certification result.
