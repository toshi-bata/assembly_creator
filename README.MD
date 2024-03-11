# HOOPS Communicator Assmbly Creator
This demo introduces an unique workflow using HOOPS Communicator that loads parts from a parts list and constructs an assembly model using custom mate operators such as collinear, concentric and coplanar. This workflow can be utilized in various industries such as maintenance manual, work instruction or e-commerce (custom order), etc.<br>  
The created assembly structure can be represented in a  JSON string and reproduced.

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
