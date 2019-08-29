'use strict';

const AWS = require('aws-sdk');
const codedeploy = new AWS.CodeDeploy({apiVersion: '2014-10-06'});
var lambda = new AWS.Lambda();

exports.handler = (event, context, callback) => {

	console.log("Entering PreTraffic Hook!");
	console.log(event);

	
	// Read the DeploymentId & LifecycleEventHookExecutionId from the event payload
    var deploymentId = event.DeploymentId;
	var lifecycleEventHookExecutionId = event.LifecycleEventHookExecutionId;

	var functionToTest = process.env.NewVersion;
	console.log("Testing new function version: " + functionToTest);

	// Perform validation of the newly deployed Lambda version
	var lambdaParams = {
		FunctionName: functionToTest,
		InvocationType: "RequestResponse",
	Payload: new Buffer('{ "body": "Call now and get 80% discount on your next pair of shoes! Call 8003344555!", "httpMethod": "POST"	}')	};

	var lambdaResult = 'Failed'

	lambda.invoke(lambdaParams, function(err, data) {
		if (err){	// an error occurred
			console.log(err, err.stack);
			lambdaResult = "Failed";
		}
		else{	// successful response
			var result = JSON.parse(data.Payload);
			console.log("Result: " +  JSON.stringify(result));

			if (result['statusCode'] == 200) {
				lambdaResult = "Succeeded";
			}
			else {
				lambdaResult = "Failed";	
			}

			// Check the response for valid results
			// The response will be a JSON payload with statusCode and body properties. ie:
			// {
			//		"statusCode": 200,
			//		"body": 51
			// }
			
			// Complete the PreTraffic Hook by sending CodeDeploy the validation status
			var params = {
				deploymentId: deploymentId,
				lifecycleEventHookExecutionId: lifecycleEventHookExecutionId,
				status: lambdaResult // status can be 'Succeeded' or 'Failed'
			};
			
			// Pass AWS CodeDeploy the prepared validation test results.
			codedeploy.putLifecycleEventHookExecutionStatus(params, function(err, data) {
				if (err) {
					// Validation failed.
					console.log('CodeDeploy Status update failed');
					console.log(err, err.stack);
					callback("CodeDeploy Status update failed");
				} else {
					// Validation succeeded.
					console.log('Codedeploy status updated successfully');
					callback(null, 'Codedeploy status updated successfully');
				}
			});
		}  
	});
}
