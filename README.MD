# Assmbly creator

## Dependencies
### SDKs in use (version)
- HOOPS Communicator (2024)

## Setup
### Demo folders
&emsp;+ assembly_creator
&emsp;&emsp;+ css<br>
&emsp;&emsp;+ js<br>
&emsp;&emsp;+ src (copy src folder from `Communicator SDK\web_viewer`)<br>
&emsp;&emsp;+ assembly_cretor.html<br>
&emsp;&emsp;+ HttpServer.js<br>
&emsp;&emsp;+ package.json<br>

## Demo data
Locate scz files in model_data.zip in you SC folder<br>
i.e.
&emsp;\<HOOPS Communicator SDK>\quick_start\converted_models\user\sc_models

## Start assemly_creator
1. Launch HTTP server using a command prompt<br>
    `cd …/cloud_modeler`<br>
    `npm install`<br>
    `npm start`<br>
2. Launch your web server and <HOOPS Communicator SDK>\quick_start\start_server.bat
3. Open (using Chrome)<br>
http://localhost:8000/assembly_cretor.html?viewer=CSR&instance=housing