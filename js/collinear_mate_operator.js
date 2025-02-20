import * as Communicator from "../hoops-web-viewer.mjs";
import { ArrowMarkup, vectorsAngleDeg } from "./common_utilities.js";
import { nodeTranslation } from "./node_translation.js";
export class CollinearMateOperator {
    constructor(viewer, instructionId, flipBtnId, owner) {
        this._viewer = viewer;
        this._instructionId = instructionId;
        this._flipBtnId = flipBtnId;
        this._owner = owner;
        this._nodeTranslationCtrl = new nodeTranslation(viewer);
        this._preNodeId;
        this._preLineId
        this._prePoint;
        this._preVector;

        this._nodeId1;
        this._lineId1;
        this._point1;
        this._vector1;
        this._mobileNode;
        this._markupItem1;
        this._markupHandle1;
        this._axisForFlip;
        this._centerForFlip;
        this._preMarkupItem;
        this._preMarkupHandles = [];
        this._isBusy = false;

        // Create marker line for pre-select and 1st selection
        this._preMarkupItem = new ArrowMarkup(this._viewer, new Communicator.Color(255, 0, 0));
        this._markupItem1 = new ArrowMarkup(this._viewer, new Communicator.Color(255, 255, 0));
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

        const pickConfig = new Communicator.PickConfig(Communicator.SelectionMask.Line);
        this._viewer.view.pickFromPoint(event.getPosition(), pickConfig).then((selectionItem)=> {
            if (!selectionItem.isLineSelection()) {
                this._preNodeId = undefined;
                this._preLineId = undefined;        

                if (this._preMarkupHandles.length) {
                    for (let guid of this._preMarkupHandles) {
                        this._viewer.markupManager.unregisterMarkup(guid, this._viewer.view);
                    }
                    this._preMarkupHandles.length = 0;
                }

                return;
            }

            const lineEntity = selectionItem.getLineEntity();
            const lineId = lineEntity.getLineId();
            const nodeId = selectionItem.getNodeId();

            const bits = lineEntity.getLineBits();

            if (this._preNodeId == nodeId && this._preLineId == lineId) {
                return;
            }
            
            // Remove previous markup line
            if (this._preMarkupHandles.length) {
                for (let guid of this._preMarkupHandles) {
                    this._viewer.markupManager.unregisterMarkup(guid, this._viewer.view);
                }
                this._preMarkupHandles.length = 0;
            }

            // Check whether strate line
            const points = lineEntity.getPoints()
            if (2 != points.length) {
                return;
            }

            // Compute axis direction
            const selPnt = selectionItem.getPosition();
            const dist0 = Communicator.Point3.subtract(points[0], selPnt).length();
            const dist1 = Communicator.Point3.subtract(points[1], selPnt).length();

            // Closer point is start point 
            let enPnt;
            if (Math.abs(dist0) < Math.abs(dist1)) {
                this._prePoint = points[0];
                enPnt = points[1];
            }
            else {
                this._prePoint = points[1];
                enPnt = points[0];  
            }

            this._preVector = Communicator.Point3.subtract(enPnt, this._prePoint).normalize();

            // Switch preselected node & line IDs
            this._preNodeId = nodeId;
            this._preLineId = lineId;

            // Draw pre-select marker line
            this._preMarkupItem.setPosiiton(this._prePoint, enPnt);
            const guid  = this._viewer.markupManager.registerMarkup(this._preMarkupItem, this._viewer.view);
            this._preMarkupHandles.push(guid);
        });
    }

    onMouseDown(event) {
        if (event.getButton() != Communicator.Button.Left) {
            return;
        }

        if (undefined != this._preNodeId && undefined != this._preLineId) {
            // 1st selection
            if (undefined == this._vector1) {
                this._nodeId1 = this._preNodeId;
                this._lineId1 = this._preLineId;
                this._vector1 = this._preVector;
                this._point1 = this._prePoint;

                // Switch markup line
                const pnts = this._preMarkupItem.getPosition();
                this._markupItem1.setPosiiton(pnts[0], pnts[1]);
                this._markupHandle1 = this._viewer.markupManager.registerMarkup(this._markupItem1, this._viewer.view);

                if (undefined != this._instructionId) {
                    document.getElementById(this._instructionId).innerHTML = "Select a straight edge of mobile part.";
                }

                if (undefined != this._flipBtnId) {
                    document.getElementById(this._flipBtnId).style.display ="none";
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

                this._nodeTranslationCtrl.rotate(nodeIds, rotation.axis, this._prePoint, 500, rotation.angleDeg, 100).then(() => {
                    this._axisForFlip = rotation.axis;
                    this._centerForFlip = this._point1.copy();
                    if (undefined != this._flipBtnId) {
                        document.getElementById(this._flipBtnId).style.display ="block";
                    }

                    let transVect = Communicator.Point3.subtract(this._point1, this._prePoint);
                    let dist = transVect.length();
                    transVect.normalize();

                    nodeIds = [this._mobileNode];
                    if (0 == dist) nodeIds = undefined;
                    
                    this._nodeTranslationCtrl.translate(nodeIds, transVect, 500, dist, 100).then(() => {
                        this._viewer.markupManager.unregisterMarkup(this._markupHandle1, this._viewer.view);
                        this._markupHandle1 = undefined;

                        this._isBusy = false;
                        
                        this._vector1 = undefined;
                        this._preLineId = undefined;
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
                
            if (this._preMarkupHandles.length) {
                for (let guid of this._preMarkupHandles) {
                    this._viewer.markupManager.unregisterMarkup(guid, this._viewer.view);
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

        this._nodeTranslationCtrl.rotate([this._mobileNode], this._axisForFlip, this._centerForFlip, 500, 180, 100).then((newMatrices) => {
            this._owner.updateLastHistoryMatrices(newMatrices);
        });
    }

    reset() {
        this._nodeId1 = undefined;
        this._lineId1 = undefined;
        this._point1 = undefined;
        this._vector1 = undefined;
        this._mobileNode = undefined;
        this._axisForFlip = undefined;
        this._centerForFlip = undefined;

        if (this._preMarkupHandles.length) {
            for (let guid of this._preMarkupHandles) {
                this._viewer.markupManager.unregisterMarkup(guid, this._viewer.view);
            }
            this._preMarkupHandles.length = 0;
        }

        if (undefined != this._markupHandle1) {
            this._viewer.markupManager.unregisterMarkup(this._markupHandle1, this._viewer.view);
            this._markupHandle1 = undefined;
        }

        if (undefined != this._instructionId) {
            document.getElementById(this._instructionId).innerHTML = "";
        }

        if (undefined != this._flipBtnId) {
            document.getElementById(this._flipBtnId).style.display ="none";
        }
    }

    init() {
        if (undefined != this._instructionId) {
            document.getElementById(this._instructionId).innerHTML = "Select a straight edge of target part.";
        }
    }
}