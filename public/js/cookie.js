$(function(){

    $('#acceptCookie').on('click', acceptCookie);
})

function acceptCookie()
{
    $.ajax({
        type:'post',
        url:'/accept_cookie',
        success:function(response, xhr, status)
        {
            console.log(response);
            console.log(xhr)
            if(status.status == 200)
            {
                location.reload();
            }
        }
    })
}