# Variables processing 
- When editing a task we have the option for variables editing and a seperate option for output mutation - I want to change it so tha each variable if either contant value or can be a mutaiton of the output. This means that we need to have for every variable:
    1. name 
    2. value - should be a text field where one can write a constant value or click option for value transformer/mutation (please suggest a nicer name for this option do not call it value mutation) - I will explain here under what needs to happen when selecting value muatation  
    3. Scope -  (local, workflow, global) - workflow is the deafult  

- Whenclicking the option for value mutaiton a drawer should open for editing the value mutation for this specific variable 

- The drawer for value muation should using several option 
    1. Constant value - this is similar to putting contant value in the task variables editing 
    2. Regular Explression - this will allow the user to simply use a regex on the value being processed 
    3. Json JMESPath - will perform simple jmespath on the data being processed 
    4. XML Xpath - will treat the value provided as a xpath on the data being processed 
    5. Advanced - when clicking this the option to provide a YAML and sample data fields and test the YAML and data - would be displayed 

    - In all options (excepct costant value) the drawer should allow - testing using sample data and preview reaults 

    - In all options an example of valid value should be avalilable through a button that will allow seeing help on valid values per option and examples of processing of each example 

    # Order of processing and usage of previsouly defined variables 
    - Once a variable is defined and value mutation wa cliked the user also needs to select what is value being processed - 
        1. Task output after successful execution (default) - this would mean that the mutaiton is done on the output of the executed task 
        2. Variable - this should allow user to select another variable and use its value as an input for mutaiton - the result of the mutaiton of the selected variable will be stored in this variable who is doing the mutation. 

        If variable is selected then the user should be preseneted with variables that are relevant for processing - this means :  
        2.1. Any variables deifned previously in this task
        2.2. If there are other tasks that execute previously in this workflow and that have variables scoped as "Workflow" - then he should be able to select them as input for processing  
        2.3 Any variable defined as global 


# Use variables inside Advanced mutation YAML
- A user should hae the option to use variables inside the YAML - for example lets say a user has a global variable that has a certain value that the customer wants to use as an output name instead of contant value

# Error indication of variables processing in the inspect view 
- If a task failed to mutate a certain value for any reason there should be an inditation for this when inspecting the task amd lookng at the variables 

# AI agent for assistance in value muatation 
I want to have a AI assistance agent that can help user in creating the correct muatation - this should allow user to use natural language for getting the right option for output mutation 

The AI agent may ask for sample data and, whther the data is from the output or from another variabe (ad present variables names for selection or somethun like that or ask the user to input variable name), as for example of expected result and try to contruct the best output mutation to get this done - and define these values in the advaced mutaiton screen 


# Save , Discard, Cancel 
If a user clicked outsid the drawer a popup asking the user if he wants to save, discard or cancel should come up and the logic should handle save, discard and cancel acccordingly

# When a varibale Saved, Dicard or Cancel - go back to the previous drawer 