class snapPointOperator {
    constructor(viewer, selectionColor, pointColor) {
        this._viewer = viewer;
        this._selectionColor = selectionColor;
        this._preNodeId;
        this._preEntityType;
        this._preEntityId;
        this._preSnapPoint;
        this._preCenterAxis;
        this._owner;

        this._preMarkupItem;
        this._preMarkupHandles = new Array(0);

        this._preMarkupItem = new PointMarkup(this._viewer, 5, this._selectionColor, pointColor);
    }

    resetPreSelection() {
        if (undefined != this._preEntityId) {
            if (Communicator.SelectionType.Line == this._preEntityType) {
                this._viewer.model.unsetNodeLineColor(this._preNodeId, this._preEntityId);
            }
            else if (Communicator.SelectionType.Face == this._preEntityType) {
                this._viewer.model.unsetNodeFaceColor(this._preNodeId, this._preEntityId);
            }
            this._preEntityId = undefined;
        }

        if (this._preMarkupHandles.length) {
            for (let guid of this._preMarkupHandles) {
                this._viewer.markupManager.unregisterMarkup(guid);
            }
            this._preMarkupHandles.length = 0;
        }

        this._preSnapPoint = undefined;
        this._preCenterAxis = undefined;

    }

    _doPreSelection(nodeId, type, entityId, point) {
        if (this._preNodeId != nodeId || this._preEntityType != type || 
            this._preEntityId != entityId || !this._preSnapPoint.equals(point)) {
            
            this.resetPreSelection();

            this._preNodeId = nodeId;
            this._preEntityType = type;
            this._preEntityId = entityId;
            this._preSnapPoint = point;

            // Pre highlighting
            if (Communicator.SelectionType.Line == type) {
                this._viewer.model.setNodeLineColor(nodeId, entityId, this._selectionColor);
                
            }
            else if (Communicator.SelectionType.Face == type) {
                this._viewer.model.setNodeFaceColor(nodeId, entityId, this._selectionColor);
            }

            // Pre-select marker
            this._preMarkupItem.setPosiiton(point);
            const guid  = this._viewer.markupManager.registerMarkup(this._preMarkupItem);
            this._preMarkupHandles.push(guid);
        }
    }

    setOwner(owner) {
        this._owner = owner;
    }

    onMouseMove(event) {       
        // Avoid Erroe: Cannot pick from outside the canvas area.
        const canvasSize = this._viewer.view.getCanvasSize();
        const position = event.getPosition();
        if (0 >= position.x || 0 >= position.y || canvasSize.x <= position.x || canvasSize.y <= position.y) {
            // console.log(position);
            return;
        }

        const pickConfig = new Communicator.PickConfig(Communicator.SelectionMask.Line | Communicator.SelectionMask.Face);
        pickConfig.ignoreOverlays = true;
        pickConfig.ignoreCappingGeometry = true;
        this._viewer.view.pickFromPoint(event.getPosition(), pickConfig).then((selectionItem)=> {
            if (!selectionItem.isEntitySelection()) {
                this.resetPreSelection();
                return;
            }

            const nodeId = selectionItem.getNodeId();

            if (selectionItem.isLineSelection()) {
                const lineEntity = selectionItem.getLineEntity();
                const lineId = lineEntity.getLineId();

                // Check whether straght line
                const points = lineEntity.getPoints()
                if (2 == points.length) {
                    const stPnt = points[0];
                    const enPnt = points[1];
                    // Compute mid point
                    let mdPnt =  enPnt.copy().subtract(stPnt)
                    mdPnt = stPnt.copy().add(mdPnt.scale(0.5));

                    // Compute distance
                    const selPnt = selectionItem.getPosition();
                    const distSt = Communicator.Point3.subtract(stPnt, selPnt).length();
                    const distMd = Communicator.Point3.subtract(mdPnt, selPnt).length();
                    const distEn = Communicator.Point3.subtract(enPnt, selPnt).length();

                    // Compute snap point
                    let snapPnt;
                    if (distSt < distMd && distSt < distEn) {
                        snapPnt = stPnt;

                        this._preCenterAxis = enPnt.copy().subtract(stPnt);
                        this._preCenterAxis.normalize();
                    }
                    else if (distMd < distSt && distMd < distEn) {
                        snapPnt = mdPnt;

                        this._preCenterAxis = enPnt.copy().subtract(stPnt);
                        this._preCenterAxis.normalize();
                    }
                    else {
                        snapPnt = enPnt;

                        this._preCenterAxis = stPnt.copy().subtract(enPnt);
                        this._preCenterAxis.normalize();
                    }

                    this._doPreSelection(nodeId, Communicator.SelectionType.Line, lineId, snapPnt);
                }

                // Get pre-select edge properties
                this._viewer.model.getEdgeProperty(nodeId, lineId).then((prop)=> {
                    const netMatrix = this._viewer.model.getNodeNetMatrix(nodeId);
                    let snapPnt;

                    if (null != prop) {
                        // If edge properties are gotton, check whether it is arc / circle
                        if (undefined != prop.radius) {
                            snapPnt = netMatrix.transform(prop.origin);

                            this._preCenterAxis = rotatePoint(netMatrix, prop.normal);
                            this._preCenterAxis.normalize();

                            this._doPreSelection(nodeId, Communicator.SelectionType.Line, lineId, snapPnt);
                        }
                    }
                    else {
                        this.resetPreSelection();
                    }
                });
            }
            else if (selectionItem.isFaceSelection()) {
                const faceEntity = selectionItem.getFaceEntity();
                const faceId = faceEntity.getCadFaceIndex();
                const selPnt = selectionItem.getPosition();
                let snapPnt = selPnt;

                //Get pre-select face properties
                this._viewer.model.getFaceProperty(nodeId, faceId).then((prop)=>{
                    const netMatrix = this._viewer.model.getNodeNetMatrix(nodeId);

                    if (null == prop) {
                        this._doPreSelection(nodeId, Communicator.SelectionType.Face, faceId, snapPnt);
                        return;
                    }

                    if (undefined != prop.radius) {
                        // Cylinder face
                        const r = prop.radius;

                        const center = netMatrix.transform(prop.origin);
                        this._preCenterAxis = rotatePoint(netMatrix, prop.normal);
                        this._preCenterAxis.normalize();

                        // Compute start and end points of center axis using face bounding
                        let stPnt = center.copy();
                        let enPnt = center.copy().add(this._preCenterAxis);
                        
                        const box = faceEntity.getBounding();
                        let planeMin = Communicator.Plane.createFromPointAndNormal(box.min, this._preCenterAxis);
                        let planeMax = Communicator.Plane.createFromPointAndNormal(box.max, this._preCenterAxis);

                        Communicator.Util.intersectionPlaneLine2(stPnt, enPnt, planeMin, stPnt);
                        Communicator.Util.intersectionPlaneLine2(stPnt, enPnt, planeMax, enPnt);

                        this._preCenterAxis = enPnt.copy().subtract(center);
                        this._preCenterAxis.normalize();

                        // Compute center point
                        snapPnt = enPnt.copy().subtract(stPnt)
                        snapPnt = snapPnt.scale(0.5);
                        snapPnt = stPnt.copy().add(snapPnt);

                        // Extend start and end points
                        const distance = Communicator.Point3.distance(center, enPnt);
                        let inc = Communicator.Point3.scale(this._preCenterAxis.copy(), distance * 0.2);
                        stPnt = stPnt.subtract(inc);
                        enPnt = enPnt.add(inc);
                    }
                    else if (undefined != prop.normal) {
                        let normal = rotatePoint(netMatrix, prop.normal);
                        let stPnt = selectionItem.getPosition();
                        let enPnt = stPnt.copy().add(normal.copy().scale(10));

                        this._preCenterAxis = enPnt.copy().subtract(stPnt);
                        this._preCenterAxis.normalize();

                        this._centerPnt = stPnt;
                    }
                    
                    this._doPreSelection(nodeId, Communicator.SelectionType.Face, faceId, snapPnt);
                });

            }
            else {
                this.resetPreSelection();
            }
            
        });
    }

    onMouseDown(event) {
        if (undefined != this._owner && undefined != this._preEntityId) {
            event.setHandled(true);

            this._owner.snapPointSelection(this._preSnapPoint);

            this.resetPreSelection();
        }
    }
    
    getPreSnapPoint() {
        return {
            point: this._preSnapPoint,
            axis: this._preCenterAxis
        };
    }
}

class PointMarkup extends Communicator.Markup.MarkupItem {
    constructor(viewer, rarius, fillColor, strokeColor) {
        super();
        this._viewer = viewer;
        this._r = rarius;
        this._point = Communicator.Point3.zero();
        this._polygon = new Communicator.Markup.Shape.Polygon();
        this._polygon.setStrokeWidth(2);
        this._polygon.setStrokeColor(strokeColor);
        this._polygon.setFillColor(fillColor);
    }

    draw() {
        const point = Communicator.Point2.fromPoint3(this._viewer.getView().projectPoint(this._point));
        this._polygon.clearPoints();
        this._polygon.pushPoint(new Communicator.Point2(point.x + this._r, point.y));
        this._polygon.pushPoint(new Communicator.Point2(point.x, point.y + this._r));
        this._polygon.pushPoint(new Communicator.Point2(point.x - this._r, point.y));
        this._polygon.pushPoint(new Communicator.Point2(point.x, point.y - this._r));
        this._viewer.getMarkupManager().getRenderer().drawPolygon(this._polygon);
    }
 
    hit() {
        return false;
    }

    remove () {
        return;
    }

    setPosiiton(point) {
        this._point = point.copy();
    }

    getPosition() {
        return [this._point];
    }

}