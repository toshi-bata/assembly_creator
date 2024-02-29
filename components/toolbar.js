Vue.component('toolbar', {
    template: `
    <div>
        <input class="toolbarBtn" data-command="home" title="Home" type="image" name="image_button" src="css/images/home.png" v-on:click="clickHandler" />
        <input class="toolbarBtn" data-command="undo" title="Undo" type="image" name="image_button" src="css/images/undo.png" v-on:click="clickHandler" />
        <input class="toolbarBtn" data-command="redo" title="Redo" type="image" name="image_button" src="css/images/redo.png" v-on:click="clickHandler" style="margin-right: 10px;" />
        <input class="toolbarBtn toggleBtn" data-command="collinear" data-on="false" title="Collinear" type="image" name="image_button" src="css/images/collinear.png" v-on:click="clickHandler" />
        <input class="toolbarBtn toggleBtn" data-command="concentric" data-on="false" title="Concentric" type="image" name="image_button" src="css/images/concentric.png" v-on:click="clickHandler" />
        <input class="toolbarBtn toggleBtn" data-command="coplanar" data-on="false" title="Coplanar" type="image" name="image_button" src="css/images/coplanar.png" v-on:click="clickHandler" style="margin-right: 10px;" />
        <input class="toolbarBtn toggleBtn" data-command="measureDistance" data-on=false title="Measure distance" type="image" name="image_button" src="css/images/measure.png" v-on:click="clickHandler" />
    </div>`,
    methods: {
        clickHandler: function(e) {
            this.$emit('onCommand', e.currentTarget)
        }
    }
});