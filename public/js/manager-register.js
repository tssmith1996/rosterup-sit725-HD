document.getElementById('managerRegisterForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const messageBox = document.getElementById('messageBox');
  const submitBtn = document.getElementById('submitBtn');

  const first_name = document.getElementById('firstName').value.trim();
  const last_name = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Managers don't need a workplace invite code — they create the workplace themselves.
  const role = 'manager';

  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing...';
  messageBox.className = 'alert-box hidden';

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name, last_name, email, password, role })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      messageBox.textContent = 'Account created! Redirecting to sign in — you\'ll set up your workplace next.';
      messageBox.className = 'alert-box alert-success';
      document.getElementById('password').value = '';
      setTimeout(() => { window.location.href = 'sign-in.html'; }, 1200);
    } else {
      messageBox.textContent = data.message || 'An error occurred during registration.';
      messageBox.className = 'alert-box alert-error';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  } catch (err) {
    console.error('Error handling manager registration:', err);
    messageBox.textContent = 'Connection error. Please confirm your database status.';
    messageBox.className = 'alert-box alert-error';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
});
