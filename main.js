var app = new Vue({
    el: '#app',
    data: {
        partList: [],
        isError: false,
        message: '',
    },
    created: function() {
        const url = "part_list.js";
        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'jsonp',
            jsonp: 'callback',
            jsonpCallback: 'parts'
        })
        .done(function(data, textStatus, jqXHR) {
            this.partList = data;
        }.bind(this))
        .fail(function(jqXHR, textStatus, errorThrown) {
            this.isError = true;
            this.message = 'Fail to load part list.';
        }.bind(this));

    }
});