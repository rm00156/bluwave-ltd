$(function(){
    
    if($('#message').val() != undefined) {
        setTimeout(function() {
            $('#toast').removeClass('show');
        }, 5000);
    }
})