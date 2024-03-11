var PORT = process.env.PORT || 8000;

var connect = require('connect');
var serveStatic = require('serve-static');
var http = require('http');
var https = require('https');
var fs = require('fs');

var dirsToServe = [];
dirsToServe.push(__dirname + "/.");     // For serving main index page in this catalog  
dirsToServe.push(__dirname + "/..")     // For serving the examples
dirsToServe.push(__dirname + "/../..")  // For documentation


function setHeaders(res, path) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
}


var connectApp = connect(); 

console.log("CEETRON Envision for Web Examples HttpServer serving files from:");
for (var i = 0; i < dirsToServe.length; i++) {
    console.log("  " + dirsToServe[i]);
    connectApp.use(serveStatic(dirsToServe[i], {"setHeaders": setHeaders}));
}

// HTTP server
console.log("Creating HTTP server on port " + PORT);

webServer = http.createServer(connectApp);

webServer.listen(PORT, function() {
    console.log('HttpServer listening on port ' + PORT + '...');
});
