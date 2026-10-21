## Understand the concept

Monitoring needs collection, transport, storage, analysis and a response owner. A dashboard cannot reveal events the source never records. Establish time synchronization, retention and detection of collection failures before tuning alert thresholds. Protect logs from unauthorized changes.

## Apply it to a realistic decision

If a collector stops sending data, a flat graph may look reassuring. Add a heartbeat or volume-based gap check appropriate to the source. An alert should contain the observed evidence, relevant context, severity rationale and next action; excessive duplicate alerts can bury meaningful changes.

## Practice and explain

Write a detection requirement for missing authentication logs. Specify expected frequency, grace period, escalation owner and a test that simulates a stopped collector.

Write a short answer before checking the flashcard or quiz. Include the evidence you would collect, a likely failure case, and a limitation of your proposed control. Good security work makes assumptions visible and gives another person a way to verify the result.

## Check your understanding

Why is log time synchronization important?

**Expected reasoning:** It makes event correlation and ordering across systems more reliable. Absence of events is not evidence of healthy systems when collection itself may have failed.

## Continue your study

This is introductory coverage of objective 4.4, not a complete treatment of all exam subtopics. Compare your notes with the [official objectives document](https://assets.ctfassets.net/82ripq7fjls2/6TYWUym0Nudqa8nGEnegjG/0f9b974d3b1837fe85ab8e6553f4d623/CompTIA-Security-Plus-SY0-701-Exam-Objectives.pdf) and identify terms you cannot yet explain. Revisit the related local labs and the original practice questions after hands-on work. No practice score here predicts a certification result.
