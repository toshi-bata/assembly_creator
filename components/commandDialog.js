Vue.component('commandDialog', {
    template: `
    <div>
        <button id="flipBtn" data-command="flip" style="display:none;" v-on:click="mateAdjustHandler">Flip mate</button>
        <p></p>
        <div id="rotateToolbar" style="display: none;">
            <button data-command="rotateM"  v-on:click="mateAdjustHandler">Rotate -</button>
            <input id="rotateAng" type="text" name="angle" size="5" value="90" v-on:blur="changeHandler">
            <button data-command="rotateP"  v-on:click="mateAdjustHandler">Rotate +</button>
        </div>
        <div id="slideToolbar" style="display: none;">
            <button data-command="slideM"  v-on:click="mateAdjustHandler">Slide -</button>
            <input id="slideDistance" type="text" name="distance" size="5" value="10" v-on:blur="changeHandler">
            <button data-command="slideP"  v-on:click="mateAdjustHandler">Slide +</button>
        </div>
        <div id="clippingDlg" style="display: none;">
            <input class="toolbarBtn cmdToggleBtn" data-command="section_x" data-on="false" title="X" type="image" name="image_button" src="css/images/section_x.png" v-on:click="sectionHandler" />
            <input class="toolbarBtn cmdToggleBtn" data-command="reverse_x" data-on="false" title="Reverse X" type="image" name="image_button" src="css/images/reverse.png" v-on:click="sectionHandler" />
            <input class="toolbarBtn cmdToggleBtn" data-command="snap_x" data-on="false" title="Snap X" type="image" name="image_button" src="css/images/snap24.png" v-on:click="sectionHandler" />
            <input class="cuttingOffset" id="cuttingOffset_x" type="text" name="Offset X" size="5" value="50" v-on:change="changeHandler"><br>
            <div class="slider" id='slider_x' style="margin-top: 6px;margin-bottom: 8px;"></div>

            <input class="toolbarBtn cmdToggleBtn" data-command="section_y" data-on="false" title="Y" type="image" name="image_button" src="css/images/section_y.png" v-on:click="sectionHandler" />
            <input class="toolbarBtn cmdToggleBtn" data-command="reverse_y" data-on="false" title="Reverse Y" type="image" name="image_button" src="css/images/reverse.png" v-on:click="sectionHandler" />
            <input class="toolbarBtn cmdToggleBtn" data-command="snap_y" data-on="false" title="Snap Y" type="image" name="image_button" src="css/images/snap24.png" v-on:click="sectionHandler" />
            <input class="cuttingOffset" id="cuttingOffset_y" type="text" name="Offset Y" size="5" value="50" v-on:change="changeHandler"><br>
            <div class="slider" id='slider_y' style="margin-top: 6px;margin-bottom: 8px;"></div>

            <input class="toolbarBtn cmdToggleBtn" data-command="section_z" data-on="false" title="Z" type="image" name="image_button" src="css/images/section_z.png" v-on:click="sectionHandler" />
            <input class="toolbarBtn cmdToggleBtn" data-command="reverse_z" data-on="false" title="Reverse Z" type="image" name="image_button" src="css/images/reverse.png" v-on:click="sectionHandler" />
            <input class="toolbarBtn cmdToggleBtn" data-command="snap_z" data-on="false" title="Snap Z" type="image" name="image_button" src="css/images/snap24.png" v-on:click="sectionHandler" />
            <input class="cuttingOffset" id="cuttingOffset_z" type="text" name="Offset Y" size="5" value="50" v-on:change="changeHandler"><br>
            <div class="slider" id='slider_z' style="margin-top: 6px;margin-bottom: 8px;"></div>

            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="sectioning" v-on:change="checkHandler">
                <label class="form-check-label" for="sectioning">Sectioning</label>
            </div>

            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="showSections" v-on:change="checkHandler">
                <label class="form-check-label" for="showSections">Show Cutting Sections</label>
            </div>

            Color: <input class='simple_color' value='#999999'/>
        </div>
        <div id="popupInput" style="display: none;">
            <input id="cuttingOffset" type="text" name="Offset" size="5" v-on:change="changeHandler"><br>
        </div>
    </div>`,
    data: function() {
        return {
            rotateAngle: 90,
            slideDistance: 10,
            cuttingOffset_x: 0,
            cuttingOffset_y: 0,
            cuttingOffset_z: 0,
        }
    },
    mounted: function() {
        // Create Slider bar
        $(".slider").slider({
            value:50,
            min:-10,
            max:110,
            step:1,
            slide: (e, ui) => {
                const id = e.target.id;
                switch (id) {
                    case 'slider_x':
                        $('#cuttingOffset_x').val(ui.value);
                        break;
                    case 'slider_y':
                        $('#cuttingOffset_y').val(ui.value);
                        break;
                    case 'slider_z':
                        $('#cuttingOffset_z').val(ui.value);
                        break;
                    default:
                        break;
                }
                this.$emit('onDialogBtn', {type: "hideHandle"});
                this.$emit('onDialogBtn', e, ui.value);
            },
            change: (e, ui) => {
                const id = e.target.id;
                switch (id) {
                    case 'slider_x':
                        $('#cuttingOffset_x').val(ui.value);
                        break;
                    case 'slider_y':
                        $('#cuttingOffset_y').val(ui.value);
                        break;
                    case 'slider_z':
                        $('#cuttingOffset_z').val(ui.value);
                        break;
                    default:
                        break;
                }
                this.$emit('onDialogBtn', e, ui.value);
            },
        });

        // Create color picker
        $('.simple_color').simpleColor({
            cellWidth: 9,
            cellHeight: 9,
            onSelect: (hex, element) => {
                const rgb = this.hex2rgb(hex);
                const color = new Communicator.Color(rgb[0], rgb[1], rgb[2]);
                this.$emit('onDialogBtn', {type: "color"}, color);
            }
        });
    },
    methods: {
        mateAdjustHandler: function(e) {
            this.$emit('onDialogBtn', e.currentTarget, this.rotateAngle, this.slideDistance);
        },
        checkHandler: function(e) {
            this.$emit('onDialogBtn', e.currentTarget);
        },
        sectionHandler: function(e) {
            this.$emit('onDialogBtn', e.currentTarget);
        },
        changeHandler: function(e) {
            const id = e.currentTarget.id;
            switch (id) {
                case 'rotateAng':
                    this.rotateAngle = Number($(e.currentTarget).val());
                    break;
                case "slideDistance":
                    this.slideDistance = Number($(e.currentTarget).val());
                    break;
                case "cuttingOffset_x":
                    this.cuttingOffset_x = Number($(e.currentTarget).val());
                    this.$emit('onDialogBtn', {type: "hideHandle"});
                    $("#slider_x").slider("value",this.cuttingOffset_x);
                    break;
                case "cuttingOffset_y":
                    this.cuttingOffset_y = Number($(e.currentTarget).val());
                    this.$emit('onDialogBtn', {type: "hideHandle"});
                    $("#slider_y").slider("value",this.cuttingOffset_y);
                    break;
                case "cuttingOffset_z":
                    this.cuttingOffset_z = Number($(e.currentTarget).val());
                    this.$emit('onDialogBtn', {type: "hideHandle"});
                    $("#slider_z").slider("value",this.cuttingOffset_z);
                    break;
                case "cuttingOffset":
                    $("#popupInput").hide();
                    let value = $(e.currentTarget).val();
                    if (!isNaN(value)) {
                        value = Number(value);
                        if (0 != value) {
                            this.$emit('onDialogBtn', e.currentTarget, value);
                        }
                    }
                    break
                default:
                    break;
            }
        },
        hex2rgb: function ( hex ) {
            if ( hex.slice(0, 1) == "#" ) hex = hex.slice(1) ;
            if ( hex.length == 3 ) hex = hex.slice(0,1) + hex.slice(0,1) + hex.slice(1,2) + hex.slice(1,2) + hex.slice(2,3) + hex.slice(2,3) ;

            return [ hex.slice( 0, 2 ), hex.slice( 2, 4 ), hex.slice( 4, 6 ) ].map( function ( str ) {
                return parseInt( str, 16 ) ;
            } ) ;
        }
    }
});