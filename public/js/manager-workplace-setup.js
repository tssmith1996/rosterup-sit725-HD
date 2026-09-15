document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('rosterup_token');
  if (!token) {
    window.location.href = 'sign-in.html';
    return;
  }

  const userJson = localStorage.getItem('rosterup_user');
  const user = userJson ? JSON.parse(userJson) : null;
  if (!user || user.role !== 'manager') {
    // Only managers create workplaces — send anyone else to their own
    // dashboard rather than 403ing them here.
    window.location.href = user && user.role === 'employee'
      ? 'employee-dashboard.html'
      : 'sign-in.html';
    return;
  }

  document.getElementById('workplaceSetupForm').addEventListener('submit', handleCreateWorkplace);
  document.getElementById('copyBtn').addEventListener('click', handleCopyInviteCode);

  checkExistingWorkplace();
});

// If this manager already has a workplace (e.g. they navigated here
// directly instead of via the post-login redirect), just show their
// existing invite code instead of letting them fill out the form again.
async function checkExistingWorkplace() {
  const token = localStorage.getItem('rosterup_token');

  try {
    const response = await fetch('/api/workplaces/mine', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 401) {
      localStorage.removeItem('rosterup_token');
      localStorage.removeItem('rosterup_user');
      window.location.href = 'sign-in.html';
      return;
    }

    if (!response.ok) return; // stay on the setup form if we can't tell

    const data = await response.json();
    if (data.workplace) {
      document.getElementById('readySubtitle').textContent = 'Your workplace is already set up. Here’s your invite code.';
      showReadyView(data.workplace.invite_code);
    }
  } catch (err) {
    console.error('Failed to check for an existing workplace:', err);
    // Non-fatal — the create form still works even if this check fails.
  }
}

async function handleCreateWorkplace(e) {
  e.preventDefault();

  const messageBox = document.getElementById('messageBox');
  const submitBtn = document.getElementById('submitBtn');
  const token = localStorage.getItem('rosterup_token');

  const payload = {
    workplace_name: document.getElementById('workplaceName').value.trim(),
    workplace_type: document.getElementById('workplaceType').value,
    workplace_address: document.getElementById('workplaceAddress').value.trim(),
    workplace_town: document.getElementById('workplaceTown').value.trim(),
    workplace_postcode: document.getElementById('workplacePostcode').value.trim()
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating...';
  messageBox.className = 'alert-box hidden';

  try {
    const response = await fetch('/api/workplaces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 401) {
      localStorage.removeItem('rosterup_token');
      localStorage.removeItem('rosterup_user');
      window.location.href = 'sign-in.html';
      return;
    }

    const data = await response.json();

    if (response.ok) {
      document.getElementById('readySubtitle').textContent = 'Share this invite code with your team so they can join.';
      showReadyView(data.workplace.invite_code);
    } else {
      messageBox.textContent = data.error || 'Could not create your workplace. Please check the details and try again.';
      messageBox.className = 'alert-box alert-error';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Workplace';
    }
  } catch (err) {
    console.error('Error creating workplace:', err);
    messageBox.textContent = 'Connection error. Please confirm your database status.';
    messageBox.className = 'alert-box alert-error';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Workplace';
  }
}

function showReadyView(inviteCode) {
  document.getElementById('inviteCodeValue').textContent = inviteCode || '—';
  document.getElementById('setupView').classList.add('hidden');
  document.getElementById('readyView').classList.remove('hidden');
}

async function handleCopyInviteCode() {
  const code = document.getElementById('inviteCodeValue').textContent;
  const copyBtn = document.getElementById('copyBtn');

  try {
    await navigator.clipboard.writeText(code);
  } catch (err) {
    console.error('Clipboard copy failed:', err);
  }

  const originalHtml = copyBtn.innerHTML;
  copyBtn.innerHTML = '<span class="material-icons">check</span> Copied!';
  setTimeout(() => { copyBtn.innerHTML = originalHtml; }, 1500);
}
