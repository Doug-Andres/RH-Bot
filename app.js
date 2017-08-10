/* Name: RH Console Bot
*  Company: RobertHalf
*  Creator: Doug Andres
*  Date Created: 7/25/17
*  Last Edited: 8/9/17
*  Bot Framework Emulator Link: http://localhost:3978/api/messages
*  Description: This is a Microsoft Bot written in Node.js that will be hosted on Microsoft Azure. 
*  It's basic functionality is to act like a console, and take in user input that describes whether
*  they want to start or stop an AWS EC2 instance. They can describe the instance based on the instance's
*  'Vertical' tag, its 'instance-id', or a personalized tag called 'MYTAG' with whatever value they set in
*  AWS. The syntax for text entry to describe a request is as follows: 
*  Request Syntax: //rhbot /command (start or stop) /identifier:value (identifiers: MYTAG, vertical, or instance-id)
*  Example Request: //rhbot /start /vertical:ITPASS
*  In this example, they are starting instances with the vertical tag of 'ITPASS'. 
*  Note: The user must always enter in '//awsbot' in the begging.
*/

//import restify, botbuilder, and request resources
var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');

//aws_link class that saves parameters and has a function to build the API call link to AWS Lambda
function aws_Link (sS, vert, instID, mT) {
    this.startStop = sS;
    this.vertical = vert;
    this.instance_ID = instID;
    this.myTag = mT;

    this.api_link = function () {
        var mainLink = "https://7wk54skg8j.execute-api.us-west-2.amazonaws.com/prod/-params?";
        var startFil = "startStop=";
        var vertFil = "vertical=";
        var instFill = "instanceID=";
        var myTagFill = "myTag=";
        var ampersand = "&";
        var completeLink = String(mainLink + startFil + this.startStop + ampersand + vertFil + this.vertical + ampersand + instFill + this.instance_ID + ampersand + myTagFill + this.myTag);
        var finalLink = completeLink;
        finalLink = finalLink.split(' ').join('');

        //set up API-key authenticication
        var options = {
            url: finalLink,
            headers: {
                'x-api-key': 'DwI8KN97tj9byl2LRBagF8GMRCld2OjJ4W4YuIoC'
            }
        };
        request(options); //request link with API-key
    }
}

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

// PRE-DEFINED variable to store the completed API link before requesting it
var completeAPILink = "";


// This is an AWS bot that will turn on or off instances based on an instance name provided by the user. 
var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.send("Welcome to the RobertHalf Amazon Web Services Bot! Note: Values for identifiers are case sensitive.");
        session.send("Syntax: //rhbot /command (start or stop) /identifier:value (identifiers: MYTAG, vertical, or instance-id)");
        session.send("Example: //rhbot /start /vertical:ITPASS");
        builder.Prompts.text(session, "Enter in your command:");
    },
    function (session, results) {
        //take in user response, and pull out information
        userResponse = results.response; //save user response
        var awsBot = userResponse.slice(0,7); //slice out "//rhBot"
        var command = userResponse.slice(8,13); //slice out command: "star" or "stop", ignore the 't' at the end of start
        var identifierIndex = userResponse.indexOf("/", 13); //search for index of single "/" after command
        var identifier = userResponse.slice(identifierIndex, userResponse.length); //slice out identifier
        var indexOfColon = identifier.indexOf(":"); //find index of the ":"
        var key = identifier.slice(1, indexOfColon); //slice out the key
        var value = identifier.slice(indexOfColon + 1, identifier.length); //slice out the value

        //DEBUG STATEMENTS TO SEE IF INFO WAS SLICED OUT OF USER RESPONSE
        /*
        session.send("//rhbot: " + awsBot); //print out slice DEBUG STATEMENT
        session.send("/command: " + command); //print out slice DEBUG STATEMENT
        session.send("/identifier: " + identifier); //print slice DEBUG STATEMENT
        session.send("key: " + key); //DEBUG STATEMENT
        session.send("value: " + value); //DEBUG STATEMEN
        */
        
        //format everything to lowercase EXCEPT value since that is case sensitive
        awsBot = awsBot.toLowerCase();
        command = command.toLowerCase();
        key = key.toLowerCase();

        if(awsBot == "//rhbot") //ensure user entered "//awsbot"
        {
            if(command == "/star") //if user wants to start, then...
            {
                if(key == "mytag") //if key is "MYTAG"
                {
                    var apiLink = new aws_Link("start", "NULL", "NULL", value);
                    completeAPILink = apiLink.api_link();
                    session.send('Request complete.');
                }

                else if(key == "vertical") // else if key is "vertical" //TEST CASE
                {
                    var apiLink = new aws_Link("start", value, "NULL", "NULL");
                    completeAPILink = apiLink.api_link();
                    session.send('Request complete.');
                }

                else if(key == "instance-id") // else if key is "instance-id"
                {
                    var apiLink = new aws_Link("start", "NULL", value, "NULL");
                    completeAPILink = apiLink.api_link();
                    session.send('Request complete.');
                }

                else //else user did not enter in a valid identifier
                {
                    session.send("'" + key + "'" + " isn't a valid identifier - Let's restart.");
                    session.endDialog();
                }
            }

            else if(command =="/stop") //else if user wants to stop, then...
            {
                if(key == "mytag") //if key is "MYTAG"
                {
                    var apiLink = new aws_Link("stop", "NULL", "NULL", value);
                    completeAPILink = apiLink.api_link();
                    session.send('Request complete.');
                }

                else if(key == "vertical") // else if key is "vertical"
                {
                    var apiLink = new aws_Link("stop", value, "NULL", "NULL");
                    completeAPILink = apiLink.api_link();
                    session.send('Request complete.');
                }

                else if(key == "instance-id") // else if key is "instance-id"
                {
                    var apiLink = new aws_Link("stop", "NULL", value, "NULL");
                    completeAPILink = apiLink.api_link();
                    session.send('Request complete.');
                }

                else //else user did not enter in a valid identifier
                {
                    session.send("'" + key + "'" + " isn't a valid identifier - Let's restart.");
                    session.endDialog();
                }
            }

            else //else user did not enter in '/start or /stop'
            {
                session.send("You didn't type '/start' or '/stop' - Let's restart.");
                session.endDialog();
            }
        }

        else //else user did not enter in '//awsbot'
        {
            session.send("You didn't type '//rhbot' - Let's restart.");
            session.endDialog();
        }
    }
]);