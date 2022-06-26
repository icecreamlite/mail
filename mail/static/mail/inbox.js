document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);
  document.querySelector('#compose-form').onsubmit = send_email;

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email() {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  document.querySelector('#email-view').style.display = 'none';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
  document.querySelector('#compose-err').innerHTML = '';
}

function load_mailbox(mailbox) {
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;


  fetch_mail(mailbox);
}

function send_email() {
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      recipients: document.querySelector('#compose-recipients').value,
      subject: document.querySelector('#compose-subject').value,
      body: document.querySelector('#compose-body').value
    })
  })
  .then(response => response.json())
  .then(result => {
    console.log(result);
    if (result['message']) {
      load_mailbox('sent');
    } else {
      composeErr = document.querySelector('#compose-err');
      composeErr.innerHTML = result['error'];
      composeErr.style.color = 'red';
    }
  })
  // Catch any errors and log them to the console
  .catch(error => {
    console.log('Error:', error);
  });
  // Prevent default submission
  return false;
}

function fetch_mail(mailbox) {

  // Hide reply and archive buttons if sent mailbox

  if (mailbox === 'sent') {
    document.querySelector('#email-archive').style.display = 'none';
    document.querySelector('#email-reply').style.display = 'none';
  } else {
    document.querySelector('#email-archive').style.display = 'block';
    document.querySelector('#email-reply').style.display = 'block';
  }

  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(result => {
    console.log(result);
    result.forEach(res => {
      const parentDiv = document.createElement('div')
      parentDiv.setAttribute('class', 'list-group');
      const element = document.createElement('div')

      // set bg color
      if (res['read'] === true) {
        element.setAttribute('class', 'list-group-item list-group-item-action list-group-item-dark');
      } else {
        element.setAttribute('class', 'list-group-item list-group-item-action');
      }
      element.innerHTML = `<b>${res['sender']}</b> ${res['subject']}<span style="float:right;">${res['timestamp']}</span>`;

      element.onmouseover = () => {
        element.setAttribute('style', 'cursor:pointer');
      }

      element.onclick = () => {
        view_mail(res);
      }

      document.querySelector('#emails-view').append(parentDiv);
      parentDiv.append(element);
    })
  })

  return false;
}

function view_mail(mail) {
  // Show the email and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'block';

  document.querySelector('#email-from').innerHTML = mail['sender'];
  document.querySelector('#email-to').innerHTML = mail['recipients'];
  document.querySelector('#email-subj').innerHTML = mail['subject'];
  document.querySelector('#email-time').innerHTML = mail['timestamp'];
  document.querySelector('#email-body').innerHTML = mail['body'].replaceAll('\n', '<br>');

  if (!mail.read) {
    fetch(`/emails/${mail.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        read: true
      })
    })
  }

  if (mail.archived) {
    document.querySelector('#email-archive').innerHTML = 'Unarchive';
  } else {
    document.querySelector('#email-archive').innerHTML = 'Archive'
  }

  document.querySelector('#email-archive').onclick = () => {
    fetch(`/emails/${mail.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        archived: !mail.archived
      })
    })
    .then(response => {
      console.log(response);
      load_mailbox('inbox');
    })
  }

  document.querySelector('#email-reply').onclick = () => {
    compose_email();

    // Fill composition fields
    document.querySelector('#compose-recipients').value = mail.sender;

    if (!mail.subject.startsWith('Re: ')) {
      document.querySelector('#compose-subject').value = 'Re: ' + mail.subject;
    } else {
      document.querySelector('#compose-subject').value = mail.subject;
    }

    document.querySelector('#compose-body').value = `\n\nOn ${mail.timestamp}, ${mail.sender} wrote:\n\n` + mail.body;
  }

  return false;
}