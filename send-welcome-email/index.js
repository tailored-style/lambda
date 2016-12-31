'use strict'

var http = require('https');
var url = require('url')

var SENDWITHUS_API_KEY = process.env.SENDWITHUS_API_KEY;
var SENDWITHUS_API_BASE_URL = process.env.SENDWITHUS_API_BASE_URL;

const SENDWITHUS_TEMPLATE_ID = "tem_9d6drBShr8HJRYHjBPQDdF4G";

var getMessageData = function(event) {
    var msg = event.Records[0].Sns.Message;
    var parsed = JSON.parse(msg);

    console.log("Parsed message: ", parsed);

    return parsed;
}

var parseSubscriptionId = function(msgData) {
    return msgData.subscription.id;
}

var getSubscriptionData = function(msgData) {
    return {
        name: msgData.subscription.name,
        email: msgData.subscription.email
    };
}

var sendEmail = function(subscription, onSuccess, onError) {
    var emailUrl = url.resolve(SENDWITHUS_API_BASE_URL, "send")
    var requestPayload = {
        template: SENDWITHUS_TEMPLATE_ID,
        recipient: {
            name: subscription.name,
            address: subscription.email
        },
        sender: {
            name: "Toby @ Tailored",
            address: "tobyjsullivan@gmail.com"
        }
    };
    var content = JSON.stringify(requestPayload);
    
    var parsedUrl = url.parse(emailUrl)
    var reqOptions = {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        path: parsedUrl.path,
        port: parsedUrl.port,
        method: 'POST',
        auth: SENDWITHUS_API_KEY + ':',
        headers: {
            'Content-type': 'application/json',
            'Content-length': Buffer.byteLength(content)
        }
    };
    
    console.log('Using request options:', reqOptions);
    
    var req = http.request(reqOptions, onSuccess);
    
    if (onError !== null) {
        req.on('error', onError);
    }
    
    console.log("Sending content:", content);
    req.write(content);
    
    req.end();
}

exports.handler = (event, context, callback) => {
    console.log("Received event:", JSON.stringify(event));
    
    var msgData = getMessageData(event);
    var subscriptionId = parseSubscriptionId(msgData);
    var subscription = getSubscriptionData(msgData);
    
    // Send email via sendwithus
    sendEmail(subscription, function(res) {
        console.log("Got response: " + res.statusCode);
        
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
        });
        res.on('end', () => {
            console.log('No more data in response.');
        });
        // context.succeed();
        
        callback(null, 'Lambda executed');
    }, function(e) {
        console.log("Got error: " + e.message);
        // context.done(null, 'FAILURE');
        callback(null, 'FAILURE');
    });
};
