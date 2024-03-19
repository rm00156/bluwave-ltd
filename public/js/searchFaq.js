$(function () {

    var map2;

    var faqSearch = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.whitespace,
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        remote: {
            url: '/faq-search?search=%QUERY',
            wildcard: '%QUERY',
            transform: function (resp) {
                console.log(resp)
                map2 = resp;
                return resp.map(r => r.question);

            }
        }
    });

    $('.searchQuestion').typeahead({
        hint: true,
        highlight: true,
        minLength: 1
    }, {
        name: 'faqSearch',
        source: faqSearch
    }).on('typeahead:select', function (event, suggestion) {
        // Perform action when a suggestion is clicked
        console.log(suggestion)
        const results = map2.filter(m => m.question == suggestion);
        const result = results[0];
        window.location = `/faq/${result.id}`;
    });
})

// function search() {
//     $.ajax({
//         type: 'get',
//         url: '/faq-search',
//         data: { search: $('#searchQuestion').val() },
//         success: function (resp, xhr, status) {
//             if (status.status == 200) {

//                 console.log(resp.map(r => r.question))
//                 $('#search').typeahead({
//                     source: resp.map(r => r.question)
//                 }).on('typeahead:select', function (event, suggestion) {
//                     // Perform search based on the selected suggestion
//                     console.log('Search:', suggestion);
//                     // Perform any desired search actions here
//                 });

//             }
//         }
//     })
// }