Vue.component('modelTree', {
    template: `
    <div id="modelTree">
        <div id="tree"></div>
    </div>`,
    data: function() {
        return {
            tree: undefined,
            treeData: undefined
        }
    },
    methods: {
        _updateTree(model) {
            let tree = $('#tree').jstree(true);
            if (false != tree) {
                tree.destroy();
            }

            $('#tree').jstree({ 
                'core': {
                    'data': this.treeData,
                },
                checkbox: {
                  three_state : false, // to avoid that fact that checking a node also check others
                  whole_node : false,  // to avoid checking the box just clicking the node
                  tie_selection : false // for checking without selecting and selecting without checking
                },
                plugins: ['checkbox']
            });
        },

        createRoot(nodeName, id) {
            this.treeData = [
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
        },

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

            const childCnt = this.treeData[0].children.length;
            this.treeData[0].children[childCnt] = child;

            this._updateTree();
        },

        deleteNode(id) {
            for (let i = 0; i < this.treeData[0].children.length; i++) {
                let child = this.treeData[0].children[i];
                if (id == child.id) {
                    this.treeData[0].children.splice(i, 1);
                    break;
                }
            }

            this._updateTree();
        },

        updateCheck(id, checked) {
            for (let i = 0; i < this.treeData[0].children.length; i++) {
                let child = this.treeData[0].children[i];
                if (id == child.id) {
                    child.state.checked = checked;
                    break;
                }
            }
        }
    }
});