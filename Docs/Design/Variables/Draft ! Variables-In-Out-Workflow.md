
## Workflow Administration Panel
- In the designr create a workflow administration panel that has will allow defining different administratie elements of the workflow. When clicking this a shelf should open where the user can define different elements of the workflow. 
For now I know of three tabs that this panel should have : 
    - Sheduling
    - Variables 
    - Notifications

## Input and Output Variables Tab of Workflow Administration Panel
This tab should have 2 sections in it :
- Input Variables 
- Output Variables 

# Variables Tab --> Input Variables 
- Input Varibles should allow defining variables (just like in standard output processing of any task. With all features Add, remove, Update variable, pick variable Diret Value including pick variables from list) 

- Input Variables are used for defining input variables into the workflow (think of the workflow and a procedure and of the input variables as the input variable that a procedure gets as input). These input variables are also going to be used for a future development of running workflows from other workflows and providing input to the workflow.

- Input variables by default should have as a default value "Use Parent Workflow Input" - this will be only available for input variables defined in this tab and not for variables defined in the task tab. The idea is that if the user selects "Use Parent Workflow Input" - the variable will get its input from the parent workflow that will execute this workflow. 
- If a variable is not set to "Use Parent Workflow Input" - then it should have the ability to define "config transformer" but when editing the config transformer of an input variable we should have the abilty to either pick variable (just like in any value config transformer) or "Use Parent Workflow Input" - this will be only available for input variables defined in this tab and not for variables defined in the task tab. The idea is that if the user selects "Use Parent Workflow Input" - the variable will get its input from the parent workflow that will execute this workflow. 

# Variables Tab --> Output Variables 
- Output variables are like a "return" of a procedure. 
- Output variables should allow defining variables (just like in standard output processing of any task. With all features Add, remove, Update variable, pick variable Diret Value including pick variables from list) 
- Output variables should have the ability to define "config transformer" 
- When using using the "Pick" for selecting a variable that will be used as a direct input to this output variable AS WELL AS when using the "Config Transfromer" and picking a variable - ALL variables that exist in the tasks of this workflow (includug all defined overlay variables) should be available in the list of variables to pick from. And also all global variables and macros, utlity helpers etc. 
- Again - Output variables should be then returned completion of execution of this workflow to the workflow that executed this workflow 


# Workflow Administration Panel --> Notification Tab
This tab should allow defining notifications for the workflow. 

- Notifications can include mode than 1 notification per workflow. and therefore should be managed as a list. 
- Since we can manage notifications as a list - we should have CRUD capabilities for the notifications. 

- When Adding a new notification the user should be able to select the notification type from a list of notification types. 

- For now the only notification type should be "Workflow" notification. 
- When selecting this notification type - the user should be able to get a list of workflows defined in the system. And select the workflow to execute as notification.  
- When selecting a workflow to execute as notification - The user should also get a panel that shows the input variables for this notification. The input variables should be according to the input variables of the workflow that is selected as notification. The user should only be able to define the value for these inut variables and NOT to define new input variables or change the name of the vars that the workflow has as input variables. 
- The value for the input variables should be able to be defined in the same way as in the variables in output procesing tabe.g. Direct Value, pick variable, config transformer)
- If selectig a variable (either from Pick or from Config Transformer) - the list of variables should include all variables that exist in the tasks of this workflow (includug all defined overlay variables) should be available in the list of variables to pick from. And also all global variables and macros, utlity helpers etc. 
- If a user selected a config transformer - this transformation should be done on the value of the variable BEFORE it actually sends the inut value to the workflow used for notification
- When creating a notification - the user should be able to select the trigger for the notification. The trigger should be a list of events that can trigger the notification. For now the only trigger should be "Workflow Completion" as well as "On Success", "On Failure", "On Cancelled". The notification workflow should be exectuted according to the selected trigger. 
- The status of notification should be shown in the inspect panel of the workflow. The inspect workflow should have a new button (like the "Run Again" button) that will allow the user to see the inspect of Notifications. When clicking this a shelf panel should open showing the list of notifications that were triggered by this workflow, Their staus (accoridng to teh notificaiton workflow completion status) and should allow drilling down to the inspect of the notificaiton workflow. 
- When drilling own to the inspect of teh notification workflow and going back usin the back button of the workflow inspect - the app should take the user back to the inspect panel of the workflow notifications list.  

# Run Workflow from inslde a workflow 
As of new workflow designer allows selecting tasks that were defined in the "Tasks" tab to be added to the workflow.  From now I want to also have the ability to select a workflow to be executed from inside a workflow.  

- When creating or editing a workflow - currently we have "Tasks Library" that the user can select from. I want to change it to "Library" that the user can select from. This library should include both tasks and workflows. 

- The "Search Task" should change to "Search Library" and should allow searching both tasks and workflows 

- In the Library tasks and workflows should have different icons to distinguish between them. 

- When selecting / darg & dropping a workflow from the library in the workflow - the cube icon of "Worflow" should look different from the cube icon of a task. Cube icon of workflow should have a small icon of workflow inside it to distinguish between them. Also the color of the cube of workflow used inside a workflow should be blue background. 

- When selecting a workflow the cube should also show the nuber of input and output variables it has. For example if the workflow has 2 input variables and 3 output variables - the cube should show "In Vars-2 . Out Vars-3" inside it.

- When designing a workflow in the designer - and adding a workflow to it - When clicking on the cube of a workflow from the a shelf panel should open that shows 2 tabs 
    - input variables - this is the way to pass values into the input vars that the workflow expect to get as input variables 
    - Output variables - this is the way to map the values returned from the workflow into variables that can be used in the workflow that the user currently designes 

- The input variables should behave like this : 
    - The user should also get a panel that shows the list of input variables for this workflow. The input variables should be according to the input variables of the workflow that is selected. The user should only be able to define the value for these inut variables and NOT to define new input variables or change the name of the vars that the workflow has as input variables. 
    - The value for the input variables should be able to be defined in the same way as in the variables in output procesing tabe.g. Direct Value, pick variable, config transformer
    - If selectig a variable (either from Pick or from Config Transformer) - the list of variables should include all variables that exist in the tasks of this workflow (includug all defined overlay variables) should be available in the list of variables to pick from. And also all global variables and macros, utlity helpers etc. 
    - If a user selected a config transformer - this transformation should be done on the value of the variable BEFORE it actually sends the inut value to the workflow executed form this workflow (parent workflow)

# Inspecting workflow that executes onr or more workflows inside it. 
When inspecting a workflow that has other workflows inside it. When clicking on the child workflow the app should open the inspect panel of the child workflow. And when going back using the back button of the workflow inspect - the app should take the user back to the inspect panel of the father workflow. 

- When inspecting a "parent workflow" that has chid worflow - the 3 dots menu of a cube of type "workflow" should have 3 options :
    - Inspect Variables 
    - Inspect Workflow
    - Edit workflow (this should open the designer for the child workflow)

- Inspect variables should open a shelf panel that shows the input and output variables of the child workflow. And should allow the user to see the values of these variables in the last execution of the child workflow. 

- Inspect workflow should open the inspect panel of the child workflow. 

