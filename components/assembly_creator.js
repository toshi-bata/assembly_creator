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
            snapPointOp: undefined,
            snapPointOpHandle: undefined,
            sectionHandleOp: undefined,
            sectionHandleOpHandle: undefined,
            historys: new Array(),
            currentHistory: -1,
            scNameMap: {},
            cuttingSectionCommands: undefined,
            cuttingClolr: new Communicator.Color(153, 153, 153),
            cutting_position_x: undefined,
            cutting_position_y: undefined,
            cutting_position_z: undefined,
            currentCuttingNormal: undefined,
            currentCuttingOrg: undefined,
            sectionHandleNode: undefined,
            activeHandleVector: undefined,
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
            
        createViewer(viewerMode, modelName, "container", reverseProxy).then((hwv) => {
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

                    // Create dummy node for handle
                    this.sectionHandleNode = this.viewer.model.createNode(root, "sectionHandle");
                },
                selectionArray: (selectionEvents) => {
                    if (0 == selectionEvents.length) {
                        $("#popupInput").hide();
                        return;
                    }

                    const id = this.viewer.operatorManager.indexOf(this.handleOpOpHandle);
                    if (-1 != id) {
                        // Show handle
                        const selectionEvent = selectionEvents.pop();
                        const selectionType = selectionEvent.getType();
                        if (selectionType != Communicator.SelectionType.None) {
                            const selection = selectionEvent.getSelection();
                            const selectedNode = selection.getNodeId();
                
                            // Show handle
                            this.handleOpOp.addHandle(selectedNode);
                        }
                    }
                },
                handleEvent: (event, nodeIds, initialMatrices, newMatrices) => {
                    if (-1 != this.viewer.operatorManager.indexOf(this.sectionHandleOpHandle)) {
                        let position = newMatrices[0].transform(new Communicator.Point3(0, 0, 0));
                        switch (event) {
                            case Communicator.HandleEventType.Translate:
                                let plane = Communicator.Plane.createFromPointAndNormal(position, this.activeHandleVector);
                                let positionPercent = this.cuttingSectionCommands.getPositionPercent(this.activeHandleVector, plane);
                                positionPercent = Math.round(positionPercent);
        
                                if (this.activeHandleVector.equals(new Communicator.Point3(1, 0, 0)) || this.activeHandleVector.equals(new Communicator.Point3(-1, 0, 0))) {
                                    if (this.cutting_position_x != positionPercent) {
                                        $("#slider_x").slider("value",positionPercent);
                                        this.cutting_position_x = positionPercent;
                                    }                        }
                                else if (this.activeHandleVector.equals(new Communicator.Point3(0, 1, 0)) || this.activeHandleVector.equals(new Communicator.Point3(0, -1, 0))) {
                                    if (this.cutting_position_y != positionPercent) {
                                        $("#slider_y").slider("value",positionPercent);
                                        this.cutting_position_y = positionPercent;
                                    }     
                                }
                                else if (this.activeHandleVector.equals(new Communicator.Point3(0, 0, 1)) || this.activeHandleVector.equals(new Communicator.Point3(0, 0, -1))) {
                                    if (this.cutting_position_z != positionPercent) {
                                        $("#slider_z").slider("value",positionPercent);
                                        this.cutting_position_z = positionPercent;
                                    }     
                                }
                                break;
                            case Communicator.HandleEventType.Rotate:
                                let vector = rotatePoint(newMatrices[0], this.activeHandleVector);
                                vector.normalize();
                                let vectAngle = vectorsAngleDeg(this.activeHandleVector, vector);
                                let matrix = Communicator.Matrix.createFromOffAxisRotation(vectAngle.axis, vectAngle.angleDeg);
                                this.cuttingSectionCommands.rotateCuttingSection(this.activeHandleVector, vector, position, matrix);
                                break;
                            default:
                                break;
                        }

                    }
                },
                handleEventEnd: (event, nodeIds, initialMatrices, newMatrices) => {
                    if (-1 != this.viewer.operatorManager.indexOf(this.handleOpOpHandle)) {
                        const root = this.viewer.model.getAbsoluteRootNode();
                        let nodeId = nodeIds[0];
                        let parentId = this.viewer.model.getNodeParent(nodeId);
                        while (root != parentId) {
                            nodeId = parentId;
                            parentId = this.viewer.model.getNodeParent(nodeId);
                        }

                        const history = {
                            type: "transform",
                            nodes: nodeIds,
                            initialMatrices, initialMatrices,
                            newMatrices: newMatrices,
                            parentId: nodeId,
                        }
                        this.createHistory(history);
                    }
                },
                cuttingPlaneDragStart: () => {
                    this.sectionHandleOp.removeHandles();
                },
                cuttingPlaneDragEnd: (cuttingSection, planeIndex) => {
                    const plane = cuttingSection.getPlane(planeIndex);
                    const sectionId = this.cuttingSectionCommands.getSectionId(plane.normal);

                    let targetVector;
                    switch (sectionId) {
                        case 0:
                            targetVector = new Communicator.Point3(1, 0, 0);
                            break;
                        case 1:
                            targetVector = new Communicator.Point3(0, 1, 0);
                            break;
                        case 2:
                            targetVector = new Communicator.Point3(0, 0, 1);
                            break;                    
                        default:
                            break;
                    }

                    let positionPercent = this.cuttingSectionCommands.getPositionPercent(targetVector, plane);
                    positionPercent = Math.round(positionPercent);

                    // Update UI
                    if (targetVector.equals(new Communicator.Point3(1, 0, 0))) {
                        this.cutting_position_x = positionPercent;
                        $("#slider_x").slider("value",positionPercent);
                    }
                    else if (targetVector.equals(new Communicator.Point3(0, 1, 0))) {
                        this.cutting_position_y = positionPercent;
                        $("#slider_y").slider("value",positionPercent);
                    }
                    else if (targetVector.equals(new Communicator.Point3(0, 0, 1))) {
                        this.cutting_position_z = positionPercent;
                        $("#slider_z").slider("value",positionPercent);
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

            this.snapPointOp = new snapPointOperator(this.viewer, new Communicator.Color(255, 255, 0), new Communicator.Color(255, 0, 0));
            this.snapPointOpHandle = this.viewer.operatorManager.registerCustomOperator(this.snapPointOp);

            this.sectionHandleOp = new sectionHandleOperator(this.viewer);
            this.sectionHandleOpHandle = this.viewer.operatorManager.registerCustomOperator(this.sectionHandleOp);

            this.viewer.start();

            this.viewer.operatorManager.push(this.handleOpOpHandle);
            this.viewer.operatorManager.push(this.partDropOpHandle);

            // Prepare cutting section commands class
            this.cuttingSectionCommands = new CuttingSectionCommands(this.viewer);
        });
    },
    filters: {
        img_name: function(partName) {
            return 'css/images/' + partName + '.png';
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
            else if (-1 != this.viewer.operatorManager.indexOf(this.sectionHandleOpHandle)) {
                this.sectionHandleOp.removeHandles();
            }

            // Cuttin section
            this.cuttingSectionCommands.deleteAllCuttingSections();
            $("#clippingDlg").hide();
            $('.cmdToggleBtn').data("on", false).css("background-color", "floralWhite");

            $('.toggleBtn').data("on", false).css("background-color", "floralWhite");
            $('#instruction').html("Drag a thumbnail from the part list and drop on the viewer");

            // Snap point
            this.snapPointOp.setOwner(undefined);

            this.viewer.operatorManager.clear();
            this.viewer.operatorManager.push(Communicator.OperatorId.Navigate);
            this.viewer.operatorManager.push(Communicator.OperatorId.Select);
            this.viewer.operatorManager.push(Communicator.OperatorId.Handle);
            this.viewer.operatorManager.push(this.handleOpOpHandle);
            this.viewer.operatorManager.push(this.partDropOpHandle);
        },
        createCuttingSection(vector) {
            // Get model bounding
            this.viewer.model.getModelBounding(true, false).then((box) => {
                let center = box.max.copy().subtract(box.min);
                center = box.min.copy().add(center.scale(0.5));

                // Create cuttein section
                this.cuttingSectionCommands.setCappingColor(this.cuttingClolr, this.cuttingClolr);
                this.cuttingSectionCommands.createCuttingSection(vector, vector, center, box, 0);
                
                this.sectionHandleOp.removeHandles().then(() => {
                    this.sectionHandleOp.addHandles([this.sectionHandleNode], center, 0);
                    this.activeHandleVector = vector;

                    let matrix = new Communicator.Matrix();
                    matrix.setTranslationComponent(center.x, center.y, center.z);
                    this.viewer.model.setNodeMatrix(this.sectionHandleNode, matrix); 
                });
            });
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
                case "parallel":
                    if (false == on) {
                        this.viewer.operatorManager.push(this.coplanarOpHandle);
                        this.viewer.operatorManager.push(this.partDropOpHandle);
                        this.coplanarOp.setParallelMode();
                        this.coplanarOp.init();
                    }
                    break;
                case "perpendicular":
                    if (false == on) {
                        this.viewer.operatorManager.push(this.coplanarOpHandle);
                        this.viewer.operatorManager.push(this.partDropOpHandle);
                        this.coplanarOp.setPerpendicularMode();
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
                case "snapPoint":
                    if (false == on) {
                        this.viewer.operatorManager.clear();
                        this.viewer.operatorManager.push(Communicator.OperatorId.Navigate);
                        this.viewer.operatorManager.push(this.snapPointOpHandle);
                    }
                    break;
                case "section":
                    if (false == on) {
                        this.viewer.operatorManager.clear();
                        this.viewer.operatorManager.push(Communicator.OperatorId.Navigate);
                        this.viewer.operatorManager.push(Communicator.OperatorId.Cutting);
                        this.viewer.operatorManager.push(this.sectionHandleOpHandle);

                        this.cutting_position_x = 50.0;
                        this.cutting_position_y = 50.0;
                        this.cutting_position_z = 50.0;
                        
                        $("input[data-command='reverse_x'").css("background-color", "gray").prop("disabled", true);
                        $("input[data-command='reverse_y'").css("background-color", "gray").prop("disabled", true);
                        $("input[data-command='reverse_z'").css("background-color", "gray").prop("disabled", true);
                        $("input[data-command='snap_x'").css("background-color", "gray").prop("disabled", true);
                        $("input[data-command='snap_y'").css("background-color", "gray").prop("disabled", true);
                        $("input[data-command='snap_z'").css("background-color", "gray").prop("disabled", true);
                        $(".cuttingOffset").prop("disabled", true);
                        $(".slider").slider("value", 50);
                        $(".slider").slider("disable");
                        $('#sectioning').prop('checked', false);
                        $('#showSections').prop('checked', true);
                        $("#clippingDlg").show();

                        // const axis = $('input[name=axis]:checked').val();
                        // this.createCuttingSection(axis);
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
            else if ("image" == target.type)  {
                const command = target.dataset.command;
                let on = $(target).data("on");

                if (-1　!= command.indexOf("section_")) {
                    let vector;
                    switch (command) {
                        case "section_x":
                            vector = new Communicator.Point3(1, 0, 0);               
                            break;
                        case "section_y":
                            vector = new Communicator.Point3(0, 1, 0);               
                            break;
                        case "section_z":
                            vector = new Communicator.Point3(0, 0, 1);               
                            break;
                        default:
                            vector = new Communicator.Point3(1, 0, 0);               
                            break;
                    }

                    if (false == on) {
                        this.createCuttingSection(vector);
                        $(target).data("on", true).css("background-color", "indianred");
                        switch (command) {
                            case "section_x":
                                $("input[data-command='reverse_x'").css("background-color", "floralWhite").prop("disabled", false);
                                $("input[data-command='snap_x'").css("background-color", "floralWhite").prop("disabled", false);
                                $('#cuttingOffset_x').prop("disabled", false);
                                $("#slider_x").slider("enable");
                                break;
                            case "section_y":
                                $("input[data-command='reverse_y'").css("background-color", "floralWhite").prop("disabled", false);           
                                $("input[data-command='snap_y'").css("background-color", "floralWhite").prop("disabled", false);
                                $('#cuttingOffset_y').prop("disabled", false);
                                $("#slider_y").slider("enable");
                                break;
                            case "section_z":
                                $("input[data-command='reverse_z'").css("background-color", "floralWhite").prop("disabled", false);
                                $("input[data-command='snap_z'").css("background-color", "floralWhite").prop("disabled", false);
                                $('#cuttingOffset_z').prop("disabled", false);
                                $("#slider_z").slider("enable");
                                break;
                            default:
                                break;
                        }
                    }
                    else {
                        this.cuttingSectionCommands.deleteCuttingSection(vector);
                        this.sectionHandleOp.removeHandles();
                        $(target).data("on", false).css("background-color", "floralWhite");
                        switch (command) {
                            case "section_x":
                                $("input[data-command='reverse_x'").data("on", false).css("background-color", "gray").prop("disabled", true);
                                $("input[data-command='snap_x'").data("on", false).css("background-color", "gray").prop("disabled", true);
                                $("#slider_x").slider("value", 50);
                                $("#slider_x").slider("disable");
                                $('#cuttingOffset_x').prop("disabled", true);
                                this.cutting_position_x = 50.0;
                                break;
                            case "section_y":
                                $("input[data-command='reverse_y'").data("on", false).css("background-color", "gray").prop("disabled", true);           
                                $("input[data-command='snap_y'").data("on", false).css("background-color", "gray").prop("disabled", true);
                                $("#slider_y").slider("value", 50);
                                $("#slider_y").slider("disable");
                                $('#cuttingOffset_y').prop("disabled", true);
                                this.cutting_position_y = 50.0;
                                break;
                            case "section_z":
                                $("input[data-command='reverse_z'").data("on", false).css("background-color", "gray").prop("disabled", true);
                                $("input[data-command='snap_z'").data("on", false).css("background-color", "gray").prop("disabled", true);
                                $("#slider_z").slider("value", 50);
                                $("#slider_z").slider("disable");
                                $('#cuttingOffset_z').prop("disabled", true);
                                this.cutting_position_z = 50.0;
                                break;
                            default:
                                break;
                        }
                    }
                }
                else if (-1　!= command.indexOf("reverse_")) {
                    let vector;
                    switch (command) {
                        case "reverse_x":
                            vector = new Communicator.Point3(1, 0, 0);
                            if (this.activeHandleVector.equals(new Communicator.Point3(1, 0, 0)) || this.activeHandleVector.equals(new Communicator.Point3(1, 0, 0))) {
                                this.activeHandleVector.x *= -1; 
                                this.activeHandleVector.y *= -1; 
                                this.activeHandleVector.z *= -1; 
                            }
                            break;
                        case "reverse_y":
                            vector = new Communicator.Point3(0, 1, 0);               
                            break;
                        case "reverse_z":
                            vector = new Communicator.Point3(0, 0, 1);               
                            break;
                        default:
                            vector = new Communicator.Point3(1, 0, 0);               
                            break;
                    }

                    this.cuttingSectionCommands.flipCuttingSection(vector);

                    if (false == on) {
                        $(target).data("on", true).css("background-color", "indianred");
                    }
                    else {
                        $(target).data("on", false).css("background-color", "floralWhite");
                    }
                }
                else if (-1　!= command.indexOf("snap_")) {
                    this.sectionHandleOp.removeHandles();
                    let vector;
                    switch (command) {
                        case "snap_x":
                            vector = new Communicator.Point3(1, 0, 0);               
                            break;
                        case "snap_y":
                            vector = new Communicator.Point3(0, 1, 0);               
                            break;
                        case "snap_z":
                            vector = new Communicator.Point3(0, 0, 1);               
                            break;
                        default:
                            vector = new Communicator.Point3(1, 0, 0);               
                            break;
                    }

                    if (false == on) {
                        // delete target cutting section
                        const normal = this.cuttingSectionCommands.deleteCuttingSection(vector);

                        // activate snap point operator
                        this.currentCuttingOrg = vector;
                        this.currentCuttingNormal = normal;
                        this.viewer.operatorManager.push(this.snapPointOpHandle);
                        this.snapPointOp.setOwner(this);
                        
                        $(target).data("on", true).css("background-color", "indianred");
                    }
                    else {
                        // deactivate snap point operator
                        this.currentCuttingOrg = undefined;
                        this.currentCuttingNormal = undefined;
                        if (-1 != this.viewer.operatorManager.indexOf(this.snapPointOpHandle)) {
                            this.viewer.operatorManager.remove(this.snapPointOpHandle);
                        }
                        $(target).data("on", false).css("background-color", "floralWhite");
                    }
                }
            }
            else if ("radio" == target.type)  {
                this.cuttingSectionCommands.deleteAllCuttingSections();

                const axis = target.value;
                this.createCuttingSection(axis);
            }
            else if ("checkbox" == target.type)  {
                switch (target.id) {
                    case "sectioning":
                        this.cuttingSectionCommands.sectioning(target.checked);
                        break;
                    case "showSections":
                        this.cuttingSectionCommands.showReferenceGeometry(target.checked);
                        break;
                    default:
                        break;
                }
            }
            else if ("slidechange" == target.type || "slide" == target.type)  {
                let vector;
                let gain = val1;
                let reverse = 1;
                switch (target.target.id) {
                    case "slider_x":
                        vector = new Communicator.Point3(1, 0, 0);
                        gain -= this.cutting_position_x;
                        this.cutting_position_x = val1;
                        if ($("input[data-command='reverse_x'").data("on")) reverse = -1;      
                        break;
                    case "slider_y":
                        vector = new Communicator.Point3(0, 1, 0);               
                        gain -= this.cutting_position_y;               
                        this.cutting_position_y = val1;             
                        if ($("input[data-command='reverse_y'").data("on")) reverse = -1;      
                        break;
                    case "slider_z":
                        vector = new Communicator.Point3(0, 0, 1);               
                        gain -= this.cutting_position_z;               
                        this.cutting_position_z = val1;             
                        if ($("input[data-command='reverse_z'").data("on")) reverse = -1;      
                        break;
                    default:
                        vector = new Communicator.Point3(1, 0, 0);               
                        break;
                }
                if (0 != gain) {
                    const translation = this.cuttingSectionCommands.slideCuttingPlane(vector, gain, reverse);
                }

            }
            else if ("color" == target.type)  {
                this.cuttingClolr = val1;
                this.cuttingSectionCommands.setCappingColor(this.cuttingClolr, this.cuttingClolr);
            }
            else if ("text" == target.type) {
                const activeHandle = $(target).data("activeHandle")
                const distance = val1;
                let translation = new Communicator.Point3(0, 0, 0);
                let rotation;
                switch (activeHandle) {
                    case "translation-X":
                        translation.x = distance;

                        if (this.activeHandleVector.equals(new Communicator.Point3(1, 0, 0)) || this.activeHandleVector.equals(new Communicator.Point3(-1, 0, 0))) {
                            const percent = this.cuttingSectionCommands.getDistancePercent(this.activeHandleVector, distance);
                            $("#slider_x").slider("value",this.cutting_position_x + percent);
                        }
                        break;
                    case "translation-Y":
                        translation.y = distance;

                        if (this.activeHandleVector.equals(new Communicator.Point3(0, 1, 0)) || this.activeHandleVector.equals(new Communicator.Point3(0, -1, 0))) {
                            const percent = this.cuttingSectionCommands.getDistancePercent(this.activeHandleVector, distance);
                            $("#slider_y").slider("value",this.cutting_position_y + percent);
                        }
                        break;
                    case "translation-Z":
                        translation.z = distance;

                        if (this.activeHandleVector.equals(new Communicator.Point3(0, 0, 1)) || this.activeHandleVector.equals(new Communicator.Point3(0, 0, -1))) {
                            const percent = this.cuttingSectionCommands.getDistancePercent(this.activeHandleVector, distance);
                            $("#slider_z").slider("value",this.cutting_position_z + percent);
                        }
                        break;
                    case "rotate-X":
                        rotation = Communicator.Matrix.createFromOffAxisRotation(new Communicator.Point3(1, 0, 0), distance);
                        break;
                    case "rotate-Y":
                        rotation = Communicator.Matrix.createFromOffAxisRotation(new Communicator.Point3(0, 1, 0), distance);
                        break;
                    case "rotate-Z":
                        rotation = Communicator.Matrix.createFromOffAxisRotation(new Communicator.Point3(0, 0, 1), distance);
                        break;
                    default:
                        break;
                }

                if (undefined == rotation) {
                    rotation = new Communicator.Matrix();
                }
                else {
                    let vector = rotatePoint(rotation, this.activeHandleVector);
                    vector.normalize();
                    let vectAngle = vectorsAngleDeg(this.activeHandleVector, vector);
                    let matrix = Communicator.Matrix.createFromOffAxisRotation(vectAngle.axis, vectAngle.angleDeg);
                    let position = this.sectionHandleOp.getPosition();
                    this.cuttingSectionCommands.rotateCuttingSection(this.activeHandleVector, vector, position, matrix);
                }

                this.sectionHandleOp.updatePosition(translation, rotation, true, 0);

                $("#cuttingOffset").val("");
            }
            else if ("hideHandle" == target.type) {
                this.sectionHandleOp.removeHandles()
            }
        },
        snapPointSelection(snapPoint) {
            if (undefined == this.currentCuttingOrg || undefined == this.currentCuttingNormal) {
                return;
            }
            // Get model bounding
            this.viewer.model.getModelBounding(true, false).then((box) => {
                // Create cuttein section
                let positionPercent = this.cuttingSectionCommands.createCuttingSection(this.currentCuttingOrg, this.currentCuttingNormal, snapPoint, box, 0);
                positionPercent = Math.round(positionPercent);

                // Update UI
                if (this.currentCuttingOrg.equals(new Communicator.Point3(1, 0, 0)) || this.currentCuttingOrg.equals(new Communicator.Point3(-1, 0, 0))) {
                    this.cutting_position_x = positionPercent;
                    $("#slider_x").slider("value",positionPercent);
                    $("input[data-command='snap_x'").data("on", false).css("background-color", "floralWhite");
                }
                else if (this.currentCuttingOrg.equals(new Communicator.Point3(0, 1, 0)) || this.currentCuttingOrg.equals(new Communicator.Point3(0, -1, 0))) {
                    this.cutting_position_y = positionPercent;
                    $("#slider_y").slider("value",positionPercent);
                    $("input[data-command='snap_y'").data("on", false).css("background-color", "floralWhite");
                }
                else if (this.currentCuttingOrg.equals(new Communicator.Point3(0, 0, 1)) || this.currentCuttingOrg.equals(new Communicator.Point3(0, 0, -1))) {
                    this.cutting_position_z = positionPercent;
                    $("#slider_z").slider("value",positionPercent);
                    $("input[data-command='snap_z'").data("on", false).css("background-color", "floralWhite");
                }

                // Deactivate snap point operator
                this.currentCuttingOrg = undefined;
                this.currentCuttingNormal = undefined;
                if (-1 != this.viewer.operatorManager.indexOf(this.snapPointOpHandle)) {
                    this.viewer.operatorManager.remove(this.snapPointOpHandle);
                }
            });
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
                history.newMatrices = newMatrices;
                this.createJson();
            }
        },
        undo() {
            if (-1 < this.currentHistory) {
                let targetHistory = this.historys[this.currentHistory];

                if ('transform' == targetHistory.type) {
                    let promiseArr = new Array(0);
                    for (let i = 0; i < targetHistory.nodes.length; i++) {
                        promiseArr.push(this.viewer.model.setNodeMatrix(targetHistory.nodes[i], targetHistory.initialMatrices[i]));
                    }
                    Promise.all(promiseArr);
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
                    let promiseArr = new Array(0);
                    for (let i = 0; i < targetHistory.nodes.length; i++) {
                        promiseArr.push(this.viewer.model.setNodeMatrix(targetHistory.nodes[i], targetHistory.newMatrices[i]));
                    }
                    Promise.all(promiseArr);
                }
                else if ('addPart' == targetHistory.type) {
                    const partName = targetHistory.partName;
                    const matrix = targetHistory.matrix;

                    // Load the part
                    const root = this.viewer.model.getAbsoluteRootNode();
                    let config = new Communicator.LoadSubtreeConfig();
                    this.viewer.model.loadSubtreeFromModel(root, partName, config).then((nodeIds) => {
                        const oldId = targetHistory.nodeId;
                        targetHistory.nodeId = nodeIds[0];
                        
                        for (let i = this.currentHistory + 1; i < this.historys.length; i++) {
                            let history = this.historys[i];
                            if ('transform' == history.type) {
                                if (history.parentId == oldId) {
                                    history.parentId = targetHistory.nodeId;
                                    let nodes = new Array(0);
                                    this.getLeafNodes(history.parentId, nodes);
                                    history.nodes = nodes;
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
        getLeafNodes(node, nodes) {
            let children = this.viewer.model.getNodeChildren(node);
            if (0 == children.length) {
                nodes.push(node);
                return;
            }
            for (let chile of children) {
                this.getLeafNodes(chile, nodes);
            }
        },
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
                    this.viewer.model.setNodesVisibility([nodeId], checked);

                    this.$refs.tree1.updateCheck(String(nodeId), checked);

                    this.createJson();
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
        getNodeMatrices(node, matrices) {
            let matrix = this.viewer.model.getNodeMatrix(node);
            matrices.push(matrix.toJson());

            let children = this.viewer.model.getNodeChildren(node);
            if (0 == children.length) {
                return;
            }
            for (let chile of children) {
                this.getNodeMatrices(chile, matrices);
            }
        },
        createJson() {
            const root = this.viewer.model.getAbsoluteRootNode();
            let children = this.viewer.model.getNodeChildren(root);

            let modelNames = new Array(0);
            let nodeVisibilities = new Array(0);

            for (let node of children) {
                let nodeName = this.viewer.model.getNodeName(node);
                if ("sectionHandle" != nodeName) {
                    modelNames.push(this.scNameMap[nodeName]);
                    nodeVisibilities.push(this.viewer.model.getNodeVisibility(node));
                }
            }

            let matrices = new Array(0);
            this.getNodeMatrices(root, matrices);

            let assembly = {
                modelNames: modelNames,
                nodeVisibilities: nodeVisibilities,
                matrices: matrices
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
        onLoadJson() {
            $("#loadingImage").show();

            const jsonStr = $("#assemblyJson").val();
            let assembly = JSON.parse(jsonStr);

            // Delete existing models
            const root = this.viewer.model.getAbsoluteRootNode();
            const nodeIds = this.viewer.model.getNodeChildren(root);
            let promiseArr = new Array(0);
            for (let nodeId of nodeIds) {
                promiseArr.push(this.viewer.model.deleteNode(nodeId));
            }

            Promise.all(promiseArr).then(() => {
                // Load models
                const modelNames = assembly.modelNames;
                promiseArr.length = 0;
                for (let modelName of modelNames) {
                    let config = new Communicator.LoadSubtreeConfig();
                    config.attachInvisibly = true;
                    promiseArr.push(this.viewer.model.loadSubtreeFromModel(root, modelName, config));
                }
                Promise.all(promiseArr).then((nodeIdsArr) => {
                    const nodeVisibilities = assembly.nodeVisibilities;
                    let visibleNodes = new Array(0);

                    // Create model tree
                    this.createTree("Model", root);
                    for (let i = 0; i < modelNames.length; i++) {
                        let modelName = modelNames[i];
                        let nodeIds = nodeIdsArr[i];
                        const visible = nodeVisibilities[i];

                        this.addTreeNode(modelName, nodeIds[0], visible);

                        if (visible) visibleNodes.push(nodeIds[0]);

                        // Create name map 
                        const nodeName = this.viewer.model.getNodeName(nodeIds[0]);
                        this.scNameMap[nodeName] = modelName;
                    }

                    // Set matrix
                    const matArr = assembly.matrices;
                    let matrices = new Array(0);
                    for (let mat of matArr) {
                        matrices.push(Communicator.Matrix.fromJson(mat));
                    }
                    promiseArr.length = 0;
                    this.setNodeMatrices(root, matrices, promiseArr);
                    Promise.all(promiseArr).then(() => {
                        // Set visibility
                        if (visibleNodes.length) {
                            this.viewer.model.setNodesVisibility(visibleNodes,true);
                        }
                        $("#loadingImage").hide();
                    });
                });
            });

            // Reset history
            this.historys = new Array(),
            this.currentHistory = -1,
            $('[data-command="undo"]').prop("disabled", true).css("background-color", "darkgrey");
            $('[data-command="redo"]').prop("disabled", true).css("background-color", "darkgrey");
        }
    }
});