## Understand the concept

A vulnerability is a weakness that can be used to violate a security property. Injection occurs when untrusted input is interpreted as instructions. A race condition arises when a relevant state changes between operations. Unsupported software increases the difficulty of obtaining fixes, but age alone does not demonstrate exploitation.

## Apply it to a realistic decision

For a file-upload service, validate more than the filename suffix. Establish who may upload, where bytes are stored, whether they can execute, how size is limited and how later downloads are handled. A path check followed by a separate open can be vulnerable if an attacker can change the filesystem between them.

## Practice and explain

Explain how parameterized database queries keep data separate from query structure. Then identify one security problem they do not solve, such as excessive account privileges.

Write a short answer before checking the flashcard or quiz. Include the evidence you would collect, a likely failure case, and a limitation of your proposed control. Good security work makes assumptions visible and gives another person a way to verify the result.

## Check your understanding

Why is input validation not the same as authorization?

**Expected reasoning:** Well-formed data can still request an action the caller is not allowed to perform. The checked filesystem object can differ from the object used later.

## Continue your study

This is introductory coverage of objective 2.3, not a complete treatment of all exam subtopics. Compare your notes with the [official objectives document](https://assets.ctfassets.net/82ripq7fjls2/6TYWUym0Nudqa8nGEnegjG/0f9b974d3b1837fe85ab8e6553f4d623/CompTIA-Security-Plus-SY0-701-Exam-Objectives.pdf) and identify terms you cannot yet explain. Revisit the related local labs and the original practice questions after hands-on work. No practice score here predicts a certification result.
