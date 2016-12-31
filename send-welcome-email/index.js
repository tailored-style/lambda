'use strict'

var http = require('https');
var url = require('url')

var SENDWITHUS_API_KEY = process.env.SENDWITHUS_API_KEY;
var SENDWITHUS_API_BASE_URL = process.env.SENDWITHUS_API_BASE_URL;

const SENDWITHUS_TEMPLATE_ID = "tem_9d6drBShr8HJRYHjBPQDdF4G";

var parseSubscriptionId = function(event) {
	// TEST UPDATE 2016-12-30

    // TODO
    return "e6c8049e-3786-4edc-9b8d-fa34339ff30a";
}

var getSubscriptionData = function(subscriptionId) {
    // TODO
    return {
        name: "Test Customer",
        email: "tobyjsullivan@gmail.com"
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
    
    var subscriptionId = parseSubscriptionId(event);
    var subscription = getSubscriptionData(subscriptionId);
    
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
