## Understand the concept

Encryption protects confidentiality using keys. A hash summarizes data for comparison but does not hide it. A digital signature binds a message to a signing key and detects modification; trusting the signer also requires trusting how that key was associated with an identity. A certificate links a public key to names and other assertions through an issuer.

## Apply it to a realistic decision

TLS normally combines asymmetric authentication and key establishment with efficient symmetric record protection. Check hostname, validity, issuer chain and revocation expectations. A self-signed certificate may encrypt a connection while providing no independently established identity. Password storage needs a purpose-built password hashing scheme with salts and an appropriate work factor.

## Practice and explain

Hash a harmless text file, change one character and compare the result. Explain why an attacker who can replace both the file and its unauthenticated hash defeats this check.

Write a short answer before checking the flashcard or quiz. Include the evidence you would collect, a likely failure case, and a limitation of your proposed control. Good security work makes assumptions visible and gives another person a way to verify the result.

## Check your understanding

Does a matching hash prove a file is safe?

**Expected reasoning:** No. It supports equality or integrity relative to a reference, not benign behavior. A separately authenticated verification key changes the trust boundary. A hash alone does not identify its publisher.

## Continue your study

This is introductory coverage of objective 1.4, not a complete treatment of all exam subtopics. Compare your notes with the [official objectives document](https://assets.ctfassets.net/82ripq7fjls2/6TYWUym0Nudqa8nGEnegjG/0f9b974d3b1837fe85ab8e6553f4d623/CompTIA-Security-Plus-SY0-701-Exam-Objectives.pdf) and identify terms you cannot yet explain. Revisit the related local labs and the original practice questions after hands-on work. No practice score here predicts a certification result.
