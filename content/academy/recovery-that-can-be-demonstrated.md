## Understand the concept

Availability mechanisms and backups address different failures. Replication can promptly copy accidental deletion or malicious changes. A backup is useful only if the data, keys and restoration procedure remain available under the expected failure scenario. Separate recovery time from tolerable data loss.

## Apply it to a realistic decision

Recovery time objective describes a target restoration interval. Recovery point objective describes a tolerable data-loss window. If backups run daily, a four-hour data-loss goal is not satisfied merely because restoration is fast. Exercise recovery in an isolated environment and record timestamps and integrity checks.

## Practice and explain

Plan a restoration drill for a small club wiki. Assume the original host and its credentials are unavailable. Identify every independent item needed to recover.

Write a short answer before checking the flashcard or quiz. Include the evidence you would collect, a likely failure case, and a limitation of your proposed control. Good security work makes assumptions visible and gives another person a way to verify the result.

## Check your understanding

Why is replication alone not a backup strategy?

**Expected reasoning:** It can reproduce deletion, corruption and attacker changes in the replica. RPO concerns acceptable data loss measured in time; RTO concerns restoration time.

## Continue your study

This is introductory coverage of objective 3.4, not a complete treatment of all exam subtopics. Compare your notes with the [official objectives document](https://assets.ctfassets.net/82ripq7fjls2/6TYWUym0Nudqa8nGEnegjG/0f9b974d3b1837fe85ab8e6553f4d623/CompTIA-Security-Plus-SY0-701-Exam-Objectives.pdf) and identify terms you cannot yet explain. Revisit the related local labs and the original practice questions after hands-on work. No practice score here predicts a certification result.
