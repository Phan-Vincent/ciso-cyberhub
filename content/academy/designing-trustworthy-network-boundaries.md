## Understand the concept

Place controls where the relevant traffic actually passes. An inline prevention device can block traffic, while a passive sensor observes a copy. Decide explicitly whether a failure should allow traffic or stop it, balancing security and availability for the use case. A network diagram should show management traffic as well as application traffic.

## Apply it to a realistic decision

A web application firewall inspects application-layer requests but does not replace authorization in the application. A jump host reduces direct administrative exposure only if alternate routes are closed and access is monitored. Encryption protects traffic in transit but does not make a compromised endpoint trustworthy.

## Practice and explain

Create a flow table for browser-to-web and web-to-database traffic. Include source, destination, port, purpose and default-deny behavior.

Write a short answer before checking the flashcard or quiz. Include the evidence you would collect, a likely failure case, and a limitation of your proposed control. Good security work makes assumptions visible and gives another person a way to verify the result.

## Check your understanding

What should determine fail-open versus fail-closed?

**Expected reasoning:** The specific safety, availability and security consequences of the failure. A passive sensor is outside the forwarding path unless another control acts on its results.

## Continue your study

This is introductory coverage of objective 3.2, not a complete treatment of all exam subtopics. Compare your notes with the [official objectives document](https://assets.ctfassets.net/82ripq7fjls2/6TYWUym0Nudqa8nGEnegjG/0f9b974d3b1837fe85ab8e6553f4d623/CompTIA-Security-Plus-SY0-701-Exam-Objectives.pdf) and identify terms you cannot yet explain. Revisit the related local labs and the original practice questions after hands-on work. No practice score here predicts a certification result.
