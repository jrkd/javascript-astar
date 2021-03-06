import {AStar, GridGraph, Planner, WorldState, GoalNode, NodeAction, GoalEdge} from "new-astar";
import * as $ from "jquery"; 
import { IGraphEdge } from "../../lib/output/graphedge";
declare var require: any;

const JSONFormatter = require('json-formatter-js');
const JSONEditor = require('jsoneditor');


 
/*  demo.js http://github.com/bgrins/javascript-astar
    MIT License

    Set up the demo page for the A* Search
*/
/* global Graph, astar, $ */


let jsonFormatterOptions = {
    hoverPreviewEnabled: true,
    hoverPreviewArrayCount: 100,
    hoverPreviewFieldCount: 5,
    theme: '',
    animateOpen: true,
    animateClose: true,
    useToJSON: true
};

let initialStateJSONx = {
    "hungry": true,
    "moneyWithMe": 0,
    "numFoodRecipes": 0,
    "moneyAtBank": 5,
    "bankPosX": 5,
    "bankPosY": 5,
    "numBread": 0,
    "numCheese": 0,
    "myPosX": 0,
    "myPosY": 0
};


let currentWorldState: WorldState = new WorldState();
currentWorldState = $.extend(currentWorldState, {
    "hungry": true,
    "moneyWithMe": 0,
    "numFoodRecipes": 0,
    "moneyAtBank": 5,
    "bankPosX": 5,
    "bankPosY": 5,
    "numBread": 0,
    "numCheese": 0,
    "myPosX": 0,
    "myPosY": 0
});


const editableOptions = { 
    "search": false,
    "mainMenuBar": false,
    "navigationBar": false, 
    "limitDragging": true,
    // "onCreateMenu": (items, context) =>{
    //     return items.filter( (el, _) => {
    //         return el.text == "Append" || el.text == "Remove"
    //     }).map((el) => { delete el.submenu;return el;});
    // }
  };

  
const goalOptions = { 
    "search": false,
    "mainMenuBar": false,
    "navigationBar": false, 
    "limitDragging": true
  };

//var actions: NodeAction[];
class ActionSet {
    name:string;
    actions:NodeAction[];
    disabledActions:NodeAction[];
    currentGoal:WorldState;
    currentGoalName:string;
    currentActionPlan:GoalEdge[] = [];
};
let actionSets:ActionSet[] = [];
let intitialWorldStateEditor, goalWorldStateEditor;

let goalStateJSON = {
    "Serve Customers": {
        "customersServed": true
    }, 
    "Dont be hungry": {
        "isHungry": false
    }
};

let nextActionsetTurnIndex:number = 0;
let currentActivityIndex:number = 0;

$(function() {
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.get("initialStateJSON"))
    {
        loadDataFromQuerystring();
    }
    else
    {
        loadDataFromStorage();
    }
    

    

    intitialWorldStateEditor = new JSONEditor($(".initial-world-state")[0], $.extend(editableOptions,{"name":"Initial world state"}));
    intitialWorldStateEditor.set(currentWorldState);

    goalWorldStateEditor = new JSONEditor($(".goal-world-state")[0], $.extend(goalOptions,{"name":"Goal world state"}));
    goalWorldStateEditor.set(goalStateJSON);
    // $(".initial-world-state").append(new JSONFormatter(initialStateJSON, 1, jsonFormatterOptions).render());
    // $(".goal-world-state").append(new JSONFormatter(goalStateJSON, 1, jsonFormatterOptions).render());

    //setup the actions we can use. 
    //planner.nodes -- we dont really have a full list of them right? cause each action just tweaks them?...
    //suppose you could make things quick by pre-processing?
    //actions:
    //actions = setupActions();
    //renderActions(actions);
    renderActionsets(actionSets);

    $("#saveCurrent").click((e)=>{
        e.preventDefault();
        updateDataFromPage();
        saveDataToQuerystring();
    });
    $("#reset").click((e)=>{
        e.preventDefault();
        saveDataToStorage({}, {}, []);
        loadDataFromStorage();
        renderActionsets(actionSets);
        renderWorldStatesOnPage();
    });
    $(".run-search").click(()=>{
        updateDataFromPage();
        const currentActionset = getCurrentActionset();

        $(".plan-list-results").empty();
        actionSets.forEach(actionset=>runSearch(actionset));
    });
    $("#addAction").click(()=>{
        let currentActionset = getCurrentActionset();
        if(!currentActionset){
            let $firstActionsetButton = $("#actionset-names-dropdown .dropdown-item:first");
            if($firstActionsetButton.length == 0){
                addNewActionset(false);
                $firstActionsetButton = $("#actionset-names-dropdown .dropdown-item:first");
            }
            $firstActionsetButton.addClass("active");
            $(".actionset-container:first").addClass("active show");
            currentActionset = getCurrentActionset();
        }
        let $actionList = $('.actionset-container.active .action-list');
        addEmptyAction($actionList, currentActionset.name); 
    });

    $("#addActionList").click(()=>{
        updateDataFromPage();

        addNewActionset();

        let $newActionsetButton = $("#actionset-names-dropdown .dropdown-item:last");
        $newActionsetButton.addClass("active");
        $(".actionset-container:last").addClass("active show");
    });

    $("#nextStep").click(()=>{
        updateDataFromPage();
        let currentActionset:ActionSet = actionSets[nextActionsetTurnIndex];

        if(currentActivityIndex == 0){
            //run initital plan. 
            actionSets.forEach(actionset=>runSearch(actionset));
        }
        implementPlanWithAction(currentActionset);

        //loop back around to the first actionset if at the end of list.
        nextActionsetTurnIndex = nextActionsetTurnIndex + 1;
        if(nextActionsetTurnIndex >= actionSets.length){
            nextActionsetTurnIndex = 0;
        }

        intitialWorldStateEditor.set(currentWorldState);
        ++currentActivityIndex;
        $('.activity-log').scrollTop($('.activity-log')[0].scrollHeight); //keep at the bottom
        $('html, body').scrollTop( $(document).height());
    }); 
    

    $('body').on('click', '.delete-action',(e)=>{
        $(e.currentTarget).closest(".accordion-item").remove();
    });
});

function addNewActionset(includeEmptyAction:boolean = true) {
    let newActionSet = new ActionSet();
    let numNewActionsetsAlready = actionSets.filter(actionset=>actionset.name.startsWith("New-Actionset")).length
    newActionSet.name = "New-Actionset"+numNewActionsetsAlready + 1;
    newActionSet.actions = [];
    newActionSet.disabledActions = [];
    if(includeEmptyAction){
        newActionSet.actions = [
            new NodeAction()
        ];
    }
    actionSets.push(newActionSet);
    renderActionsets(actionSets);
}

    //If there isnt a goal
    //re-run and re-check before logging 

    //if there is a goal, and we've reached it, 
    //log then re-run for new stuff.

    //if theres a goal, and its still valid, process and log

    //if theres a goal, and the plans now invalid,
    // log that its invalid, re-run, re-log? could be valid now? could have no goals

    //feels like i should be doing the single re-run first, regardless. 
function implementPlanWithAction(actionset:ActionSet){
    
    //The goal & actions can be in these states: 
    //1. plan has completed successfully. (runSearch)
    //2. no plans and actions exist.  (runSearch)
    //3. plan does exist, but now its invalid. (runSearch)
    //4. plan is in progress
    //
    let goalAndActionsExist:boolean = actionset.currentGoal && (actionset.currentActionPlan !== undefined && actionset.currentActionPlan !== null);
    let planWasSuccessful = actionset.currentGoal && actionset.currentGoal.containedWithin(currentWorldState);
    let planIsValid = goalAndActionsExist 
                        && !planWasSuccessful
                        && actionset.currentActionPlan.length > 0 
                        && actionset.currentActionPlan[0].action.preconditions.containedWithin(currentWorldState) //check action's preconditions are still met. 
                        && checkPlanIsValidFromCurrentState(currentWorldState, actionset.currentGoal, actionset.currentActionPlan);
                        // and from the current world state, can we still get to the goal by applying the whole list of actions?

    if(!goalAndActionsExist || !planIsValid || planWasSuccessful){
        //run a new search.
        actionset.currentGoalName = "";
        actionset.currentActionPlan = [];
        actionset.currentGoal = null;
        runSearch(actionset);

        goalAndActionsExist = actionset.currentGoal && (actionset.currentActionPlan !== undefined && actionset.currentActionPlan !== null);
        planWasSuccessful = actionset.currentGoal && actionset.currentGoal.containedWithin(currentWorldState);
        planIsValid = goalAndActionsExist 
                        && !planWasSuccessful
                        && actionset.currentActionPlan.length > 0 
                        && actionset.currentActionPlan[0].action.preconditions.containedWithin(currentWorldState) //check action's preconditions are still met. 
                        && checkPlanIsValidFromCurrentState(currentWorldState, actionset.currentGoal, actionset.currentActionPlan)

        if(!goalAndActionsExist) {
            logNewActivity("#activity-log-no-goals-template", "", "", actionset.name);
        }
        else if(planWasSuccessful){
            logNewActivity("#activity-log-complete-goal-template", "", actionset.currentGoalName, actionset.name);
        }
    }


    if( planIsValid )
    {
        logNewActivity("#activity-log-use-action-template", actionset.currentActionPlan[0].action.name, actionset.currentGoalName, actionset.name);
        currentWorldState = actionset.currentActionPlan[0].action.effects.applyTo(currentWorldState);
        actionset.currentActionPlan = actionset.currentActionPlan.slice(1);//remove current action from front of action plan.
    } else if(goalAndActionsExist) {
        logNewActivity("#activity-log-invalid-goal-template", "", actionset.currentGoalName, actionset.name);
    }

    
}

function checkPlanIsValidFromCurrentState(currentWorld:WorldState, goalWorld:WorldState, actionPlan:GoalEdge[]):boolean{
    let isValid:boolean = true;

    return isValid;
}

function logNewActivity(activityLogItemTemplateSelector:string, actionName:string, goalName:string, agentName:string){
    let $itemTemplate = $(activityLogItemTemplateSelector);
    let activtyHTML = $itemTemplate.html();
    activtyHTML = activtyHTML.split("{{actionName}}").join(actionName);
    activtyHTML = activtyHTML.split("{{goalName}}").join(goalName);
    activtyHTML = activtyHTML.split("{{agentName}}").join(agentName);
    
    $(".activity-log").append(activtyHTML);
}


function updateDataFromPage(){
    //set initial and goal state based on current 
    updateWorldStatesFromPage();

    actionSets = [];
    $(".actionset-container").each( (index, actionsetContainer) =>{

        const actionsetName:string = $(actionsetContainer).find(".actionset-name").val().toString();
        let currentActionset:ActionSet = actionSets.filter(actionset=>actionset.name === actionsetName)[0];
        if(currentActionset == null){
            currentActionset = new ActionSet();
            currentActionset.name = actionsetName;
            actionSets.push(currentActionset);
        }
        //let actions = currentActionset.actions;
        currentActionset.actions = [];
        currentActionset.disabledActions = [];
        let $actionList = $(actionsetContainer).find(`.action-list`);
        $actionList.children()
        // .filter((index,child) => $(child).find(".form-check-input").is(":checked"))
        .each((index:number, element:HTMLElement) => {
            let $actionElement = $(element);
            let actionJSONEditorPreConditions = $(element).data("json-editor-preconditions");
            let actionJSONEditorEffects = $(element).data("json-editor-effects");
            let newAction: NodeAction = new NodeAction();
            newAction.name = $actionElement.find("input.action-name").val().toString();
            newAction.cost = parseInt($actionElement.find("input.action-cost").val().toString());
    
            let preconditionsJSON = actionJSONEditorPreConditions.get();
            newAction.preconditions = $.extend(new WorldState(), preconditionsJSON);
    
            let effectsJSON = actionJSONEditorEffects.get();
            newAction.effects = $.extend(new WorldState(), effectsJSON);
    
            if($(element).find(".form-check-input").is(":checked")){
                currentActionset.actions.push(newAction);
            }
            else{
                currentActionset.disabledActions.push(newAction);
            }           
        });
    
        //let $actionsetNameInput = $(`#actionset-${currentActionset.name}-name`);
        //currentActionset.name = $actionsetNameInput.val().toString();
    
    });

  

    saveDataToStorage(currentWorldState, goalStateJSON, actionSets);

    renderActionsets(actionSets);
}

function updateWorldStatesFromPage() {
    currentWorldState = new WorldState();
    currentWorldState = $.extend(currentWorldState, intitialWorldStateEditor.get());
    goalStateJSON = goalWorldStateEditor.get();
}

function renderWorldStatesOnPage(){
    intitialWorldStateEditor.set(currentWorldState);
    goalWorldStateEditor.set(goalStateJSON);
}

function getCurrentActionset():ActionSet
{
    let actionsetName:string = $($("#actionset-names-dropdown .active")[0]).text();
    const visibleActionsets = actionSets.filter((actionset => actionset.name == actionsetName));
    if(visibleActionsets.length > 0){
        return visibleActionsets[0];
    }else{
        return undefined;
    }
}

function saveDataToStorage(initialStateJSON, goalStateJSON, actionSets:ActionSet[])
{
    window.localStorage.setItem("initialStateJSON", JSON.stringify(initialStateJSON));
    window.localStorage.setItem("goalStateJSON", JSON.stringify(goalStateJSON));
    window.localStorage.setItem("actionsets", JSON.stringify(actionSets));
}

function loadDataFromStorage(){
    const stoageInitialStateJSON = window.localStorage.getItem("initialStateJSON");
    if(stoageInitialStateJSON != null && stoageInitialStateJSON.length > 0){
        currentWorldState = new WorldState();
        currentWorldState = $.extend(currentWorldState, JSON.parse(stoageInitialStateJSON));
    }
    
    const storageGoalStateJSON = window.localStorage.getItem("goalStateJSON");
    if(storageGoalStateJSON != null &&  storageGoalStateJSON.length > 0){
        goalStateJSON = JSON.parse(storageGoalStateJSON);
    }
    
    const storageActionsets = window.localStorage.getItem("actionsets");
    if(storageActionsets != null &&  storageActionsets.length > 0){
        const storageActionsetsJSON:Array<any> = JSON.parse(storageActionsets);
        if(storageActionsetsJSON){
            actionSets = storageActionsetsJSON.map(actionsetJSON => {
                let actionset:ActionSet = actionsetJSON;
                actionset.actions = actionset.actions.map(actionJSON => {
                    let action:NodeAction = $.extend(new NodeAction(), actionJSON);
                    action.preconditions = $.extend(new WorldState(), actionJSON.preconditions);
                    action.effects = $.extend(new WorldState(), actionJSON.effects);
                    return action;
                });
                if(actionset.disabledActions){
                    actionset.disabledActions = actionset.disabledActions.map(actionJSON => {
                        let action:NodeAction = $.extend(new NodeAction(), actionJSON);
                        action.preconditions = $.extend(new WorldState(), actionJSON.preconditions);
                        action.effects = $.extend(new WorldState(), actionJSON.effects);
                        return action;
                    });
                } else{
                    actionset.disabledActions = [];
                }
                
                return actionset;
            });
        }
        
    }
}

function loadDataFromQuerystring(){

    const urlParams = new URLSearchParams(window.location.search);
    
    const stoageInitialStateJSON = decodeURIComponent(urlParams.get('initialStateJSON'));
    if(stoageInitialStateJSON != null && stoageInitialStateJSON.length > 0){
        currentWorldState = new WorldState();
        currentWorldState = $.extend(currentWorldState, JSON.parse(stoageInitialStateJSON));
    }
    
    const storageGoalStateJSON = decodeURIComponent(urlParams.get("goalStateJSON"));
    if(storageGoalStateJSON != null &&  storageGoalStateJSON.length > 0){
        goalStateJSON = JSON.parse(storageGoalStateJSON);
    }
    
    const storageActionsets = decodeURIComponent(urlParams.get("actionsets"));
    if(storageActionsets != null &&  storageActionsets.length > 0){
        actionSets = JSON.parse(storageActionsets).map(actionsetJSON => {
            let actionset:ActionSet = actionsetJSON;
            actionset.actions = actionset.actions.map(actionJSON => {
                let action:NodeAction = $.extend(new NodeAction(), actionJSON);
                action.preconditions = $.extend(new WorldState(), actionJSON.preconditions);
                action.effects = $.extend(new WorldState(), actionJSON.effects);
                return action;
            });
            if(actionset.disabledActions){
                actionset.disabledActions = actionset.disabledActions.map(actionJSON => {
                    let action:NodeAction = $.extend(new NodeAction(), actionJSON);
                    action.preconditions = $.extend(new WorldState(), actionJSON.preconditions);
                    action.effects = $.extend(new WorldState(), actionJSON.effects);
                    return action;
                });
            }else{
                actionset.disabledActions = [];
            }

            return actionset;
        });
    }
}

function saveDataToQuerystring(){
    window.location.href = window.location.href.split('?')[0] + "?initialStateJSON=" + encodeURIComponent(JSON.stringify(currentWorldState)) 
                                                            + "&goalStateJSON=" + encodeURIComponent(JSON.stringify(goalStateJSON))
                                                            + "&actionsets=" + encodeURIComponent(JSON.stringify(actionSets));
}

function runSearch(actionset:ActionSet) {

    var $plannerResults = $("#plannerList");
    $plannerResults.empty();
    var planner = new Planner();

    planner.actions = actionset.actions;

    //setup current state
    let startState: WorldState = currentWorldState;

    let startNode: GoalNode = new GoalNode();
    startNode.state = startState;

    let results = [];//AStar.search(planner, startNode, goalNode, {});

    const goalNames = Object.keys(goalStateJSON);
    

    let unmetGoals = [];
    let metGoalName = "";
    for(let index = 0; index < goalNames.length; ++index)
    {
        const goalName = goalNames[index];
        let goalJSON:WorldState = goalStateJSON[goalName];
        let goalState: WorldState = new WorldState();
        $.extend(goalState, goalJSON);

        actionset.currentGoal = null;
        actionset.currentGoalName = "";
        actionset.currentActionPlan = [];
        let goalResults = runSearchForGoal(actionset.actions, startState, goalState);
        if(goalResults.length > 0){
            results = goalResults;
            metGoalName = goalName;
            actionset.currentGoal = goalState;
            actionset.currentActionPlan = goalResults as GoalEdge[];
            actionset.currentGoalName = goalName;
            break;
        } else{
            unmetGoals.push(goalName);
        }
    }

    //$(".no-results-container:last").append("<h5>Using <mark>"+actionset.name+"'s</mark> actions</h5>");
    // unmetGoals.forEach(goalName => {
    //     $(".no-results-container:last").append("<p>Unable to meet <mark>"+goalName + "</mark> goal"+"</p>");
    // });

    // if(metGoalName.length > 0){
    //     $(".no-results-container:last").append("<p>Plan to get to goal with <mark>" +metGoalName + "</mark>"+"</p>");
    // }
    renderPlan(startNode, results, actionset, unmetGoals, metGoalName);
}

function runSearchForGoal(_actions:NodeAction[],startState: WorldState, goalState:WorldState):IGraphEdge[] {
    var planner = new Planner();

    planner.actions = _actions;

    let startNode: GoalNode = new GoalNode();
    startNode.state = startState;
    let goalNode: GoalNode = new GoalNode();
    goalNode.state = goalState;

    planner.preprocessGraph(startNode);

    let results = AStar.search(planner, startNode, goalNode, {});

    return results;
}

function getDefaultActions():NodeAction[] {
    let moveToBank: NodeAction = new NodeAction();
    moveToBank.name = "Move to bank";
    moveToBank.cost = 1;
    moveToBank.preconditions = new WorldState();
    moveToBank.effects = new WorldState();
    moveToBank.effects.myPosX = 5;
    moveToBank.effects.myPosY = 5;

    let takeMoneyFromBank: NodeAction = new NodeAction();
    takeMoneyFromBank.name = "Take money from bank";
    takeMoneyFromBank.cost = 1;
    takeMoneyFromBank.preconditions = new WorldState();
    takeMoneyFromBank.preconditions.myPosX = 5;
    takeMoneyFromBank.preconditions.myPosY = 5;
    takeMoneyFromBank.preconditions.moneyAtBank = 5;
    takeMoneyFromBank.effects = new WorldState();
    takeMoneyFromBank.effects.moneyWithMe = 5;
    takeMoneyFromBank.effects.moneyAtBank = 0;

    let workAJob: NodeAction = new NodeAction();
    workAJob.name = "Another day, another dolla (Work)";
    workAJob.cost = 1;
    workAJob.preconditions = new WorldState();
    workAJob.effects = new WorldState();
    workAJob.effects.moneyAtBank = 5;
    

    let buyPizza: NodeAction = new NodeAction();
    buyPizza.name = "Eat pizza";
    buyPizza.cost = 1;
    buyPizza.preconditions = new WorldState();
    buyPizza.preconditions.hungry = true;
    buyPizza.preconditions.moneyWithMe = 5;
    buyPizza.effects = new WorldState();
    buyPizza.effects.moneyWithMe = 0;
    buyPizza.effects.hungry = false;
    buyPizza.effects.isRelaxed = true;

    let learnToMakeBestToastie: NodeAction = new NodeAction();
    learnToMakeBestToastie.name = "Have a revelation - i know how to make the worlds best toastie";
    learnToMakeBestToastie.cost = 1;
    learnToMakeBestToastie.preconditions = new WorldState();
    learnToMakeBestToastie.preconditions.isRelaxed = true;
    learnToMakeBestToastie.effects = new WorldState();
    learnToMakeBestToastie.effects.numFoodRecipes = 1;

    let makeToastie: NodeAction = new NodeAction();
    makeToastie.name = "Make Toastie";
    makeToastie.cost = 1;
    makeToastie.preconditions = new WorldState();
    makeToastie.preconditions.numFoodRecipes = 1;
    makeToastie.preconditions.numCheese = 1;
    makeToastie.preconditions.numBread = 2;
    makeToastie.effects = new WorldState();
    makeToastie.effects.hungry = false;
    makeToastie.effects.numToastie = 1;
    makeToastie.effects.numCheese = -1;
    makeToastie.effects.numBread = -1;

    let serveCustomers: NodeAction = new NodeAction();
    serveCustomers.name = "Serve customers";
    serveCustomers.cost = 1;
    serveCustomers.preconditions = new WorldState();
    serveCustomers.preconditions.numToastie = 6;
    serveCustomers.effects = new WorldState();
    serveCustomers.effects.customersServed = true;

    let getSliceOfBread: NodeAction = new NodeAction();
    getSliceOfBread.name = "Get Slice of Bread";
    getSliceOfBread.cost = 1;
    getSliceOfBread.preconditions = new WorldState();
    getSliceOfBread.effects = new WorldState();
    getSliceOfBread.effects.numBread = 1;

    let getCheese: NodeAction = new NodeAction();
    getCheese.name = "Get cheese";
    getCheese.cost = 1;
    getCheese.preconditions = new WorldState();
    getCheese.effects = new WorldState();
    getCheese.effects.numCheese = 1;
    return [ workAJob, moveToBank, getSliceOfBread, getCheese, buyPizza, learnToMakeBestToastie , serveCustomers, takeMoneyFromBank, makeToastie ];
}

function renderActionsets(actionsets:ActionSet[])
{
    let $actionsetTabTemplate = $(".actionset-tab-template");
    let $actionsetTabContainer = $("#actionset-names-dropdown");

    let $actionsetTabContentTemplate = $(".actionset-tab-content-template");
    let $actionsetTabContentContainer = $("#myTabContent");

    $actionsetTabContainer.empty();
    $actionsetTabContentContainer.empty();
    actionsets.forEach((actionset:ActionSet, index:number) => {

        let actionsetTabHtml:string = $actionsetTabTemplate.html();
        actionsetTabHtml = actionsetTabHtml.split("{{name}}").join(actionset.name);
        actionsetTabHtml = actionsetTabHtml.split("{{index}}").join(index.toString());

        $actionsetTabContainer.append(actionsetTabHtml);

        let actionsetTabContentHtml:string = $actionsetTabContentTemplate.html();
        actionsetTabContentHtml = actionsetTabContentHtml.split("{{name}}").join(actionset.name);
        actionsetTabContentHtml = actionsetTabContentHtml.split("{{index}}").join(index.toString());

        $actionsetTabContentContainer.append(actionsetTabContentHtml);

        //Once we've added the html for each action list, we populate the actions as per. 

        let $actionList = $(`#actions-${actionset.name}-accordion`);

        renderActions(actionset.name, $actionList, actionset.actions, actionset.disabledActions);

        if(index == 0){
            // $($actionsetTabContainer.find("li a.dropdown-item")).addClass("active");
            // $($actionsetTabContainer.find("li a.dropdown-item")).attr("aria-selected", "true");
            // $($actionsetTabContentContainer.children()[0]).addClass("show active");
            // $($actionsetTabContentContainer.children()[0]).attr("aria-selected", "true");
        }
    });
}


function renderActions(actionsetName:string, $actionList, actions:NodeAction[], disabledActions:NodeAction[]){
    //const $actionList = $(".action-list");
    $actionList.empty();
    actions.forEach((action:NodeAction) => {
        addActionToHTML(actionsetName, $actionList, action.name, action.cost, action.preconditions, action.effects);
    });
    disabledActions.forEach((action:NodeAction) => {
        addActionToHTML(actionsetName, $actionList, action.name, action.cost, action.preconditions, action.effects, false);
    });
}

function addActionToHTML(actionsetName:string, $actionList, name = "[New action]", cost = 1, preconditionsJSON = {}, effectsJSON = {}, enabled = true) { 
    //const $actionList = $(".action-list");
    let actionHtml = $(".action-item-template").html();
    actionHtml = actionHtml.split("{{index}}").join($actionList.children().length.toString());
    actionHtml = actionHtml.split("{{name}}").join(name);
    actionHtml = actionHtml.split("{{cost}}").join(cost.toString());
    actionHtml = actionHtml.split("{{actionsetName}}").join(actionsetName);

    actionHtml = actionHtml.split("{{preconditions}}").join( "" );
    actionHtml = actionHtml.split("{{effects}}").join( "" );

    $actionList.append(actionHtml);

    let $newAction = $actionList.children().last();
    let actionPreconditionsEditor = new JSONEditor($newAction.find(".action-preconditions")[0], $.extend(editableOptions,{"name":"preconditions"}));
    actionPreconditionsEditor.set(preconditionsJSON);
    $newAction.data("json-editor-preconditions", actionPreconditionsEditor);
    let actionEffectsEditor = new JSONEditor($newAction.find(".action-effects")[0], $.extend(editableOptions,{"name":"effects"}));
    actionEffectsEditor.set(effectsJSON);
    $newAction.data("json-editor-effects", actionEffectsEditor);
    
    $newAction.find(".form-check-input").prop('checked', enabled);
}

function addEmptyAction($actionList, actionsetName:string) { 
    //const $actionList = $(".action-list");
    let actionHtml = $(".action-item-template").html();
    actionHtml = actionHtml.split("{{index}}").join($actionList.children().length.toString());
    actionHtml = actionHtml.split("{{name}}").join("[New action]");
    actionHtml = actionHtml.split("{{cost}}").join("1");
    actionHtml = actionHtml.split("{{actionsetName}}").join(actionsetName);

    let preconditionsFormatted = $(new JSONFormatter({}).render()).html();
    actionHtml = actionHtml.split("{{preconditions}}").join( "" );

    let effectsFormatted = $(new JSONFormatter({}).render()).html();
    actionHtml = actionHtml.split("{{effects}}").join( "" );

    $actionList.append(actionHtml);

    let $newAction = $actionList.children().last();
    let actionPreconditionsEditor = new JSONEditor($newAction.find(".action-preconditions")[0], $.extend(editableOptions,{"name":"preconditions"}));
    actionPreconditionsEditor.set({});
    $newAction.data("json-editor-preconditions", actionPreconditionsEditor);
    let actionEffectsEditor = new JSONEditor($newAction.find(".action-effects")[0], $.extend(editableOptions,{"name":"effects"}));
    actionEffectsEditor.set({});
    $newAction.data("json-editor-effects", actionEffectsEditor);
}

function renderPlan(startNode:GoalNode, results:IGraphEdge[], actionset:ActionSet, unmetGoals:string[], metGoalName:string){
    let $planContainer = $(".plan-list-results");
    let planTemplateHtml = $(".plan-template").html();
    let goalDetailsHTML = "";
    unmetGoals.forEach( goalname => {
        goalDetailsHTML += $(".plan-unmet-goal").html().split("{{goalName}}").join(goalname);
    });
    if(metGoalName){
        goalDetailsHTML += $(".plan-met-goal").html().split("{{goalName}}").join(metGoalName);
    }

    planTemplateHtml = planTemplateHtml.split("{{actionsetname}}").join(actionset.name);
    planTemplateHtml = planTemplateHtml.split("{{goalDetailsHTML}}").join(goalDetailsHTML);

    let existingPlan = $planContainer.find(".actionset-goal-details." + actionset.name + "-goal-details");//{{actionsetname}}-goal-details
    if(existingPlan && existingPlan.length > 0){
        existingPlan.remove();
    }
    $planContainer.append(planTemplateHtml);
    
    let $planActionList = $(".plannerList:last");
    let $planActionDetailList = $(".plannerDetailList:last");
    
    let currentNode: GoalNode = startNode;

    let resultPlanActions:string = "";
    let resultPlanActionDetails:string = "";
    results.forEach((result: GoalEdge, index:number) => {
        
        let planActionHtml = $("#plan-item-template").html();
        let planActionDetailHtml = $(".plan-item-detail-template").html();

        planActionHtml = planActionHtml.split("{{index}}").join(index.toString());
        planActionHtml = planActionHtml.split("{{actionName}}").join(result.action.name);
        planActionHtml = planActionHtml.split("{{actionsetName}}").join(actionset.name);
        resultPlanActions += planActionHtml;

        currentNode = result.action.ActivateAction(currentNode);

        planActionDetailHtml = planActionDetailHtml.split("{{index}}").join(index.toString());
        planActionDetailHtml = planActionDetailHtml.split("{{actionName}}").join(result.action.name);
        planActionDetailHtml = planActionDetailHtml.split("{{actionsetName}}").join(actionset.name);

        let actionEffectsFormatted = $(new JSONFormatter(result.action.effects, 99, jsonFormatterOptions).render()).html();
        planActionDetailHtml = planActionDetailHtml.split("{{actionEffects}}").join(actionEffectsFormatted);

        let actionDetailFormatted = $(new JSONFormatter(currentNode.state, 99, jsonFormatterOptions).render()).html();
        planActionDetailHtml = planActionDetailHtml.split("{{changedState}}").join(actionDetailFormatted);
        resultPlanActionDetails += planActionDetailHtml;
    });

    $planActionList.empty();
    $planActionList.append(resultPlanActions);

    $planActionDetailList.empty();
    $planActionDetailList.append(resultPlanActionDetails);
}