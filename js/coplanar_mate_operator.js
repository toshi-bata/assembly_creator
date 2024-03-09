class CoplanarMateOperator {
    constructor(viewer, instructionId, flipBtnId, slideToolbarId, owner) {
        this._viewer = viewer;
        this._instructionId = instructionId;
        this._flipBtnId = flipBtnId;
        this._slideToolbatId = slideToolbarId;
        this._owner = owner;
        this._nodeTranslationCtrl = new nodeTranslation(viewer);
        this._preNodeId;
        this._preFaceId
        this._prePoint;
        this._preVector;

        this._nodeId1;
        this._faceId1;
        this._point1;
        this._vector1;
        this._mobileNode;
        this._axisForFlip;
        this._centerForFlip;
        this._axisForSlide;
        this._isBusy = false;
    };

    onMouseMove(event) {
        // Stop pre-selection while nodeTranslation
        if (this._isBusy) {
            return;
        }
        
        // Avoid Erroe: Cannot pick from outside the canvas area.
        const canvasSize = this._viewer.view.getCanvasSize();
        const position = event.getPosition();
        if (0 >= position.x || 0 >= position.y || canvasSize.x <= position.x || canvasSize.y <= position.y) {
            // console.log(position);
            return;
        }

        const pickConfig = new Communicator.PickConfig(Communicator.SelectionMask.Face);
        this._viewer.view.pickFromPoint(event.getPosition(), pickConfig).then((selectionItem)=> {
            if (!selectionItem.isFaceSelection()) {
                this._viewer.model.resetModelHighlight();
                this._preNodeId = undefined;
                this._preFaceId = undefined;        

                return;
            }

            const faceEntity = selectionItem.getFaceEntity();
            const faceId = faceEntity.getCadFaceIndex();
            const nodeId = selectionItem.getNodeId();
            const netMat = this._viewer.model.getNodeNetMatrix(nodeId);

            // Check whether planar face
            const normal = faceEntity.getNormal();
            
            this._viewer.model.getNodeMeshData(nodeId).then((meshDataCopy)=> {
                let faces = meshDataCopy.faces;
                let face = faces.element(faceId);
                let it = face.iterate();
                
                let points = [];
                while(!it.done()) {
                    var vertex = it.next();

                    let point = new Communicator.Point3(vertex.position[0], vertex.position[1], vertex.position[2]);
                    point = netMat.transform(point);
                    points.push(point);

                    if (3 == points.length) {
                        let pNorm = CalcNormal(points);
                        pNorm = pNorm.subtract(normal);
    
                        const tol = 0.01;
                        if (tol < Math.abs(pNorm.x) || tol < Math.abs(pNorm.y) || tol < Math.abs(pNorm.z)) {
                            return;
                        }

                        points.length = 0;
                    }
                }

                // Highlighting when face is plane 
                this._preVector = normal;
                if (this._preNodeId == nodeId && this._preFaceId == faceId) {
                    return;
                } 
                else {
                    this._preNodeId = nodeId;
                    this._preFaceId = faceId;
                    this._prePoint = selectionItem.getPosition();
    
                    // Update pre highlighting
                    this._viewer.model.resetModelHighlight();
                    this._viewer.model.setNodeFaceHighlighted(this._preNodeId, this._preFaceId, true);
                }
            });
        });
    }

    onMouseDown(event) {
        if (event.getButton() != Communicator.Button.Left) {
            return;
        }

        if (undefined != this._preNodeId && undefined != this._preFaceId) {
            // 1st selection
            this._viewer.model.resetModelHighlight();
            if (undefined == this._vector1) {
                this._nodeId1 = this._preNodeId;
                this._faceId1 = this._preFaceId;
                this._vector1 = this._preVector;
                this._point1 = this._prePoint;

                this._viewer.model.setNodeFaceColor(this._nodeId1, this._faceId1, new Communicator.Color(255, 255, 0));

                if (undefined != this._instructionId) {
                    document.getElementById(this._instructionId).innerHTML = "Select a planar face of mobile part.";
                }

                if (undefined != this._flipBtnId) {
                    document.getElementById(this._flipBtnId).style.display ="none";
                }

                if (undefined != this._slideToolbatId) {
                    document.getElementById(this._slideToolbatId).style.display ="none";
                }

                this._mobileNode = undefined;
            }
            // 2nd selection
            else {
                this._mobileNode = this._owner.getPartNodeId(this._preNodeId);
                this._isBusy = true;
                const initialMatrix = this._viewer.model.getNodeMatrix(this._mobileNode);

                let rotation = vectorsAngleDeg(this._preVector, this._vector1);

                let nodeIds = [this._mobileNode];
                if (undefined == rotation.axis) nodeIds = undefined;


                // Flip mate side if rotation angle is over 90 deg
                if (90 < rotation.angleDeg) {
                    this._preVector.negate();
                    rotation = vectorsAngleDeg(this._preVector, this._vector1);
                }

                this._axisForSlide = this._vector1.copy();

                this._nodeTranslationCtrl.rotate(nodeIds, rotation.axis, this._prePoint, 500, rotation.angleDeg, 100).then(() => {
                    this._axisForFlip = rotation.axis;
                    
                    if (undefined != this._flipBtnId) {
                        document.getElementById(this._flipBtnId).style.display ="block";
                    }

                    if (undefined != this._slideToolbatId) {
                        document.getElementById(this._slideToolbatId).style.display ="block";
                    }

                    let inter = new Communicator.Point3();
                    let plane = Communicator.Plane.createFromPointAndNormal(this._point1, this._vector1);
                    const lineEnd = this._prePoint.copy().add(this._vector1);

                    Communicator.Util.intersectionPlaneLine2(this._prePoint, lineEnd, plane, inter);
                    this._centerForFlip = inter;

                    let transVect = new Communicator.Point3.subtract(inter, this._prePoint);
                    let dist = transVect.length();
                    transVect.normalize();

                    nodeIds = [this._mobileNode];
                    if (0 == dist) nodeIds = undefined;

                    this._nodeTranslationCtrl.translate(nodeIds, transVect, 500, dist, 100).then(() => {
                        this._viewer.model.unsetNodeFaceColor(this._nodeId1, this._faceId1);
                        this._nodeId1 = undefined;
                        this._faceId1 = undefined;

                        this._isBusy = false;

                        this._vector1 = undefined;
                        this._preFaceId = undefined;
                        this.init();

                        // Create history
                        if (undefined != this._owner) {
                            let nodeId = this._mobileNode;
                            const newMatrix = this._viewer.model.getNodeMatrix(this._mobileNode);

                            const history = {
                                type: "transform",
                                nodeId: this._mobileNode,
                                initialMatrix: initialMatrix,
                                newMatrix: newMatrix,
                            }
                            this._owner.createHistory(history);
                        }
                    });
                });
            }
            event.setHandled(true);
        }
    }

    flipMate() {
        if (undefined == this._mobileNode) {
            return;
        }

        this._nodeTranslationCtrl.rotate([this._mobileNode], this._axisForFlip, this._centerForFlip, 500, 180, 100).then((newMatrices) => {
            this._owner.updateLastHistoryMatrices(newMatrices);
        });
    }

    slide(dist) {
        if (undefined == this._mobileNode) {
            return;
        }

        this._nodeTranslationCtrl.translate([this._mobileNode], this._axisForSlide, 500, dist, 100).then((newMatrices) => {
            this._owner.updateLastHistoryMatrices(newMatrices);
        });
    }

    reset() {
        this._viewer.model.resetModelHighlight();

        if (this._nodeId1 != undefined && this._faceId1 != undefined) {
            this._viewer.model.unsetNodeFaceColor(this._nodeId1, this._faceId1);
        }

        this._nodeId1 = undefined;
        this._faceId1 = undefined;
        this._point1 = undefined;
        this._vector1 = undefined;
        this._mobileNode = undefined;
        this._axisForFlip = undefined;
        this._centerForFlip = undefined;


        if (undefined != this._instructionId) {
            document.getElementById(this._instructionId).innerHTML = "";
        }

        if (undefined != this._flipBtnId) {
            document.getElementById(this._flipBtnId).style.display ="none";
        }

        if (undefined != this._slideToolbatId) {
            document.getElementById(this._slideToolbatId).style.display ="none";
        }

    }

    init() {
        if (undefined != this._instructionId) {
            document.getElementById(this._instructionId).innerHTML = "Select a planar face of target part.";
        }
    }

}