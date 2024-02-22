class sectionHandleOperator extends Communicator.Operator.HandleOperator {
    constructor(viewer) {
        super(viewer);
        this._viewer = viewer;
        this._pickConfig = new Communicator.PickConfig(Communicator.SelectionMask.Face);
        this._pickConfig.restrictToOverlays = true;
        this._isDragged = false;
    }


    _getCurrentHandle() {
        const handleId = this._viewer.model.getNodeName(this._activeHandleNodeId);
        if (handleId !== null && handleId.slice(0, 7) === "handle-") {
            if (7 == handleId.indexOf("axis-translation")) {
                let axis = handleId.slice(24);
                if ("0" == axis) {
                    axis = "X"
                }
                else if ("1" == axis) {
                    axis = "Y"
                }
                else if ("2" == axis) {
                    axis = "Z"
                }
                return "translation-" + axis;
            }
            else if (7 == handleId.indexOf("rotate")) {
                let axis = handleId.slice(14);
                if ("6" == axis) {
                    axis = "X"
                }
                else if ("7" == axis) {
                    axis = "Y"
                }
                else if ("8" == axis) {
                    axis = "Z"
                }
                return "rotate-" + axis;
            }
        }
        return undefined;
    }

    onMouseMove(event) {
        super.onMouseMove(event);

        // Avoid Erroe: Cannot pick from outside the canvas area.
        const canvasSize = this._viewer.view.getCanvasSize();
        const position = event.getPosition();
        if (0 >= position.x || 0 >= position.y || canvasSize.x <= position.x || canvasSize.y <= position.y) {
            // console.log(position);
            return;
        }

        if (this.isDragging()) {
            this._isDragged = true;

            const handle = this._getCurrentHandle();

        }
    }

    onMouseUp(event) {
        super.onMouseUp(event);

        // If handle is not dragged 
        if (!this._isDragged) {
            
            const handle = this._getCurrentHandle();

            if (undefined !== handle) {
                // Show input box
                const conOffset = $("#container").offset();
                const position = event.getPosition();

                let target = document.getElementById('popupInput');
                target.style.left = position.x + 'px';
                target.style.top = position.y + 'px';

                $("#popupInput").show();
                $('input').focus();

                $("#cuttingOffset").data("activeHandle", handle)
            }
        }

        this._isDragged = false;
    }
}