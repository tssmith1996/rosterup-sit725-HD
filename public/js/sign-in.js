document.getElementById('signInForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  await performLogin(email, password);
});

// Quick Demo Access — autofills known seeded test accounts and logs straight
// in. Relies on `npm run seed` having been run against the local database
// (see seeds/seed.js for the accounts/passwords this creates).
document.getElementById('demoEmployeeBtn').addEventListener('click', () => {
  performLogin('sarah.jones@test.com', 'Password123!');
});

document.getElementById('demoManagerBtn').addEventListener('click', () => {
  performLogin('john.smith@test.com', 'Password123!');
});

async function performLogin(email, password) {
  const messageBox = document.getElementById('messageBox');
  const submitBtn = document.getElementById('submitBtn');
  const demoEmployeeBtn = document.getElementById('demoEmployeeBtn');
  const demoManagerBtn = document.getElementById('demoManagerBtn');

  // Reflect whichever credentials are being used in the visible fields too,
  // so it's clear to the person watching what's happening.
  document.getElementById('email').value = email;
  document.getElementById('password').value = password;

  submitBtn.disabled = true;
  demoEmployeeBtn.disabled = true;
  demoManagerBtn.disabled = true;
  submitBtn.textContent = 'Signing in...';
  messageBox.className = 'alert-box hidden';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      localStorage.setItem('rosterup_token', data.token);
      localStorage.setItem('rosterup_user', JSON.stringify(data.user));

      if (data.user.role === 'manager') {
        // A manager with no workplace yet (e.g. straight after registering)
        // can't do anything useful on the dashboard — no invite code, no
        // team. Send them to set one up first instead.
        const hasWorkplace = await checkManagerHasWorkplace(data.token);
        window.location.href = hasWorkplace ? 'manager-dashboard.html' : 'manager-workplace-setup.html';
      } else {
        window.location.href = 'employee-dashboard.html';
      }
    } else {
      messageBox.textContent = data.message || 'Could not sign in with this demo account — has "npm run seed" been run?';
      messageBox.className = 'alert-box alert-error';
      submitBtn.disabled = false;
      demoEmployeeBtn.disabled = false;
      demoManagerBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  } catch (err) {
    console.error('Error handling sign-in:', err);
    messageBox.textContent = 'Connection error. Please confirm your database status.';
    messageBox.className = 'alert-box alert-error';
    submitBtn.disabled = false;
    demoEmployeeBtn.disabled = false;
    demoManagerBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
}

// Returns true if the just-signed-in manager already owns a workplace.
// Errs toward the dashboard (true) if the check itself fails, rather than
// risking stranding a manager who does have a workplace on the setup page.
async function checkManagerHasWorkplace(token) {
  try {
    const response = await fetch('/api/workplaces/mine', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return true;

    const data = await response.json();
    return Boolean(data.workplace);
  } catch (err) {
    console.error('Failed to check for an existing workplace:', err);
    return true;
  }
}
