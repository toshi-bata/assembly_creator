import * as Communicator from "../hoops-web-viewer.mjs";
export class ModelTree {
    constructor(viewer, treeDiv, owner) {
        this._viewer = viewer;
        this._treeDiv = treeDiv;
        this._owner = owner;
        this._treeData;
        this._historys = new Array();
        this._currentHistory;
    }

    _setTreeEvent() {
        $(this._treeDiv).on({
            "changed.jstree": (event, obj) => {
                const canvasSize = this._viewer.view.getCanvasSize();
                const conWidth = canvasSize.x;
                const treeWidth = $(this._treeDiv).innerWidth();
                $(this._treeDiv).offset({
                    left: conOffset.left + conWidth - treeWidth - 5
                });
            },
            "hover_node.jstree": (event, obj) => {
                let nodeId = Number(obj.node.id);
                this._viewer.model.resetNodesColor();
                this._viewer.model.setNodesFaceColor([nodeId], new Communicator.Color(255, 0, 0));           
            },
            "dehover_node.jstree": () => {
                this._viewer.model.resetNodesColor();
            },
            "select_node.jstree": (event, obj) => {
            },
            "check_node.jstree uncheck_node.jstree": (event, obj) => {
                const nodeId = Number(obj.node.id);
                const checked = obj.node.state.checked;
                this._viewer.model.setNodesVisibility([nodeId], checked).then(() => {
                    this._owner.createJson();
                });

                this._updateCheckState(nodeId, checked, this._treeData);
            },
            "loaded.jstree": () => {
                // cloudModeler.layoutTree();
            }
        });
    }

    _updateTree(model) {
        let tree = $('#tree').jstree(true);
        if (false != tree) {
            tree.destroy();
        }

        $('#tree').jstree({ 
            'core': {
                'data': this._treeData,
            },
            checkbox: {
              three_state : false, // to avoid that fact that checking a node also check others
              whole_node : false,  // to avoid checking the box just clicking the node
              tie_selection : false // for checking without selecting and selecting without checking
            },
            plugins: ['checkbox']
        });

        this._setTreeEvent();
    }

    createRoot(nodeName, id) {
        this._treeData = [
            {
                'text' : nodeName,
                'icon': 'jstree-folder',
                'id': id,
                'state' : {
                    'opened' : true,
                    'checked' : true,
                },
                'children' : []
            }
        ];

        this._updateTree();
    }

    _addHistory(treeData) {
        while (this._currentHistory + 1 < this._historys.length) {
            const history = this._historys.pop();
        }

        this._currentHistory++;
        this._historys.push(JSON.parse(JSON.stringify(treeData)));
    }

    createFromJson(treeData) {
        for (let data of treeData) {
            this._treeData[0].children.push(data);
        }

        this._updateTree();

        this._addHistory(this._treeData);
    }

    _updateCheckState(nodeId, checked, treeData) {
        for (let i = 0; i < treeData.length; i++) {
            let data = treeData[i];
            if (nodeId == Number(data.id)) {
                data.state.checked = checked;
                return;
            }

            if (data.children.length) {
                this._updateCheckState(nodeId, checked, data.children);
            }
        }
    }

    addNode(nodeName, id, checked) {
        let child = {
            'text' : nodeName,
            'icon': 'jstree-folder',
            'id': id,
            'state' : {
                'opened' : true,
                'checked' : checked,
            },
            'children' : []
        };

        const childCnt = this._treeData[0].children.length;
        this._treeData[0].children[childCnt] = child;

        this._updateTree();
    }

    deleteNode(id) {
        for (let i = 0; i < this._treeData[0].children.length; i++) {
            let child = this._treeData[0].children[i];
            if (id == child.id) {
                this._treeData[0].children.splice(i, 1);
                break;
            }
        }

        this._updateTree();
    }

    undoTree() {
        this._currentHistory--;
        this._treeData = this._historys[this._currentHistory];
        this._updateTree();
    }

    redoTree() {
        this._currentHistory++;
        this._treeData = this._historys[this._currentHistory];
        this._updateTree();
    }
}



