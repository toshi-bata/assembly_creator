var app = new Vue({
    el: '#app',
    data: {
        partList: [],
        isError: false,
        message: '',
    },
    created: function() {
        const url = "parts/parts_list.json";
        $.getJSON(url, (data) => {
            if (data.parts) {
                this.partList = data.parts;
            }
            else {
                this.isError = true;
                this.message = 'Fail to load part list.';
            }
        });
    }
});