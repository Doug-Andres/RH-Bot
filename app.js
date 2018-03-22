/* Name: RH Console Bot
*  Company: RobertHalf
*  Creator: Doug Andres
*  Date Created: 7/25/17
*  Last Edited: 12/6/17
*  Bot Framework Emulator Link: http://localhost:3978/api/messages
*  Description: This is a Microsoft Bot written in Node.js that is hosted in Microsoft Azure. 
*  It's basic functionality is to act like a console, and take in user input that describes whether
*  they want to start, stop, or ping an AWS EC2 instance. They can describe the instance based on the instance's
*  'Vertical' tag, its 'instance-id', a personalized tag called 'MYTAG' with whatever value they set in
*  AWS, or they can pass in two 'MYTAG' keys into the 'sequence' option and AWS will start up those instances
*  in that order with a 5 minute wait time in between to allow time for the instances to completely start up. 

*  The syntax for text entry to describe a request is as follows: 
*  Request Syntax: //rhbot /command (start, stop, or ping) /identifier:value (identifiers: MYTAG, vertical, or instance-id)

*  Example Requests: 
*       //rhbot /start /vertical:ITPASS
*       //rhbot /start /instance-id:123ABC
*       //rhbot /start /mytag:testServer1
*       //rhbot /start /sequence:(firstInstance,secondInstance)
*       //rhbot /ping /mytag:value

*  Note: The user must always enter in '//rhbot' in the begging.
*/

//import restify, botbuilder, and request resources
var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');
var async = require('async');

var i_state; //varaible that stores the instace state
var i_status; //variable that stores if the instance passed the system checks or not

//aws_link class that saves parameters and has a function to build the API call link to AWS Lambda
function aws_Link (sS, vert, instID, mT, seq, first, second, ping_1) {
    this.startStop = sS;
    this.vertical = vert;
    this.instance_ID = instID;
    this.myTag = mT;
    this.sequence = seq;
    this.firstInst = first;
    this.secondInst = second;
    this.ping = ping_1;
    this.instance_state;
    this.instance_status;
    this.IOT = 'NULL';
    this.iotMSG = 'NULL';

    this.api_link = function () {
        var mainLink = "https://7gd59wu8l7.execute-api.us-west-2.amazonaws.com/prod/params?";
        var startFill = "startStop=";
        var vertFill = "vertical=";
        var instFill = "instanceID=";
        var myTagFill = "myTag=";
        var sequenceFill = "sequence=";
        var ampersand = "&";
        var firstInstFill = "firstInstance=";
        var secondInstFill = "secondInstance=";
        var pingFill = "ping=";
        var iotFill = "iot=";
        var iotMSGFill = "iotMSG=";
        var completeLink = String(mainLink + startFill + this.startStop + ampersand + vertFill + this.vertical + ampersand + instFill + this.instance_ID + ampersand + myTagFill + this.myTag + ampersand + sequenceFill + this.sequence + ampersand + firstInstFill + this.firstInst + ampersand + secondInstFill + this.secondInst + ampersand + pingFill + this.ping + ampersand + this.iotFill + this.iot + ampersand + this.iotMSGFill + this.iotMSG);
        var finalLink = completeLink;
        finalLink = finalLink.split(' ').join('');

        //set up API-key authenticication
        var options = {
            url: finalLink,
            headers: {
                'x-api-key': 'ity6dCLcyw8mXmNMKp5ISrlYsmjWogvMK5aYGZg0'
            }
        };

        if(this.ping != "TRUE") { // if the user wants do do anything except /ping
            request(options);
        }

        else if(this.ping == "TRUE") { // if the user wants to use /ping
            var res = request(options, function(error, response, body) {
                body = JSON.parse(body);
                i_state = body['instanceState'];
                i_status = body['instanceStatus'];
                this.instance_state = i_state; 
                this.instance_status = i_status;
            });
            setTimeout(this.pingFunction, 5000); // timout to allow time for response to get back
        }
    };

    this.pingFunction = function () { // just used to call for the 'setTimout', actual return comes from api_link
        return "Instance State: " + i_state + " Instance Status: " + i_status; //
    }; 
}

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Bot Framework Credentials
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

// This is an RH bot that will turn on or off instances in AWS based on an instance name provided by the user. 
var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.send("Welcome to the RobertHalf Amazon Web Services Bot! Note: Values for identifiers are case sensitive.");
        session.send("Syntax: //rhbot /command (start, stop, or ping) /identifier:value (identifiers: mytag, instance-id, or sequence:(mytag_of_first_instance,mytag_of_second_instance | Note: Ping only uses 'mytag')");
        session.send("Example: //rhbot /start /mytag:exampleMyTag | //rhbot /start /instance-id:123ABC | //rhbot /start /sequence:(myserver1,myserver2) | //rhbot /ping /mytag:exampleMyTag");
        builder.Prompts.text(session, "Enter in your command:");
    },
    function (session, results) {
        //take in user response, and pull out information
        userResponse = results.response; //save user response
        var rhBot = userResponse.slice(0,7); //slice out "//rhBot"
        var command = userResponse.slice(8,13); //slice out command: "star" or "stop", ignore the 't' at the end of start
        var identifierIndex = userResponse.indexOf("/", 13); //search for index of single "/" after command
        var identifier = userResponse.slice(identifierIndex, userResponse.length); //slice out identifier
        var indexOfColon = identifier.indexOf(":"); //find index of the ":"
        var key = identifier.slice(1, indexOfColon); //slice out the key
        var value, first_instnace, second_instance; //declare value variable, & first and second instance variables

        //DEBUG STATEMENTS TO SEE IF INFO WAS SLICED OUT OF USER RESPONSE
        /*
        session.send("//rhbot: " + rhBot); //print out slice DEBUG STATEMENT
        session.send("/command: " + command); //print out slice DEBUG STATEMENT
        session.send("/identifier: " + identifier); //print slice DEBUG STATEMENT
        session.send("key: " + key); //DEBUG STATEMENT
        */

        //format everything to lowercase EXCEPT value since that is case sensitive
        rhBot = rhBot.toLowerCase();
        command = command.toLowerCase();
        key = key.toLowerCase();

        if(key != "sequence") {
            value = identifier.slice(indexOfColon + 1, identifier.length);
            //session.send("value: " + value); //DEBUG STATEMENT
        }

        //if user wants to enter a sequence, collect the remaining information
        else if(key == "sequence") {
            var indexOfFirstParentheses = userResponse.indexOf("(");
            var indexOfSecondParentheses = userResponse.indexOf(")");
            var indexOfComma = userResponse.indexOf(",");
            first_instnace = userResponse.slice(indexOfFirstParentheses + 1, indexOfComma);
            second_instance = userResponse.slice(indexOfComma + 1, indexOfSecondParentheses);
            //session.send("First Instance: " + first_instnace); //DEBUG STATEMENT
            //session.send("Second Instance: " + second_instance); //DEBUG STATEMENT
        }

        if(rhBot == "//rhbot") //ensure user entered "//rhBot"
        {
            if(command == "/ping") //if command is ping
            {
                if(key == "mytag") // key must be 'mytag'
                {
                    var apiLink = new aws_Link("NULL", "NULL", "NULL", value, "NULL", "NULL", "NULL", "TRUE");
                    session.send("Gathering info...");
                    async.series({
                        one: function(callback) {
                            setTimeout(function() {
                                completeAPILink = apiLink.api_link();
                                callback(null, 1);
                            }, 100);
                        },
                        two: function(callback){
                            setTimeout(function() {
                                session.send('Request complete.')
                                session.send('Instance State: ' + i_state);
                                session.send('Status Checks: ' + i_status);
                                callback(null, 2);
                            }, 2000);
                        }
                    }, function(err, results) {
                        // error catch
                    });
                }

                else
                {
                    session.send("You must specify the 'mytag' value of the instance you would like to ping. - Let's restart.");
                }
            }

            else if(command == "/star") //if user wants to start, then...
            {
                if(key == "mytag") //if key is "MYTAG"
                {
                    var apiLink = new aws_Link("start", "NULL", "NULL", value, "NULL", "NULL", "NULL", "NULL");
                    completeAPILink = apiLink.api_link();
                    session.send('Request complete.');
                }

                /*
                else if(key == "vertical") // else if key is "vertical" DISABLED VERTICAL FUNCTIONALITY
                {
                    var apiLink = new aws_Link("start", value, "NULL", "NULL");
                    completeAPILink = apiLink.api_link();
                    session.send('Request complete.');
                }
                */

                else if(key == "sequence") // else if key is "sequence"
                {
                    var apiLink = new aws_Link("start", "NULL", "NULL", "NULL", "TRUE", first_instnace, second_instance, "NULL");
                    completeAPILink = apiLink.api_link();
                    session.send('Request complete.');
                }

                else if(key == "instance-id") // else if key is "instance-id"
                {
                    var apiLink = new aws_Link("start", "NULL", value, "NULL", "NULL", "NULL", "NULL", "NULL");
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
                    var apiLink = new aws_Link("stop", "NULL", "NULL", value, "NULL", "NULL", "NULL", "NULL");
                    completeAPILink = apiLink.api_link();
                    session.send('Request complete.');
                }

                /*
                else if(key == "vertical") // else if key is "vertical" DISABLED VERTICAL FUNCTIONALITY
                {
                    var apiLink = new aws_Link("stop", value, "NULL", "NULL");
                    completeAPILink = apiLink.api_link();
                    session.send('Request complete.');
                }
                */

                else if(key == "sequence") // else if key is "sequence"
                {
                    var apiLink = new aws_Link("stop", "NULL", "NULL", "NULL", "TRUE", first_instnace, second_instance, "NULL");
                    completeAPILink = apiLink.api_link();
                    session.send('Request complete.');
                }

                else if(key == "instance-id") // else if key is "instance-id"
                {
                    var apiLink = new aws_Link("stop", "NULL", value, "NULL", "NULL", "NULL", "NULL", "NULL");
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

        else //else user did not enter in '//rhbot'
        {
            session.send("You didn't type '//rhbot' - Let's restart.");
            session.endDialog();
        }
    } 
]); 
