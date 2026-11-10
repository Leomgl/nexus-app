/* NEXUS passkey UI bootstrap: hide personal content until user verifies. */
'use strict';
try {
  if(localStorage.getItem('nexus_passkey_ui_lock_v1')==='1')
    document.documentElement.classList.add('nexus-lock-pending');
} catch {}
