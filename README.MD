# HOOPS Visualize Web Assmbly Creator
This demo introduces a unique workflow using HOOPS Visualize Web that loads parts from a parts list and constructs an assembly model using custom mate operators such as collinear, concentric and coplanar. This workflow can be utilized across various industries including maintenance manuals, work instructions and e-commerce (custom orders).<br>  
The created assembly structure can be represented as a JSON string and reproduced.

## Dependencies
### SDKs in use (version)
- HOOPS Visualize Web (2026.2.0)

## Setup
### Demo folders
```
root
├── assembly_creator/
│   ├── css/
│   ├── js/
│   ├── jstree/
│   ├── parts/
│   ├── assembly_cretor.html
│   ├── HttpServer.js
│   └── package.json
├── demo-app/               # copy from HVW SDK/web_viewer
├── hoops-web-viewer.mjs    # copy from HVW SDK/web_viewer
└── engine.esm.wasm         # copy from Visualize Web SDK/web_viewer
```

### Parts
Part SCS files and PNG images are located in the `parts` folder with `parts_list.json`

## Start assemly_creator
1. Launch HTTP server using a command prompt<br>
    `npm install`<br>
    `npm start`<br>
2. Open in Chrome<br>
&emsp;http://localhost:8000/assembly_creator.html?viewer=SCS&instance=housing
