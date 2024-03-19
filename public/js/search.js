$(function () {

    var map;

    var bloodhound = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.whitespace,
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        remote: {
            url: '/customer-search?search=%QUERY',
            wildcard: '%QUERY',
            transform: function (resp) {

                map = resp;
                return resp.map(r => r.name);

            }
        }
    });

    $('.search').typeahead({
        hint: true,
        highlight: true,
        minLength: 1
    }, {
        name: 'myData',
        source: bloodhound
    }).on('typeahead:select', function (event, suggestion) {
        // Perform action when a suggestion is clicked
        const results = map.filter(m => m.name == suggestion);
        const result = results[0];
        window.location = result.link;
    });
})

// function search() {
//     $.ajax({
//         type: 'get',
//         url: '/customer-search',
//         data: { search: $('#search').val() },
//         success: function (resp, xhr, status) {
//             if (status.status == 200) {

//                 console.log(resp.map(r => r.name))
//                 $('#search').typeahead({
//                     source: resp.map(r => r.name)
//                 }).on('typeahead:select', function (event, suggestion) {
//                     // Perform search based on the selected suggestion
//                     console.log('Search:', suggestion);
//                     // Perform any desired search actions here
//                 });

//             }
//         }
//     })
// }