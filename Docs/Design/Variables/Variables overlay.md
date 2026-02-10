ALL DONE 

# J) Task Level Variables and Workflow Level Variables 
- From now on I want variables that are defined in the Tasks tab to be available in the Workflow. Yet when such a task is added to a workflow and a user Edits the task variables from inside the workflow (either from the designer or from teh workflow inspect). In this case : 
   - A user should not be able to edit variables that are defined in the Tasks tab.
   - A user can add new variables to the task from inside the workflow.These should automatically be deinfed as Workflow level variables 
   - These variables that are added from the workflow should be available only in that workflow. And should not affect the definition of the task as it is defined in the Tasks tab. 
   - This means that any task that is edited from the workflow should be a like overleay of the task as it is defined in the Tasks tab.  
   - This also means that a user may be able to use the task defined in the Tasks tab in different workflows. And in each workflow the task can have different set of variables. On top of the variables that were defined for this task in the Task tab. 
   -That also means that task variables (defined in the task tasb) are not changed when the task is used in different workflows.
   - This will also ensure that the task variables edited frin the task tab would affect all the instances of the task in all workflows.

- When editing a task from the workflow, the task variables should be shown in the Output processing tab with a different color or icon to indicate that they are workflow level variables.  And again - they should not be editable from the edit task variables panel from the designer or from the workflow inspect panel. 

- In addition - currently there is the Tasks tab a Out of the Box task for variables mutation. please remove it. Its not neccessary now that we have the Variables manipulation object in the designer 

- Also I want to to the variables picker some additional macros under the workflow system variables : 
   - Last execution epoch time
   - Last successful workflow execution epoch time
   - Last failed workflow execution epoch time
   - Last cancelled workflow execution epoch time
   