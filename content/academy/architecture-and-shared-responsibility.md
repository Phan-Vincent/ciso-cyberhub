## Understand the concept

Architecture changes where controls must operate. Containers share a host kernel; virtual machines normally use separate guest kernels. Serverless removes some host-management work but still leaves identity, code and data configuration responsibilities. The exact cloud responsibility split depends on the service and contract.

## Apply it to a realistic decision

A public object store can expose data even when the provider securely operates the underlying infrastructure. Identify the customer-controlled identity policy, object permissions and logging settings. Infrastructure as code improves repeatability, but a repeatable insecure configuration remains insecure.

## Practice and explain

Compare a local VM, a managed database and a serverless function. Assign ownership for patching, access policy, data classification and recovery tests.

Write a short answer before checking the flashcard or quiz. Include the evidence you would collect, a likely failure case, and a limitation of your proposed control. Good security work makes assumptions visible and gives another person a way to verify the result.

## Check your understanding

What important isolation difference separates containers from VMs?

**Expected reasoning:** Containers usually share the host kernel; VMs normally run a guest kernel. Managed infrastructure does not eliminate the customer configuration responsibilities.

## Continue your study

This is introductory coverage of objective 3.1, not a complete treatment of all exam subtopics. Compare your notes with the [official objectives document](https://assets.ctfassets.net/82ripq7fjls2/6TYWUym0Nudqa8nGEnegjG/0f9b974d3b1837fe85ab8e6553f4d623/CompTIA-Security-Plus-SY0-701-Exam-Objectives.pdf) and identify terms you cannot yet explain. Revisit the related local labs and the original practice questions after hands-on work. No practice score here predicts a certification result.
