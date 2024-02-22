class ConcentricMateOperator {
    constructor(viewer, instructionId, flipBtnId, rotateToolbarId, slideToolbarId, owner) {
        this._viewer = viewer;
        this._instructionId = instructionId;
        this._flipBtnId = flipBtnId;
        this._rorateToolbatId = rotateToolbarId;
        this._slideToolbatId = slideToolbarId;
        this._owner = owner;
        this._animationCtrl = new animation(viewer);
        this._nodeId1;
        this._lineId1;
        this._centerPnt1;
        this._centerAxis1;
        this._markupItem1;
        this._markupHandle1;
        this._axisForFlip;
        this._centerForFlip;
        this._axisForSlide;
        this._preNodeId;
        this._preEntiryId;
        this._preCenter;
        this._preCenterAxis;
        this._preMarkupItem;
        this._preMarkupHandles = [];
        this._isBusy = false;

        // Create marker line for pre-select and 1st selection
        this._preMarkupItem = new ArrowMarkup(this._viewer, new Communicator.Color(255, 0, 0));
        this._markupItem1 = new ArrowMarkup(this._viewer, new Communicator.Color(255, 255, 0));
    };

    onMouseMove(event) {
        // Stop pre-selection while animation
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
        
        const pickConfig = new Communicator.PickConfig(Communicator.SelectionMask.Line + Communicator.SelectionMask.Face);
        this._viewer.getView().pickFromPoint(event.getPosition(), pickConfig).then((selectionItem)=> {
            if (selectionItem.isLineSelection()) {
                // Get selectd node and line IDs
                const lineEntity = selectionItem.getLineEntity();
                const lineId = lineEntity.getLineId();
                const nodeId = selectionItem.getNodeId();

                // Retur if same node & line IDs are pre-selected
                if (this._preNodeId == nodeId && this._preEntiryId == lineId) {
                    return;
                } 

                // Remove previous markup line and reset highlight
                if (this._preMarkupHandles.length) {
                    for (let guid of this._preMarkupHandles) {
                        this._viewer.markupManager.unregisterMarkup(guid);
                    }
                    this._preMarkupHandles.length = 0;
                }
                this._viewer.model.resetModelHighlight();
                    
                // Get pre-select edge properties
                this._viewer.model.getEdgeProperty(nodeId, lineId).then((prop)=> {
                    const netMatrix = this._viewer.model.getNodeNetMatrix(nodeId);
                    let r;

                    if (null != prop) {
                        // If edge properties are gotton, check whether it is arc / circle
                        if (undefined != prop.origin && undefined != prop.normal && undefined != prop.radius) {
                            this._preCenter = netMatrix.transform(prop.origin);
                            let nVect = rotatePoint(netMatrix, prop.normal);
                            nVect.normalize();
                            this._preCenterAxis = nVect;
                            r = prop.radius;
                        }
                        else {
                            // No circle or arc edge
                            return;
                        }
                    }
                    else {
                        // If selected line doen't have edge property, guess using points
                        let vertices = lineEntity.getPoints();

                        for (let vertex of vertices) {
                            vertex = netMatrix.transform(vertex);
                        }

                        // Check the line entity whether it is poly arc
                        const arc = DetectPolyArc(vertices);

                        if (undefined == arc) {
                            return;
                        }

                        this._preCenter = arc.center;
                        this._preCenterAxis = arc.axis;
                        r = arc.r;
                    }

                    // Switch preselected node & line IDs
                    this._preNodeId = nodeId;
                    this._preEntiryId = lineId;

                    // Draw markup line at center of pre-select arc / circle
                    let inc = Communicator.Point3.scale(this._preCenterAxis.copy(), r * 3);
                    const enPnt = this._preCenter.copy().add(inc);
                    this._preMarkupItem.setPosiiton(this._preCenter, enPnt);
                    const guid  = this._viewer.markupManager.registerMarkup(this._preMarkupItem);
                    this._preMarkupHandles.push(guid);

                    // Highlight selected line
                    this._viewer.model.setNodeLineHighlighted(this._preNodeId, this._preEntiryId, true);
                });
            }
            else if (selectionItem.isFaceSelection()) {
                // Get selectd node and face IDs
                const nodeId = selectionItem.getNodeId();
                const faceEntity = selectionItem.getFaceEntity();
                const faceId = faceEntity.getCadFaceIndex();

                // Retur if same node & line IDs are pre-selected
                if (this._preNodeId == nodeId && this._preEntiryId == faceId) {
                    return;
                } 

                // Remove previous markup line and reset highlight
                if (this._preMarkupHandles.length) {
                    for (let guid of this._preMarkupHandles) {
                        this._viewer.markupManager.unregisterMarkup(guid);
                    }
                    this._preMarkupHandles.length = 0;
                }
                this._viewer.model.resetModelHighlight();

                // Get pre-select face properties
                this._viewer.model.getFaceProperty(nodeId, faceId).then((prop)=>{
                    if (null == prop) {
                        return;
                    }

                    if (undefined == prop.radius) {
                        return;
                    }

                    const netMatrix = this._viewer.model.getNodeNetMatrix(nodeId);
                    this._preCenter = netMatrix.transform(prop.origin);
                    let nVect = rotatePoint(netMatrix, prop.normal);
                    nVect.normalize();
                    this._preCenterAxis = nVect;
                    const r = prop.radius;

                    // Switch preselected node & line IDs
                    this._preNodeId = nodeId;
                    this._preEntiryId = faceId;

                    // Draw markup line at center of pre-select arc / circle
                    let inc = Communicator.Point3.scale(this._preCenterAxis.copy(), r * 3);
                    const enPnt = this._preCenter.copy().add(inc);
                    this._preMarkupItem.setPosiiton(this._preCenter, enPnt);
                    const guid  = this._viewer.markupManager.registerMarkup(this._preMarkupItem);
                    this._preMarkupHandles.push(guid);

                    // Highlight selected line
                    this._viewer.model.setNodeFaceHighlighted(this._preNodeId, this._preEntiryId, true);
                });
            }
            // Return if line is not selected
            else {
                this._preNodeId = undefined;
                this._preEntiryId = undefined;

                if (this._preMarkupHandles.length) {
                    for (let guid of this._preMarkupHandles) {
                        this._viewer.markupManager.unregisterMarkup(guid);
                    }
                    this._preMarkupHandles.length = 0;
                }
                this._viewer.model.resetModelHighlight();

                return;
            }
        });
    }

    onMouseDown(event) {
        if (event.getButton() != Communicator.Button.Left) {
            return;
        }

        if (undefined != this._preNodeId && undefined != this._preEntiryId) {
            // 1st selection
            if (undefined == this._centerAxis1) {
                this._nodeId1 = this._preNodeId;
                this._lineId1 = this._preEntiryId
                this._centerPnt1 = this._preCenter;
                this._centerAxis1 = this._preCenterAxis;

                // Switch markup line
                const pnts = this._preMarkupItem.getPosition();
                this._markupItem1.setPosiiton(pnts[0], pnts[1]);
                this._markupHandle1 = this._viewer.markupManager.registerMarkup(this._markupItem1);           

                // Set selected arc color
                this._viewer.model.setNodeLineColor(this._nodeId1, this._lineId1, new Communicator.Color(255, 255, 0));

                this._mobileNode = undefined;

                if (undefined != this._instructionId) {
                    document.getElementById(this._instructionId).innerHTML = "Select a circler edge of mobile part.";
                }

                if (undefined != this._flipBtnId) {
                    document.getElementById(this._flipBtnId).style.display ="none";
                }

                if (undefined != this._rorateToolbatId) {
                    document.getElementById(this._rorateToolbatId).style.display ="none";
                }

                if (undefined != this._slideToolbatId) {
                    document.getElementById(this._slideToolbatId).style.display ="none";
                }
            }
            // 2nd selection
            else {
                this._mobileNode = this._preNodeId;
                this._isBusy = true;
                const initialMatrix = this._viewer.model.getNodeMatrix(this._mobileNode);

                this._viewer.model.resetModelHighlight();

                let rotation = vectorsAngleDeg(this._preCenterAxis, this._centerAxis1);

                let nodeIds = [this._mobileNode];
                if (undefined == rotation.axis) nodeIds = undefined;

                // Flip mate side if rotation angle is over 90 deg
                if (90 < rotation.angleDeg) {
                    this._preCenterAxis.negate();
                    rotation = vectorsAngleDeg(this._preCenterAxis, this._centerAxis1);
                }

                this._animationCtrl.rotateAnimation(nodeIds, rotation.axis, this._preCenter, 500, rotation.angleDeg, 100).then(() => {
                    if (undefined != this._flipBtnId) {
                        document.getElementById(this._flipBtnId).style.display ="block";
                    }

                    let transVect = new Communicator.Point3.subtract(this._centerPnt1, this._preCenter);
                    let dist = transVect.length();
                    transVect.normalize();

                    nodeIds = [this._mobileNode];
                    if (0 == dist) nodeIds = undefined;

                    this._animationCtrl.translateAnimation(nodeIds, transVect, 500, dist, 100).then(() => {
                        if (undefined != this._rorateToolbatId) {
                            document.getElementById(this._rorateToolbatId).style.display ="block";
                        }

                        if (undefined != this._slideToolbatId) {
                            document.getElementById(this._slideToolbatId).style.display ="block";
                        }

                        this._viewer.markupManager.unregisterMarkup(this._markupHandle1);
                        this._markupHandle1 = undefined;

                        this._viewer.model.unsetNodeLineColor(this._nodeId1, this._lineId1);
                        this._nodeId1 = undefined;
                        this._lineId1 = undefined;

                        this._isBusy = false;

                        this._axisForFlip = rotation.axis;
                        this._centerForFlip = this._centerPnt1;
                        this._axisForSlide = this._centerAxis1.copy();
        
                        this._centerAxis1 = undefined;
                        this._preNodeId = undefined;
                        this._preEntiryId = undefined;
        
                        this.init();

                        // Create history
                        if (undefined != this._owner) {
                            const root = this._viewer.model.getAbsoluteRootNode();
                            let nodeId = this._mobileNode;
                            let parentId = this._viewer.model.getNodeParent(nodeId);
                            while (root != parentId) {
                                nodeId = parentId;
                                parentId = this._viewer.model.getNodeParent(nodeId);
                            }

                            const newMatrix = this._viewer.model.getNodeMatrix(this._mobileNode);

                            const history = {
                                type: "transform",
                                nodes: [this._mobileNode],
                                initialMatrices: [initialMatrix],
                                newMatrices: [newMatrix],
                                parentId: nodeId,
                            }
                            this._owner.createHistory(history);
                        }
                    });
                });
            }

            if (this._preMarkupHandles.length) {
                for (let guid of this._preMarkupHandles) {
                    this._viewer.markupManager.unregisterMarkup(guid);
                }
                this._preMarkupHandles.length = 0;
            }

            event.setHandled(true);
        }
    }

    flipMate() {
        if (undefined == this._mobileNode) {
            return;
        }

        this._animationCtrl.rotateAnimation([this._mobileNode], this._axisForFlip, this._centerForFlip, 500, 180, 100).then((newMatrices) => {
            this._owner.updateLastHistoryMatrices(newMatrices);
        });
    }

    slide(dist) {
        if (undefined == this._mobileNode) {
            return;
        }

        this._animationCtrl.translateAnimation([this._mobileNode], this._axisForSlide, 500, dist, 100).then((newMatrices) => {
            this._owner.updateLastHistoryMatrices(newMatrices);
        });
    }

    rotate(angleDeg) {
        if (undefined == this._mobileNode) {
            return;
        }

        this._animationCtrl.rotateAnimation([this._mobileNode], this._axisForSlide, this._centerForFlip, 500, angleDeg, 100).then((newMatrices) => {
            this._owner.updateLastHistoryMatrices(newMatrices);
        });
    }

    resetTransfer() {
        this._viewer.model.resetNodesTransform();
        this.reset();

    }

    reset() {
        if (undefined != this._nodeId1 && undefined != this._lineId1) {
            this._viewer.model.unsetNodeLineColor(this._nodeId1, this._lineId1);
        }

        this._nodeId1 = undefined;
        this._centerPnt1 = undefined;
        this._centerAxis1 = undefined;
        this._axisForFlip = undefined;
        this._preNodeId = undefined;
        this._preEntiryId = undefined;
        this._mobileNode = undefined;

        if (this._preMarkupHandles.length) {
            for (let guid of this._preMarkupHandles) {
                this._viewer.markupManager.unregisterMarkup(guid);
            }
            this._preMarkupHandles.length = 0;
        }   

        if (undefined != this._markupHandle1) {
            this._viewer.markupManager.unregisterMarkup(this._markupHandle1);
            this._markupHandle1 = undefined;
        }

        this._viewer.model.resetModelHighlight();

        if (undefined != this._flipBtnId) {
            document.getElementById(this._flipBtnId).style.display ="none";
        }

        if (undefined != this._rorateToolbatId) {
            document.getElementById(this._rorateToolbatId).style.display ="none";
        }

        if (undefined != this._slideToolbatId) {
            document.getElementById(this._slideToolbatId).style.display ="none";
        }
    }

    init() {
        if (undefined != this._instructionId) {
            document.getElementById(this._instructionId).innerHTML = "Select a circular edge of target part.";
        }
    }
}

