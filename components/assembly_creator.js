Vue.component('assembly-creator', {
    template: `
    <div>
        <div id="content">
            <toolbar id="cmdBtns" v-on:onCommand="onCommand"></toolbar>
            <div id="container" class="ui-widget-content"></div>
            <textarea id="assemblyJson" style="width:800px; height:100px"></textarea>
            <div id="jsonBtns">
                <button v-on:click="onCopyJson">Copy Json</button>
                <button v-on:click="onLoadJson">Load Json</button>
            </div>
        </div>
        <commandDialog id="cmdDlg" v-on:onDialogBtn="onDialogBtn"></commandDialog>
        <modelTree id="tree1" ref="tree1"></modelTree>
        <div id="instruction"></div>
        <div id="footer">© Tech Soft 3D All Rights Reserved</div>
        <img id="loadingImage" style="display: none;" src="css/images/spinner.gif" class="centerBlock" />
        <div class="partList" draggable="true">
            <div v-if="isError" class="error">{{message}}</div>
            <div v-for="part in parts" class="partList_thumbnail" v-bind:key="part.id" v-bind:data-model="part.name" v-bind:title="part.name" v-on:mousedown="onThumbnailDown">
                <img v-bind:src="part.name | img_name" />
            </div>
        </div>
    </div>`,

    props: ['parts', 'isError', 'message'],
    data: function() {
        return {
            viewer: undefined,
            handleOpOp: undefined,
            handleOpOpHandle: undefined,
            partDropOp: undefined,
            partDropOpHandle: undefined,
            collinearOp: undefined,
            collinearOpHandle: undefined,
            concentricOp: undefined,
            concentricOpHandle: undefined,
            coplanarOp: undefined,
            coplanarOpHandle: undefined,
            historys: new Array(),
            currentHistory: -1,
            scNameMap: {},
            partNodes: new Array,
        }
    },
    created: function() {
        // addEventListener('resize', this.resizeHandler);
        let resizeTimer;
        const interval = Math.floor(1000 / 60 * 10);
        $(window).resize(() => {
            if (resizeTimer !== false) {
                clearTimeout(resizeTimer);
            }
            resizeTimer = setTimeout(() => {
                this.layoutPage()
            }, interval);
            
        });
    },
    beforeMounted: function() {
        let ii = 0;
    },
    beforeDestroy: function() {
        // removeEventListener('resize', this.resizeHandler)
    },
    mounted: function() {
        this.initializePage();

        $('[data-command="undo"]').prop("disabled", true).css("background-color", "darkgrey");
        $('[data-command="redo"]').prop("disabled", true).css("background-color", "darkgrey");

        const viewerMode = getURLArgument("viewer");
        const modelName = getURLArgument("instance");
        if (modelName == undefined) {
            modelName = "_empty";
        }
        const reverseProxy = getURLArgument("proxy");

        const scsFileName = "parts/" + modelName + ".scs"
        createViewer(viewerMode, scsFileName, "container", reverseProxy).then((hwv) => {
            this.viewer = hwv;

            this.viewer.setCallbacks({
                sceneReady: () => {
                    // Show Triad
                    this.viewer.view.getAxisTriad().enable();
                    this.viewer.view.setBackgroundColor(new Communicator.Color(179, 204, 255), new Communicator.Color(255, 255, 255));
                },
                modelStructureReady: () => {
                    const root = this.viewer.model.getAbsoluteRootNode();
                    this.createTree("Model", root);

                    let nodeIds = this.viewer.model.getNodeChildren(root);
                    if (0 < nodeIds.length) {
                        this.addTreeNode(modelName, nodeIds[0], true);

                        const nodeName = this.viewer.model.getNodeName(nodeIds[0]);
                        this.scNameMap[nodeName] = modelName;
                        
                        this.createJson();
                    }
                },
                selectionArray: (selectionEvents) => {
                    if (0 == selectionEvents.length) {
                        return;
                    }

                    const id = this.viewer.operatorManager.indexOf(this.handleOpOpHandle);
                    if (-1 != id) {
                        // Show handle
                        const selectionEvent = selectionEvents.pop();
                        const selectionType = selectionEvent.getType();
                        if (selectionType != Communicator.SelectionType.None) {
                            const selection = selectionEvent.getSelection();
                            const selectedNode = this.getPartNodeId(selection.getNodeId());
                
                            // Show handle
                            this.handleOpOp.addHandle(selectedNode);
                        }
                    }
                },
                handleEventEnd: (event, nodeIds, initialMatrices, newMatrices) => {
                    if (-1 != this.viewer.operatorManager.indexOf(this.handleOpOpHandle)) {
                        const root = this.viewer.model.getAbsoluteRootNode();
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
            let handleOp = this.viewer.operatorManager.getOperator(Communicator.OperatorId.Handle);
            let handleOpHandle = Communicator.OperatorId.Handle;
            this.handleOpOp = new HandleOperatorOperator(this.viewer, handleOp, handleOpHandle);
            this.handleOpOpHandle = this.viewer.operatorManager.registerCustomOperator(this.handleOpOp);

            this.partDropOp = new PartDragDropOperator(this.viewer, this);
            this.partDropOpHandle = this.viewer.operatorManager.registerCustomOperator(this.partDropOp);

            this.collinearOp = new CollinearMateOperator(this.viewer, "instruction", "flipBtn", this);
            this.collinearOpHandle = this.viewer.operatorManager.registerCustomOperator(this.collinearOp);
            
            this.concentricOp = new ConcentricMateOperator(this.viewer, "instruction", "flipBtn", "rotateToolbar", "slideToolbar", this);
            this.concentricOpHandle = this.viewer.operatorManager.registerCustomOperator(this.concentricOp);

            this.coplanarOp = new CoplanarMateOperator(this.viewer, "instruction", "flipBtn", "slideToolbar", this);
            this.coplanarOpHandle = this.viewer.operatorManager.registerCustomOperator(this.coplanarOp);

            this.viewer.start();

            this.viewer.operatorManager.push(this.handleOpOpHandle);
            this.viewer.operatorManager.push(this.partDropOpHandle);
        });
    },
    filters: {
        img_name: function(partName) {
            return 'parts/' + partName + '.png';
        }
    },
    methods: {
        onThumbnailDown: function($event) {
            const partName = $event.currentTarget.dataset.model;
            this.partDropOp.setPart(partName);
            $event.preventDefault();
        },
        initializePage: function() {
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

            $('#instruction').html("Drag a thumbnail from the part list and drop on the viewer");

            this.layoutPage();
        },
        layoutPage: function() {
            if (undefined != this.viewer) this.viewer.resizeCanvas();

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

            $(".partList").offset({ 
                top: conOffset.top + 5,
                left: conOffset.left + conWidth + 5 
            });
            $(".partList").width(winWidth - conWidth - 10);
            $(".partList").height(winHeight - toolbarHeight - footerHeight - 10)

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
        },
        onThumbnailDown: function($event) {
            const partName = $event.currentTarget.dataset.model;
            this.partDropOp.setPart(partName);
            $event.preventDefault();
        },
        resetCommands() {
            if (-1 != this.viewer.operatorManager.indexOf(this.collinearOpHandle)) {
                this.collinearOp.reset();
            }
            else if (-1 != this.viewer.operatorManager.indexOf(this.concentricOpHandle)) {
                this.concentricOp.reset();
            }
            else if (-1 != this.viewer.operatorManager.indexOf(this.coplanarOpHandle)) {
                this.coplanarOp.reset();
            }
            else if (-1 != this.viewer.operatorManager.indexOf(this.handleOpOpHandle)) {
                this.handleOpOp.reset();
            }

            $('.cmdToggleBtn').data("on", false).css("background-color", "floralWhite");

            $('.toggleBtn').data("on", false).css("background-color", "floralWhite");
            $('#instruction').html("Drag a thumbnail from the part list and drop on the viewer");


            this.viewer.operatorManager.clear();
            this.viewer.operatorManager.push(Communicator.OperatorId.Navigate);
            this.viewer.operatorManager.push(Communicator.OperatorId.Select);
            this.viewer.operatorManager.push(Communicator.OperatorId.Handle);
            this.viewer.operatorManager.push(this.handleOpOpHandle);
            this.viewer.operatorManager.push(this.partDropOpHandle);
        },
        onCommand: function(target) {
            const command = target.dataset.command;
            
            if (-1 != this.viewer.operatorManager.indexOf(this.handleOpOpHandle)) {
                this.handleOpOp.removeHandles();
            }
            
            this.viewer.selectionManager.clear();

            let on;
            if ($(target).hasClass('toggleBtn')) {
                on = $(target).data("on");

                this.resetCommands();

                if (false == on) {
                    this.viewer.operatorManager.clear();
                    this.viewer.operatorManager.push(Communicator.OperatorId.Navigate);

                    $(target).data("on", true).css("background-color", "indianred");
                }
            }

            // Delete existing measurement items
            this.viewer.measureManager.removeAllMeasurements();

            switch (command) {
                case "home":
                    this.viewer.view.resetCamera();                    
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
                        this.viewer.operatorManager.push(this.collinearOpHandle);
                        this.viewer.operatorManager.push(this.partDropOpHandle);
                        this.collinearOp.init();
                    }
                    break;
                case "concentric":
                    if (false == on) {
                        this.viewer.operatorManager.push(this.concentricOpHandle);
                        this.viewer.operatorManager.push(this.partDropOpHandle);
                        this.concentricOp.init();
                    }
                    break;
                case "coplanar":
                    if (false == on) {
                        this.viewer.operatorManager.push(this.coplanarOpHandle);
                        this.viewer.operatorManager.push(this.partDropOpHandle);
                        this.coplanarOp.init();
                    }
                    break;
                case "measureDistance":
                    if (false == on) {
                        // Set MeasureEdgeLength operator
                        this.viewer.operatorManager.clear();
                        this.viewer.operatorManager.push(Communicator.OperatorId.Navigate);
                        this.viewer.operatorManager.push(Communicator.OperatorId.MeasureFaceFaceDistance);
                    }
                    break;

                default:
                    break;
            }
        },
        onDialogBtn: function(target, val1, val2, val3) {
            if ("submit" == target.type) {
                const command = target.dataset.command;

                let mateOp = undefined;
                if (-1 != this.viewer.operatorManager.indexOf(this.collinearOpHandle)) {
                    mateOp = this.collinearOp;
                }
                else if (-1 != this.viewer.operatorManager.indexOf(this.concentricOpHandle)) {
                    mateOp = this.concentricOp;
                }
                else if (-1 != this.viewer.operatorManager.indexOf(this.coplanarOpHandle)) {
                    mateOp = this.coplanarOp;
                }

                if (undefined == mateOp) return;

                switch (command) {
                    case "flip":
                        mateOp.flipMate();                    
                        break;
                    case "rotateM":
                        mateOp.rotate(-val1);                    
                        break;
                    case "rotateP":
                        mateOp.rotate(val1);                    
                        break;
                    case "slideM":
                        mateOp.slide(-val2);                    
                        break;
                    case "slideP":
                        mateOp.slide(val2);                    
                        break;
                    case "reverseDir":
                        mateOp.slide(val2);                    
                        break;
                    default:
                        break;
                }
            }
        },
        getPartNodeId(childNode) {
            const root = this.viewer.model.getAbsoluteRootNode();
            let parentNode = childNode;
            do {
                for (let i = 0; i < this.partNodes.length; i++) {
                    if (parentNode == this.partNodes[i]) {
                        return this.partNodes[i];
                    }
                }
                parentNode = this.viewer.model.getNodeParent(parentNode)                
            } while (root != parentNode);
            return childNode;
        },
        createHistory(history) {
            this.currentHistory++;

            if (this.currentHistory < this.historys.length) {
                this.historys.splice(this.currentHistory)
            }

            this.historys.push(history);

            // Enable Undo button control
            $('[data-command="undo"]').prop("disabled", false).css("background-color", "floralWhite");

            this.createJson();

        },
        updateLastHistoryMatrices(newMatrices) {
            let history = this.historys[this.currentHistory];
            if ("transform" == history.type) {
                history.newMatrix = newMatrices[0];
                this.createJson();
            }
        },
        undo() {
            if (-1 < this.currentHistory) {
                let targetHistory = this.historys[this.currentHistory];

                if ('transform' == targetHistory.type) {
                    this.viewer.model.setNodeMatrix(targetHistory.nodeId, targetHistory.initialMatrix);
                }
                else if ('addPart' == targetHistory.type) {
                    let nodeId = targetHistory.nodeId;
                    this.viewer.model.deleteNode(nodeId).then(() => {
                        this.deleteTreeNode(nodeId);
                    });
                }
                this.currentHistory--;

                // Enable Redo button control
                $('[data-command="redo"]').prop("disabled", false).css("background-color", "floralWhite");
                
                // Disable Undo button
                if (0 > this.currentHistory) {
                    $('[data-command="undo"]').prop("disabled", true).css("background-color", "darkgrey");
                }
                this.createJson();
            }
        },
        redo() {
            if (this.currentHistory < this.historys.length - 1) {
                this.currentHistory++;
                let targetHistory = this.historys[this.currentHistory];

                if ('transform' == targetHistory.type) {
                    this.viewer.model.setNodeMatrix(targetHistory.nodeId, targetHistory.newMatrix);
                }
                else if ('addPart' == targetHistory.type) {
                    const partName = targetHistory.partName;
                    const scsFileName = "parts/" + partName + ".scs";
                    const matrix = targetHistory.matrix;

                    // Load the part
                    const root = this.viewer.model.getAbsoluteRootNode();
                    let config = new Communicator.LoadSubtreeConfig();
                    this.viewer.model.loadSubtreeFromScsFile(root, scsFileName, config).then((nodeIds) => {
                        const oldId = targetHistory.nodeId;
                        targetHistory.nodeId = nodeIds[0];
                        this.partNodes.push(nodeIds[0]);
                        
                        for (let i = this.currentHistory + 1; i < this.historys.length; i++) {
                            let history = this.historys[i];
                            if ('transform' == history.type) {
                                if (history.nodeId == oldId) {
                                    history.nodeId = targetHistory.nodeId;
                                }
                            }
                        }
                        
                        this.viewer.model.setNodeMatrix(targetHistory.nodeId, matrix).then(() => {
                            this.addTreeNode(partName, targetHistory.nodeId, true);
                        });
                    });
                }

                // Enable Undo button control
                $('[data-command="undo"]').prop("disabled", false).css("background-color", "floralWhite");
                
                // Disable Redo button
                if (this.historys.length <= this.currentHistory + 1) {
                    $('[data-command="redo"]').prop("disabled", true).css("background-color", "darkgrey");
                }
                this.createJson();
            }
        },
        addPart(nodeId, partName, matrix) {
            this.resetCommands();

            this.partNodes.push(nodeId);

            const nodeName = this.viewer.model.getNodeName(nodeId);
            this.scNameMap[nodeName] = partName;

            const history = {
                type: "addPart",
                nodeId: nodeId,
                partName: partName,
                matrix: matrix,
            }
            this.createHistory(history);

            this.addTreeNode(partName, nodeId, true);
        },
        // getLeafNodes(node, nodes) {
        //     let children = this.viewer.model.getNodeChildren(node);
        //     if (0 == children.length) {
        //         nodes.push(node);
        //         return;
        //     }
        //     for (let chile of children) {
        //         this.getLeafNodes(chile, nodes);
        //     }
        // },
        setTreeEvent() {
            $('#tree').on({
                'hover_node.jstree': (event, obj) => {
                    let nodeId = Number(obj.node.id);
                    this.viewer.model.resetNodesColor();
                    this.viewer.model.setNodesFaceColor([nodeId], new Communicator.Color(255, 0, 0));           
                },
                'dehover_node.jstree': () => {
                    this.viewer.model.resetNodesColor();
                },
                'select_node.jstree': (event, obj) => {
                },
                'check_node.jstree uncheck_node.jstree': (event, obj) => {
                    const nodeId = Number(obj.node.id);
                    const checked = obj.node.state.checked;
                    this.$refs.tree1.updateCheck(String(nodeId), checked);
                    this.viewer.model.setNodesVisibility([nodeId], checked).then(() =>{
                        this.createJson();
                    });
                },
                'loaded.jstree': () => {
                    const conHeight = $('#container').innerHeight();
                    const treeHeight =  $('#tree1').height();
                    if (conHeight < treeHeight + 50) {
                        $('#tree1').height(conHeight - 50);
                    }
                }
            });
        },
        createTree(name, id) {
            this.$refs.tree1.createRoot(name, String(id));
            this.setTreeEvent();
        },
        addTreeNode(name, id, checked) {
            this.$refs.tree1.addNode(name, String(id), checked);
            this.setTreeEvent();
        },
        deleteTreeNode(id) {
            this.$refs.tree1.deleteNode(String(id));
            this.setTreeEvent();
        },
        createJson() {
            const root = this.viewer.model.getAbsoluteRootNode();
            let children = this.viewer.model.getNodeChildren(root);

            let partInfoArr = new Array(0);

            for (let node of children) {
                const nodeName = this.viewer.model.getNodeName(node);
                if ("sectionHandle" != nodeName) {
                    let matrix = this.viewer.model.getNodeMatrix(node);
                    partInfoArr.push({
                        name: this.scNameMap[nodeName],
                        visibility: this.viewer.model.getNodeVisibility(node),
                        matrix: matrix.toJson()
                    });
                }
            }

            let assembly = {
                parts: partInfoArr
            }

            let jsonStr = JSON.stringify(assembly);

            $("#assemblyJson").val(jsonStr)
        },
        setNodeMatrices(node, matrices, promiseArr) {
            const matrix = matrices.shift();
            promiseArr.push(this.viewer.model.setNodeMatrix(node, matrix));

            let children = this.viewer.model.getNodeChildren(node);
            if (0 == children.length) {
                return;
            }
            for (let chile of children) {
                this.setNodeMatrices(chile, matrices, promiseArr);
            }
        },
        onCopyJson() {
            const jsonStr = $("#assemblyJson").val();

            let copyFrom = document.createElement("textarea");
            copyFrom.textContent = jsonStr;

            const bodyElm = document.getElementsByTagName("body")[0];
            bodyElm.appendChild(copyFrom);

            copyFrom.select();
            document.execCommand('copy')

            bodyElm.removeChild(copyFrom);
        },
        onLoadJson:async function() {
            $("#loadingImage").show();
            
            const jsonStr = $("#assemblyJson").val();
            let assembly = JSON.parse(jsonStr);
        
            // Delete existing models
            const root = this.viewer.model.getAbsoluteRootNode();
            const nodeIds = this.viewer.model.getNodeChildren(root);
            for (let nodeId of nodeIds) {
                await this.viewer.model.deleteNode(nodeId);
            }

            this.createTree("Model", root);

            // Load models
            const parts = assembly.parts;
            for (let part of parts) {
                // Lode model
                const scsFileName = "parts/" + part.name + ".scs";
                let config = new Communicator.LoadSubtreeConfig();
                if (false == part.visibility) config.attachInvisibly = true;
                const nodeIds = await this.viewer.model.loadSubtreeFromScsFile(root, scsFileName, config);

                // Set node matrix
                const matrix = Communicator.Matrix.fromJson(part.matrix);
                await this.viewer.model.setNodeMatrix(nodeIds[0], matrix);

                // Create name map 
                const nodeName = this.viewer.model.getNodeName(nodeIds[0]);
                this.scNameMap[nodeName] = part.name;

                // Create model tree
                this.addTreeNode(part.name, nodeIds[0], part.visibility);

                $("#loadingImage").hide();
            }

            // Reset history
            this.historys = new Array(),
            this.currentHistory = -1,
            $('[data-command="undo"]').prop("disabled", true).css("background-color", "darkgrey");
            $('[data-command="redo"]').prop("disabled", true).css("background-color", "darkgrey");
        },
    }
});