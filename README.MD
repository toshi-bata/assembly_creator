# Assmbly creator
This demo introduces an unique workflow using HOOPS Communicator  that loads parts from a parts list and constructs an assembly model using mate commands such as collinear, concentric and coplanar.<br>
Created assembly structure can be represented in JSON string and reproduced.<br>
This demo adopts vue.js framework.

## Dependencies
### SDKs in use (version)
- HOOPS Communicator (2024.1.0)

## Setup
### Demo folders
&emsp;+ assembly_creator<br>
&emsp;&emsp;+ css<br>
&emsp;&emsp;+ js<br>
&emsp;&emsp;+ assembly_cretor.html<br>
&emsp;&emsp;+ HttpServer.js<br>
&emsp;&emsp;+ package.json<br>
&emsp;+ src (copy src folder from `Communicator SDK\web_viewer`)<br>

## Demo data
Locate scz files in model_data.zip in you SC folder<br>
i.e.)<br>
&emsp;\<HOOPS Communicator SDK>\quick_start\converted_models\user\sc_models

## Start assemly_creator
1. Launch HTTP server using a command prompt<br>
    `cd …/cloud_modeler`<br>
    `npm install`<br>
    `npm start`<br>
2. Launch your web server and <HOOPS Communicator SDK>\quick_start\start_server.bat
3. Open (using Chrome)<br>
&emsp;http://localhost:8000/assembly_creator.html?viewer=CSR&instance=housing