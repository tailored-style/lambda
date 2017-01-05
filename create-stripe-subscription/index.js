'use strict';

var http = require('https');
var url = require('url');
var querystring = require('querystring');

var SUBSCRIPTIONS_API_BASE_URL = process.env.SUBSCRIPTIONS_API_BASE_URL;
var STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
var STRIPE_API_BASE_URL = process.env.STRIPE_API_BASE_URL;
var STRIPE_PLAN_ID = process.env.STRIPE_PLAN_ID;

var getMessageData = function(event) {
    console.log("Entering getMessageData");

    var msg = event.Records[0].Sns.Message;
    var parsed = JSON.parse(msg);

    console.log("Parsed message: ", parsed);

    return parsed;
};

var parseSubscriptionId = function(msgData) {
    console.log("Entering parseSubscriptionId");

    return msgData.subscription.id;
};

var getSubscriptionData = function(subscriptionId) {
    console.log("Entering getSubscriptionData");

    var apiUrl = url.resolve(SUBSCRIPTIONS_API_BASE_URL, "subscriptions/"+subscriptionId);
    var parsedUrl = url.parse(apiUrl);
    var reqOptions = {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        path: parsedUrl.path,
        port: parsedUrl.port,
        method: 'GET',
    };

	console.log("Subscriptions API request options:", reqOptions);

    return new Promise(function(fulfill, reject) {
        var req = http.request(reqOptions, (res) => {
            console.log("Recieved a response with code", res.statusCode);
            fulfill(res);
        });

        req.on('error', reject);
        req.end();
    })
    .then(function(res) {
        // Reject on any non-200 response
        if (res.statusCode >= 300) {
            getResponseContent(res);
            throw new Error(`Unexpected status code from Subscriptions Service: ${res.statusCode} ${res.statusMessage}`);
        }

        return res;
    })
    .then(getResponseContent).then(JSON.parse)
    .then((json) => {
        return {
            id: json.id,
            name: json.name,
            email: json.email,
            stripeToken: json.stripeToken
        };
    });
};

var makeStripeRequest = function(path, requestPayload) {
    console.log("Entering makeStripeRequest");

    var apiUrl = url.resolve(STRIPE_API_BASE_URL, path);

    var content = querystring.stringify(requestPayload);
    var parsedUrl = url.parse(apiUrl);
    var reqOptions = {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        path: parsedUrl.path,
        port: parsedUrl.port,
        method: 'POST',
        auth: STRIPE_SECRET_KEY + ':',
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
            'Content-length': Buffer.byteLength(content)
        }
    };
    console.log('Using request options:', reqOptions);
 
    return new Promise(function(fulfill, reject) {
        var req = http.request(reqOptions, (res) => {
            console.log("Recieved a response with code", res.statusCode);
            fulfill(res);
        });

        req.on('error', reject);

        console.log("Sending content:", content);
        req.write(content);

        req.end();
    })   
    .then(function(res) {
        // Reject on any non-200 response
        if (res.statusCode >= 300) {
            getResponseContent(res);
            throw new Error(`Unexpected status code from Stripe: ${res.statusCode} ${res.statusMessage}`);
        }

        return res;
    })
    .then(getResponseContent).then(JSON.parse);
};

// Returns a Promise[object]:
// {
//   customer: {
//     id: "cus_lkadfkas"
//   }
// }
var createCustomer = function(subscription) {
    console.log("Entering createCustomer");

    var requestPayload = {
        'source': subscription.stripeToken,
        'email': subscription.email,
        'description': `Customer for ${subscription.email}`,
        'metadata[tailoredSubscriptionId]': subscription.id
    };

    return makeStripeRequest("customers", requestPayload)
    .then(function(customer) {
        return {
            id: customer.id
        };
    });
};

var getResponseContent = function(res) {
    console.log("Entering getResponseContent");

    return new Promise(function(fulfill, reject) {
        var content = "";
    
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            content += chunk;
        });
        res.on('end', () => {
            console.log("Response content:", content);
            fulfill(content);
        });
        res.on('error', (e) => {
            reject(e);
        });
    });
};

var createSubscription = function(customerId) {
    console.log("Entering createSubscription");

    var requestPayload = {
        'customer': customerId,
        'plan': STRIPE_PLAN_ID
    };

    return makeStripeRequest("subscriptions", requestPayload)
    .then((subscription) => {
        return {
            id: subscription.id
        };
    });
};

exports.handler = (event, context, callback) => {
    console.log("Entering exports.handler");

    console.log("Received event:", JSON.stringify(event));
    
    var msgData = getMessageData(event);
    var subscriptionId = parseSubscriptionId(msgData);

    getSubscriptionData(subscriptionId)
    .then((subscription) => {
        console.log("Received subscription data", JSON.stringify(subscription));
        return createCustomer(subscription);
    })
    .then((stripeCustomer) => {
        console.log("Created Stripe customer", stripeCustomer.id);
        return createSubscription(stripeCustomer.id);
    })
    .then((stripeSubscription) => {
        console.log("Created Stripe Subscription", stripeSubscription.id);
        callback(null, 'Lambda executed');
    })
    .catch((e) => {
        console.log("Got error: " + e.message);
        console.log("Stacktrace: " + e.stack);
        // context.done(null, 'FAILURE');
        callback(null, 'FAILURE');
    });
};
