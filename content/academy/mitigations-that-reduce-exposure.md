## Understand the concept

Match mitigations to the failure mechanism. Least privilege limits the actions an account can perform. Segmentation constrains paths between systems. Patching removes specific weaknesses when the correct fix is applied successfully. Application allowlisting limits executable software but needs a process for legitimate updates.

## Apply it to a realistic decision

For an unpatchable lab appliance, isolate the management interface, remove public exposure, restrict the administrator group and monitor access. Record an owner and a review date for this compensating arrangement. Calling the appliance segmented is insufficient if another route still permits the same access.

## Practice and explain

Draw the permitted flows to a legacy service. Test the allowed connection and at least one connection that should be denied.

Write a short answer before checking the flashcard or quiz. Include the evidence you would collect, a likely failure case, and a limitation of your proposed control. Good security work makes assumptions visible and gives another person a way to verify the result.

## Check your understanding

Why test both allowed and denied network paths?

**Expected reasoning:** A functioning service does not prove the boundary blocks unauthorized traffic. Reducing reachable paths can limit exposure while a supported replacement or patch is arranged.

## Continue your study

This is introductory coverage of objective 2.5, not a complete treatment of all exam subtopics. Compare your notes with the [official objectives document](https://assets.ctfassets.net/82ripq7fjls2/6TYWUym0Nudqa8nGEnegjG/0f9b974d3b1837fe85ab8e6553f4d623/CompTIA-Security-Plus-SY0-701-Exam-Objectives.pdf) and identify terms you cannot yet explain. Revisit the related local labs and the original practice questions after hands-on work. No practice score here predicts a certification result.
