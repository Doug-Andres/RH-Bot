var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});


process.env.MICROSOFT_APP_ID = "4e25f649-420c-440f-b590-b281981f0bb7";
process.env.MICROSOFT_APP_PASSWORD = "HGMQNeehonCbqym7vRT6Bby";


// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// PRE-DEFINED Variables
var lowerCaseHolder = "";
var masterAPILink = "https://7wk54skg8j.execute-api.us-west-2.amazonaws.com/prod/-params?";
var APIparams = "";
var completeAPILink = "";

// This is an AWS bot that will turn on or off instances based on an instance name provided by the user. 
var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.send("Welcome to the RobertHalf Amazon Web Services Bot!");
        builder.Prompts.text(session, "Would you like to start or stop instances today? (Answers: start or stop)");
    },
    function (session, results) {
        lowerCaseHolder = results.response;
        session.dialogData.startOrStop = lowerCaseHolder.toLowerCase();
        if (session.dialogData.startOrStop == "start" || session.dialogData.startOrStop == "stop") {
            builder.Prompts.text(session, "How would you like to " + session.dialogData.startOrStop + " the instance, via its vertical tag or instance ID? (Answers: vertical or id)");
        }
        else {
            session.send("Looks like you entered something invalid, lets try this again!");
            session.endDialog();
        }
    },
    function (session, results) {
        lowerCaseHolder = results.response;
        session.dialogData.verticalOrId = lowerCaseHolder.toLowerCase();
        if (session.dialogData.verticalOrId == "vertical") {
            builder.Prompts.text(session, "What is the name of the vertical for the instance you would like to target? NOTE: This is CASE SENSITIVE! (Example Answer: ITPASS)");
        }
        else if (session.dialogData.verticalOrId == "id") {
            builder.Prompts.text(session, "What is the instance ID for the instance you would like to target? NOTE: This is CASE SENSITIVE! (Example Anser: 'i-055874d73ef0e5f40')");
        }
        else {
            session.send("Looks like you entered something invalid, lets try this again!");
            session.endDialog();
        }
    },
    function (session, results) {
        session.dialogData.verticalOrIdName = results.response;
        builder.Prompts.text(session, "Lets Confirm your request before I complete it. You would like to " + session.dialogData.startOrStop + " the instance with the " + session.dialogData.verticalOrId + ": " + session.dialogData.verticalOrIdName + "? Is this correct? (Answers: yes or no)");
    },
    function (session, results) {
        lowerCaseHolder = results.response;
        session.dialogData.confirmation = lowerCaseHolder.toLowerCase();
        if (session.dialogData.confirmation == "yes") {
            session.send("Ok! I'll do that for you right away!");
                if (session.dialogData.verticalOrId == "vertical") {
                    APIparams = "startStop=" + session.dialogData.startOrStop + "&vertical=" + session.dialogData.verticalOrIdName + "&instanceID=NULL";
                    completeAPILink = masterAPILink + APIparams;
                    request(completeAPILink);
                }
                else if (session.dialogData.verticalOrId == "id") {
                    APIparams = "startStop=" + session.dialogData.startOrStop + "&vertical=NULL" + "&instanceID=" + session.dialogData.verticalOrIdName;
                    completeAPILink = masterAPILink + APIparams;
                    request(completeAPILink);
                }
        }
        else if (session.dialogData.confirmation == "no") {
            builder.Prompts.text(session, "I'm sorry, let's run through this again!");
            session.endDialog();
        }
        else {
            session.send("Looks like you entered something invalid, lets try this again!");
            session.endDialog();
        }
    }
]);
