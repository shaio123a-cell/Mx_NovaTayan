# Tasks completions computation : 
    - Add ability to control centrally in the administration the global setting for tasks completion compution - 
            - HTTP Response Code Status mapping : 
                -  Task executon success = HTTP Response 
                -  Task executon failure = HTTP Response code 400-599
    
    - Add ability to control centrally in the administration the global setting for tasks completion compution - 
            - HTTP Response Code Status mapping : 
                -  Task executon success = HTTP Response 
                -  Task executon failure = HTTP Response code 400-599
    
    - Add abiliyt at task level to override the global setting for tasks completion compution
    - Add ability at task level to define sanity check to the task output this should allow definition of regex that will check the output of the task and determine if the task was successful or not. this should be optional and should be defined at task level and allow to define multiple sanity checks as well as to define the severity of the sanity check (warning, error) these severities should override the global setting for tasks completion compution

    # Workflow Inspect Capabilities 
    - Add ability to inspect the workflow execution history and to see the input and output of each task in the workflow by right cliking on the task and selecting inspect