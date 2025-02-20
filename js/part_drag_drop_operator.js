import * as Communicator from "../hoops-web-viewer.mjs";
export class PartDragDropOperator {
    constructor(viewer, owner) {
        this._viewer = viewer;
        this._owner = owner;
        this._anchor;
        this._partNodeId = undefined;
        this._partName;
    }

    setPart(partName) {
        // Reset
        this._anchor = undefined;
        this._partNodeId = undefined;

        this._partName = partName;

        const scsFileName = "parts/" + this._partName + ".scs";

        this._viewer.model.getModelBounding(true).then((bbox) => {
            // Set anchor as current bounding box
            let boxSize = Communicator.Point3.subtract(bbox.max, bbox.min);
            boxSize.scale(0.5);
            this._anchor = Communicator.Point3.add(boxSize, bbox.min);

            // Load the part
            const root = this._viewer.model.getAbsoluteRootNode();
            let config = new Communicator.LoadSubtreeConfig();
            config.attachInvisibly = true;
            this._viewer.model.loadSubtreeFromScsFile(root, scsFileName, config).then((nodeIds) => {
                this._partNodeId = nodeIds[0];
            });
        });
    }

    unsetPart(){
        if (undefined == this._partNodeId) {
            return;
        }

        this._viewer.model.deleteNode(this._partNodeId).then(() => {
            this._partNodeId = undefined;
        });
    }

    onMouseMove(event) {
        if (undefined == this._partNodeId) {
            return;
        }

        const anchorPlanePoint = this._getDragPointOnAnchorPlane(event.getPosition());

        if (null != anchorPlanePoint) {
            let matrix = new Communicator.Matrix();
            matrix.setTranslationComponent(anchorPlanePoint.x, anchorPlanePoint.y, anchorPlanePoint.z);

            this._viewer.model.setNodesVisibility([this._partNodeId], true);
            this._viewer.model.setNodeMatrix(this._partNodeId, matrix);

            event.setHandled(true);
        }
    }

    onMouseDown(event) {
        // If right button is clicked, cancel the part insertion
        if (undefined != this._partNodeId && Communicator.Button.Right == event.getButton()) {
            this.unsetPart()

            event.setHandled(true);
        }
    }

    onMouseUp(event) {
        if (undefined != this._partNodeId) {
            const matrix = this._viewer.model.getNodeNetMatrix(this._partNodeId);
            this._owner.addPart(this._partNodeId, this._partName, matrix);

            this._partNodeId = undefined;
        }
    }

    _getDragPointOnAnchorPlane(screenPoint) {
        if (undefined == this._anchor) {
            return null
        }
        const camera = this._viewer.view.getCamera();
        const normal = Communicator.Point3.subtract(camera.getPosition(), this._anchor).normalize();
        const anchorPlane = Communicator.Plane.createFromPointAndNormal(this._anchor, normal);
        const ray = this._viewer.view.raycastFromPoint(screenPoint);
        const intersectionPoint = Communicator.Point3.zero();

        if (anchorPlane.intersectsRay(ray, intersectionPoint)) {
            return intersectionPoint;
        }
        else {
            return null;
        }
    }
}