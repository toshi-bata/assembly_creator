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
&emsp;&emsp;+ parts<br>
&emsp;&emsp;+ assembly_cretor.html<br>
&emsp;&emsp;+ HttpServer.js<br>
&emsp;&emsp;+ package.json<br>
&emsp;+ src (copy src folder from `Communicator SDK\web_viewer`)<br>

### Parts
Part SCS files and PNG images are located in the `parts` folder with `parts_list.json`

## Start assemly_creator
1. Launch HTTP server using a command prompt<br>
    `cd …/cloud_modeler`<br>
    `npm install`<br>
    `npm start`<br>
2. Open (using Chrome)<br>
&emsp;http://localhost:8000/assembly_creator.html?viewer=SCS&instance=housing