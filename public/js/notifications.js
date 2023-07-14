$(function () {

    populateNotifications();
    const socket = io();
    // todo mark all as read
    const adminAccountId = $('#adminAccountId').val();

    $('#markAsRead').on('click', markAsRead);
    socket.on('notification', (notification) => {
        console.log('Received notification:', notification);
        if (notification.notification.accountFk != adminAccountId)
            return;
        populateNotifications();
        const interval = setInterval(flash, 1000); // Call myFunction every 0.5 seconds

        setTimeout(() => {
            clearInterval(interval); // Stop the interval after 5 seconds
        }, 4000);
    });
});

function markAsRead() {

    $.ajax({
        type: 'delete',
        url: '/delete_all_notifications',
        success: function(resp, xhr, status) {

            if(status.status == 200) {
                populateNotifications();
            }
        }
    })
}

function populateNotifications() {
    $.ajax({
        type: 'get',
        url: '/get_notifications',
        success: function (resp, xhr, status) {
            if (status.status == 200) {
                console.log(resp);
                const ulElement = document.getElementById('notificationList');
                ulElement.innerHTML = '';

                const notifications = resp.notifications;
                notifications.forEach(note => {

                    const li = document.createElement('li');
                    li.classList.add('list-group-item');
                    li.classList.add('px-5');
                    li.classList.add('py-4');
                    li.classList.add('list-group-item-action');
                    li.style.cursor = 'pointer';

                    li.addEventListener('click', function () {
                        $.ajax({
                            type: 'delete',
                            url: '/delete_notification',
                            data: { id: note.id },
                            success: function (resp, xhr, status) {
                                if (status.status == 200) {
                                    window.location = note.link;
                                }
                            }
                        });
                    });

                    // const a = document.createElement('a');
                    // a.classList.add('text-muted');
                    // a.setAttribute('href', note.link);

                    const divFlex = document.createElement('div');
                    divFlex.classList.add('d-flex');
                    divFlex.classList.add('text-muted');

                    const ms4 = document.createElement('div');
                    ms4.classList.add('ms-4');

                    const p = document.createElement('p');
                    p.classList.add('mb-1');
                    p.append(note.text);

                    const span = document.createElement('span');
                    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                    svgElement.setAttribute('width', '12');
                    svgElement.setAttribute('height', '12');
                    svgElement.setAttribute('fill', 'currentColor');
                    svgElement.setAttribute('viewBox', '0 0 16 16');

                    const pathElement1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    pathElement1.setAttribute('d', 'M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z');

                    const pathElement2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    pathElement2.setAttribute('d', 'M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z');

                    svgElement.appendChild(pathElement1);
                    svgElement.appendChild(pathElement2);
                    span.append(svgElement);

                    const small = document.createElement('small');
                    small.classList.add('ms-2');
                    small.append(note.longAgo);
                    span.append(small);

                    ms4.append(p);
                    ms4.append(span);

                    divFlex.append(ms4);
                    // a.append(divFlex);
                    li.append(divFlex);

                    ulElement.append(li);
                });

                const notificationCountElement = document.getElementById('notificationCount');
                notificationCountElement.innerHTML = resp.numberOfNotifications;

                const notificationMessageElement = document.getElementById('notificationMessage');
                notificationMessageElement.innerHTML = `You have ${resp.numberOfNotifications} unread messages`;
            }
        }
    });
}

function flash() {

    const notificationCountElement = document.getElementById('notificationCount');
    if (notificationCountElement.classList.contains('bg-danger')) {
        notificationCountElement.classList.remove('bg-danger');
        notificationCountElement.classList.add('bg-primary');
    } else {
        notificationCountElement.classList.remove('bg-primary');
        notificationCountElement.classList.add('bg-danger');
    }
}