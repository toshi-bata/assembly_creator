import * as Communicator from "../hoops-web-viewer.mjs";
import { createViewer } from "./create_viewer.js";
import { HandleOperatorOperator } from "./handle_operator_operator.js";
import { CollinearMateOperator } from "./collinear_mate_operator.js";
import { ConcentricMateOperator } from "./concentric_mate_operator.js";
import { CoplanarMateOperator } from "./coplanar_mate_operator.js";
import { PartDragDropOperator } from "./part_drag_drop_operator.js";
import { ModelTree } from "./model_tree.js";
export class Main {
    constructor() {
        this._viewer;
        this._handleOpOp;
        this._handleOpOpHandle;
        this._partDropOp;
        this._partDropOpHandle;
        this._collinearOp;
        this._collinearOpHandle;
        this._concentricOp;
        this._concentricOpHandle;
        this._coplanarOp;
        this._coplanarOpHandle;
        this._modelTree;
        this._historys = new Array(),
        this._currentHistory = -1,
        this._scNameMap = {};
        this._partNodes = new Array;
    }

    start (viewerMode, modelName, reverseProxy) {
        this.createViewer(viewerMode, modelName, reverseProxy);
        this.initEvents();
    }

    createViewer(viewerMode, modelName, reverseProxy) {
        const scsFileName = "../parts/" + modelName + ".scs"
        createViewer(viewerMode, scsFileName, "container", reverseProxy).then((hwv) => {
            this._viewer = hwv;

            this._viewer.setCallbacks({
                sceneReady: () => {
                    // Show Triad
                    this._viewer.view.getAxisTriad().enable();
                    this._viewer.view.setBackgroundColor(new Communicator.Color(179, 204, 255), new Communicator.Color(255, 255, 255));
                },
                modelStructureReady: () => {
                    this._modelTree = new ModelTree(this._viewer, "#tree", this);

                    const root = this._viewer.model.getAbsoluteRootNode();
                    this._modelTree.createRoot("Model", String(root));

                    let nodeIds = this._viewer.model.getNodeChildren(root);
                    if (0 < nodeIds.length) {
                        this._modelTree.addNode(modelName, String(nodeIds[0]), true);

                        const nodeName = this._viewer.model.getNodeName(nodeIds[0]);
                        this._scNameMap[nodeName] = modelName;
                        
                        this.createJson();
                    }
                },
                selectionArray: (selectionEvents) => {
                    if (0 == selectionEvents.length) {
                        return;
                    }

                    const id = this._viewer.operatorManager.indexOf(this._handleOpOpHandle);
                    if (-1 != id) {
                        // Show handle
                        const selectionEvent = selectionEvents.pop();
                        const selectionType = selectionEvent.getType();
                        if (selectionType != Communicator.SelectionType.None) {
                            const selection = selectionEvent.getSelection();
                            const selectedNode = this.getPartNodeId(selection.getNodeId());
                
                            // Show handle
                            this._handleOpOp.addHandle(selectedNode);
                        }
                    }
                },
                handleEventEnd: (event, nodeIds, initialMatrices, newMatrices) => {
                    if (-1 != this._viewer.operatorManager.indexOf(this._handleOpOpHandle)) {
                        const root = this._viewer.model.getAbsoluteRootNode();
                        let partNode = this.getPartNodeId(nodeIds[0]);

                        const history = {
                            type: "transform",
                            nodeId: partNode,
                            initialMatrix: initialMatrices[0],
                            newMatrix: newMatrices[0],
                        }
                        this.createHistory(history);
                    }
                },
            });

            // Register custom operators
            let handleOp = this._viewer.operatorManager.getOperator(Communicator.OperatorId.Handle);
            let handleOpHandle = Communicator.OperatorId.Handle;
            this._handleOpOp = new HandleOperatorOperator(this._viewer, handleOp, handleOpHandle);
            this._handleOpOpHandle = this._viewer.operatorManager.registerCustomOperator(this._handleOpOp);

            this._partDropOp = new PartDragDropOperator(this._viewer, this);
            this._partDropOpHandle = this._viewer.operatorManager.registerCustomOperator(this._partDropOp);

            this._collinearOp = new CollinearMateOperator(this._viewer, "instruction", "flipBtn", this);
            this._collinearOpHandle = this._viewer.operatorManager.registerCustomOperator(this._collinearOp);
            
            this._concentricOp = new ConcentricMateOperator(this._viewer, "instruction", "flipBtn", "rotateToolbar", "slideToolbar", this);
            this._concentricOpHandle = this._viewer.operatorManager.registerCustomOperator(this._concentricOp);

            this._coplanarOp = new CoplanarMateOperator(this._viewer, "instruction", "flipBtn", "slideToolbar", this);
            this._coplanarOpHandle = this._viewer.operatorManager.registerCustomOperator(this._coplanarOp);

            this._viewer.start();

            this._viewer.operatorManager.push(this._handleOpOpHandle);
            this._viewer.operatorManager.push(this._partDropOpHandle);
        });
    }

    initEvents() {
        let resizeTimer;
        let interval = Math.floor(1000 / 60 * 10);
        $(window).resize(() => {
        if (resizeTimer !== false) {
            clearTimeout(resizeTimer);
        }
        resizeTimer = setTimeout(() => {
            this._viewer.resizeCanvas();
        }, interval);
        });

        // Layout container
        const winHeight = $(window).innerHeight();
        const toolbarHeight = 41.6;
        const footerHeight = $("#footer").height();
        const jsonTxtHeight = $("#assemblyJson").height();
        const jsonBtnHeight = $("#jsonBtns").height();

        const h = winHeight - toolbarHeight - jsonTxtHeight - jsonBtnHeight - 20;
        $('#container').height(h);

        const winW = $(window).width() - 4;
        if (600 < winW) {
            const panelW = winW / 6 * 2;
            if(300 < panelW) {
                $('#container').width(winW - 300);
            }
        }

        $('#container').resizable({
            minHeight: 330,
            minWidth: 400
        });

        // Create parts list
        const url = "parts/parts_list.json";
        $.getJSON(url, (data) => {
            if (data.parts) {
                const partsList = data.parts;
                for (let part of partsList) {
                    const image = new Image();
                    image.src = "parts/" + part.name + ".png";

                    let $ele = $('<div />', {class:'partsList_thumbnail',title:part.name,'data-model':part.name});
                    // $($ele[0]).data('model', part.name);
                    $($ele).append(image);

                    $('.partsList').append($ele);
                }
                // Set event handler
                $('.partsList_thumbnail').on('mousedown', (e) => {
                    const partName = e.currentTarget.dataset.model;
                    this._partDropOp.setPart(partName);
                    e.preventDefault();
                });
            }
            else {
                this.isError = true;
                this.message = 'Fail to load part list.';
            }
        });

        // Command
        $(".toolbarBtn").on("click", (e) => {
            let command = $(e.currentTarget).data("command");

            if (-1 != this._viewer.operatorManager.indexOf(this._handleOpOpHandle)) {
                this._handleOpOp.removeHandles();
            }
            
            this._viewer.selectionManager.clear();

            let on;
            if ($(e.currentTarget).hasClass('toggleBtn')) {
                on = $(e.currentTarget).data("on");

                this.resetCommands();

                if (false == on) {
                    this._viewer.operatorManager.clear();
                    this._viewer.operatorManager.push(Communicator.OperatorId.Navigate);

                    $(e.currentTarget).data("on", true).css("background-color", "indianred");
                }
            }

            // Delete existing measurement items
            this._viewer.measureManager.removeAllMeasurements();

            switch (command) {
                case "home":
                    this._viewer.view.resetCamera();                    
                    break;
                case "undo":
                    this.resetCommands();
                    this.undo();                    
                    break;
                case "redo":
                    this.resetCommands();
                    this.redo();                    
                    break;
                case "collinear":
                    if (false == on) {
                        this._viewer.operatorManager.push(this._collinearOpHandle);
                        this._viewer.operatorManager.push(this._partDropOpHandle);
                        this._collinearOp.init();
                    }
                    break;
                case "concentric":
                    if (false == on) {
                        this._viewer.operatorManager.push(this._concentricOpHandle);
                        this._viewer.operatorManager.push(this._partDropOpHandle);
                        this._concentricOp.init();
                    }
                    break;
                case "coplanar":
                    if (false == on) {
                        this._viewer.operatorManager.push(this._coplanarOpHandle);
                        this._viewer.operatorManager.push(this._partDropOpHandle);
                        this._coplanarOp.init();
                    }
                    break;
                case "measureDistance":
                    if (false == on) {
                        // Set MeasureEdgeLength operator
                        this._viewer.operatorManager.clear();
                        this._viewer.operatorManager.push(Communicator.OperatorId.Navigate);
                        this._viewer.operatorManager.push(Communicator.OperatorId.MeasureFaceFaceDistance);
                    }
                    break;

                default:
                    break;
            }
        });

        // Command dialog buttons
        $(".dialogBtn").on("click", (e) => {
            let command = $(e.currentTarget).data("command");
            const roAng =  Number($(`#rotateAng`).val());
            const dist =  Number($(`#slideDistance`).val());

            let mateOp = undefined;
            if (-1 != this._viewer.operatorManager.indexOf(this._collinearOpHandle)) {
                mateOp = this._collinearOp;
            }
            else if (-1 != this._viewer.operatorManager.indexOf(this._concentricOpHandle)) {
                mateOp = this._concentricOp;
            }
            else if (-1 != this._viewer.operatorManager.indexOf(this._coplanarOpHandle)) {
                mateOp = this._coplanarOp;
            }

            if (undefined == mateOp) return;

            switch (command) {
                case "flip":
                    mateOp.flipMate();                    
                    break;
                case "rotateM":
                    mateOp.rotate(-roAng);                    
                    break;
                case "rotateP":
                    mateOp.rotate(roAng);                    
                    break;
                case "slideM":
                    mateOp.slide(-dist);                    
                    break;
                case "slideP":
                    mateOp.slide(dist);                    
                    break;
                case "reverseDir":
                    mateOp.slide(dist);                    
                    break;
                default:
                    break;
            }
        });

        $("#copyJsonBtn").on("click", (e) => {
            const jsonStr = $("#assemblyJson").val();

            let copyFrom = document.createElement("textarea");
            copyFrom.textContent = jsonStr;

            const bodyElm = document.getElementsByTagName("body")[0];
            bodyElm.appendChild(copyFrom);

            copyFrom.select();
            document.execCommand('copy');

            bodyElm.removeChild(copyFrom);
        });

        $("#loadJsonBtn").on("click", (e) => {
            const jsonStr = $("#assemblyJson").val();
            this._loadJson(jsonStr);
        });

        $('#instruction').html("Drag a thumbnail from the part list and drop on the viewer");

        $(window).resize(() => {
            this.layoutPage();
        });

        this.layoutPage();
    }

    layoutPage() {
        if (undefined != this._viewer) this._viewer.resizeCanvas();

        const winWidth = $(window).innerWidth();
        const winHeight = $(window).innerHeight();
        const toolbarHeight = 41.6;
        const conOffset = $("#container").offset();
        const conWidth = $('#container').innerWidth();
        const conHeight = $('#container').innerHeight();
        const footerHeight = $("#footer").height();
        const jsonBtnHeight = $("#jsonBtns").height();
        
        $('#assemblyJson').width(conWidth);
        const h = winHeight - toolbarHeight - conHeight - jsonBtnHeight - 20;
        $('#assemblyJson').height(h);

        $(".partsList").offset({ 
            top: conOffset.top + 5,
            left: conOffset.left + conWidth + 5 
        });
        $(".partsList").width(winWidth - conWidth - 10);
        $(".partsList").height(winHeight - toolbarHeight - footerHeight - 10)

        const treeWidth = $('#tree1').innerWidth();
        $("#tree1").offset({
            top: conOffset.top + 25,
            left: conOffset.left + conWidth - treeWidth - 5
        });
        $('#tree1').css('height', 'auto');
        const treeHeight =  $('#tree1').height();
        if (conHeight < treeHeight + 50) {
            $('#tree1').height(conHeight - 50);
        }

        $('#instruction').offset({
            top: conOffset.top + conHeight - 20,
            left: 10
        });

        $('#loadingImage').offset({
            top: conOffset.top + conHeight / 2,
            left: conOffset.left + conWidth / 2
        });
    }

    resetCommands() {
        if (-1 != this._viewer.operatorManager.indexOf(this._collinearOpHandle)) {
            this._collinearOp.reset();
        }
        else if (-1 != this._viewer.operatorManager.indexOf(this._concentricOpHandle)) {
            this._concentricOp.reset();
        }
        else if (-1 != this._viewer.operatorManager.indexOf(this._coplanarOpHandle)) {
            this._coplanarOp.reset();
        }
        else if (-1 != this._viewer.operatorManager.indexOf(this._handleOpOpHandle)) {
            this._handleOpOp.reset();
        }

        $('.cmdToggleBtn').data("on", false).css("background-color", "floralWhite");

        $('.toggleBtn').data("on", false).css("background-color", "floralWhite");
        $('#instruction').html("Drag a thumbnail from the part list and drop on the viewer");


        this._viewer.operatorManager.clear();
        this._viewer.operatorManager.push(Communicator.OperatorId.Navigate);
        this._viewer.operatorManager.push(Communicator.OperatorId.Select);
        this._viewer.operatorManager.push(Communicator.OperatorId.Handle);
        this._viewer.operatorManager.push(this._handleOpOpHandle);
        this._viewer.operatorManager.push(this._partDropOpHandle);
    }

    getPartNodeId(childNode) {
        const root = this._viewer.model.getAbsoluteRootNode();
        let parentNode = childNode;
        do {
            for (let i = 0; i < this._partNodes.length; i++) {
                if (parentNode == this._partNodes[i]) {
                    return this._partNodes[i];
                }
            }
            parentNode = this._viewer.model.getNodeParent(parentNode)                
        } while (root != parentNode);
        return childNode;
    }

    createHistory(history) {
        this._currentHistory++;

        if (this._currentHistory < this._historys.length) {
            this._historys.splice(this._currentHistory)
        }

        this._historys.push(history);

        // Enable Undo button control
        $('[data-command="undo"]').prop("disabled", false).css("background-color", "floralWhite");

        this.createJson();

    }

    updateLastHistoryMatrices(newMatrices) {
        let history = this._historys[this._currentHistory];
        if ("transform" == history.type) {
            history.newMatrix = newMatrices[0];
            this.createJson();
        }
    }

    undo() {
        if (-1 < this._currentHistory) {
            let targetHistory = this._historys[this._currentHistory];

            if ('transform' == targetHistory.type) {
                this._viewer.model.setNodeMatrix(targetHistory.nodeId, targetHistory.initialMatrix);
            }
            else if ('addPart' == targetHistory.type) {
                let nodeId = targetHistory.nodeId;
                this._viewer.model.deleteNode(nodeId).then(() => {
                    this._modelTree.deleteNode(String(nodeId));
                });
            }
            this._currentHistory--;

            // Enable Redo button control
            $('[data-command="redo"]').prop("disabled", false).css("background-color", "floralWhite");
            
            // Disable Undo button
            if (0 > this._currentHistory) {
                $('[data-command="undo"]').prop("disabled", true).css("background-color", "darkgrey");
            }
            this.createJson();
        }
    }

    redo() {
        if (this._currentHistory < this._historys.length - 1) {
            this._currentHistory++;
            let targetHistory = this._historys[this._currentHistory];

            if ('transform' == targetHistory.type) {
                this._viewer.model.setNodeMatrix(targetHistory.nodeId, targetHistory.newMatrix);
            }
            else if ('addPart' == targetHistory.type) {
                const partName = targetHistory.partName;
                const scsFileName = "parts/" + partName + ".scs";
                const matrix = targetHistory.matrix;

                // Load the part
                const root = this._viewer.model.getAbsoluteRootNode();
                let config = new Communicator.LoadSubtreeConfig();
                this._viewer.model.loadSubtreeFromScsFile(root, scsFileName, config).then((nodeIds) => {
                    const oldId = targetHistory.nodeId;
                    targetHistory.nodeId = nodeIds[0];
                    this._partNodes.push(nodeIds[0]);
                    
                    for (let i = this._currentHistory + 1; i < this._historys.length; i++) {
                        let history = this._historys[i];
                        if ('transform' == history.type) {
                            if (history.nodeId == oldId) {
                                history.nodeId = targetHistory.nodeId;
                            }
                        }
                    }
                    
                    this._viewer.model.setNodeMatrix(targetHistory.nodeId, matrix).then(() => {
                        this._modelTree.addNode(partName, String(targetHistory.nodeId), true);
                    });
                });
            }

            // Enable Undo button control
            $('[data-command="undo"]').prop("disabled", false).css("background-color", "floralWhite");
            
            // Disable Redo button
            if (this._historys.length <= this._currentHistory + 1) {
                $('[data-command="redo"]').prop("disabled", true).css("background-color", "darkgrey");
            }
            this.createJson();
        }
    }

    addPart(nodeId, partName, matrix) {
        this.resetCommands();

        this._partNodes.push(nodeId);

        const nodeName = this._viewer.model.getNodeName(nodeId);
        this._scNameMap[nodeName] = partName;

        const history = {
            type: "addPart",
            nodeId: nodeId,
            partName: partName,
            matrix: matrix,
        }
        this.createHistory(history);

        this._modelTree.addNode(partName, String(nodeId), true);

    }

    createJson() {
        const root = this._viewer.model.getAbsoluteRootNode();
        let children = this._viewer.model.getNodeChildren(root);

        let partInfoArr = new Array(0);

        for (let node of children) {
            const nodeName = this._viewer.model.getNodeName(node);
            if ("sectionHandle" != nodeName) {
                let matrix = this._viewer.model.getNodeMatrix(node);
                partInfoArr.push({
                    name: this._scNameMap[nodeName],
                    visibility: this._viewer.model.getNodeVisibility(node),
                    matrix: matrix.toJson()
                });
            }
        }

        let assembly = {
            parts: partInfoArr
        }

        let jsonStr = JSON.stringify(assembly);

        $("#assemblyJson").val(jsonStr)
    }

    async _loadJson (jsonStr) {
        $("#loadingImage").show();

        let assembly = JSON.parse(jsonStr);
    
        // Delete existing models
        const root = this._viewer.model.getAbsoluteRootNode();
        const nodeIds = this._viewer.model.getNodeChildren(root);
        for (let nodeId of nodeIds) {
            await this._viewer.model.deleteNode(nodeId);
        }

        this._scNameMap = {};

        this._modelTree.createRoot("Model", String(root));

        // Load models
        const parts = assembly.parts;
        for (let part of parts) {
            // Lode model
            const scsFileName = "parts/" + part.name + ".scs";
            let config = new Communicator.LoadSubtreeConfig();
            if (false == part.visibility) config.attachInvisibly = true;
            const nodeIds = await this._viewer.model.loadSubtreeFromScsFile(root, scsFileName, config);

            // Set node matrix
            const matrix = Communicator.Matrix.fromJson(part.matrix);
            await this._viewer.model.setNodeMatrix(nodeIds[0], matrix);

            // Create name map 
            const nodeName = this._viewer.model.getNodeName(nodeIds[0]);
            this._scNameMap[nodeName] = part.name;

            // Create model tree
            this._modelTree.addNode(part.name, String(nodeIds[0]), part.visibility);

            $("#loadingImage").hide();
        }

        // Reset history
        this.historys = new Array(),
        this.currentHistory = -1,
        $('[data-command="undo"]').prop("disabled", true).css("background-color", "darkgrey");
        $('[data-command="redo"]').prop("disabled", true).css("background-color", "darkgrey");
    }
}