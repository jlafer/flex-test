# ixngen-cust

This project is the "customer" component that supports Flex UI and Insights testing. It provides the client that simulates the customer when executing a suite of Flex test cases. The server side of the tool (`ixngen`) is a server app that executes the test suite, sending inbound tasks to this and other clients.

The `ixngen` server and the clients communicate and coordinate the execution of the test suite via a Sync map. This allows the clients, for example, to let ixngen other clients know when they put a call on hold or when an agent has changed state. Conversely, ixngen uses the Sync map to pass test case definitions to the clients and instruct them to take actions, such as to dial a call.


## Configuration
The program uses the `dotenv` package for configuring its execution environment. Copy .env.example to .env and edit the values to match your environment.

## Installation

    Clone or download this repo into a new folder.
    npm install

## Execution Pre-requisites
This program registers call status webhooks with Twilio Programmable Voice. For Twilio to access these webhook endpoints, this program must open a publicly-accessible IP address and port. This can be accomplished by running an instance of `ngrok` on your development/testing machine. If you use `ngrok`, remember to note the port opened up by this program, as configured above with the `PORT` environment variable. 

## Execution
`node src/index.js` 