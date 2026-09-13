// Admin CMS JS
document.addEventListener('DOMContentLoaded', () => {

  // Auto-hide flash
  const flash = document.querySelector('.flash');
  if (flash) setTimeout(() => { flash.style.transition='opacity 0.5s'; flash.style.opacity='0'; }, 3500);

  // Inline edit toggle
  document.querySelectorAll('.edit-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('[data-id]');
      const display = row.querySelectorAll('.display-mode');
      const edit = row.querySelectorAll('.edit-mode');
      const isEditing = btn.dataset.editing === '1';
      display.forEach(el => el.style.display = isEditing ? '' : 'none');
      edit.forEach(el => el.style.display = isEditing ? 'none' : '');
      btn.textContent = isEditing ? '✏️ Edit' : '✕ Batal';
      btn.dataset.editing = isEditing ? '0' : '1';
    });
  });

  // Password strength
  const pw = document.getElementById('passwordInput');
  const hint = document.getElementById('passwordHint');
  if (pw && hint) {
    pw.addEventListener('input', () => {
      const v = pw.value;
      if (!v) { hint.textContent=''; return; }
      if (v.length < 6) { hint.textContent='⚠ Terlalu pendek'; hint.style.color='#f87171'; }
      else if (v.length < 10) { hint.textContent='✓ Cukup'; hint.style.color='#fbbf24'; }
      else { hint.textContent='✓ Kuat'; hint.style.color='#34d399'; }
    });
  }
  const pw2 = document.getElementById('confirmInput');
  const hint2 = document.getElementById('confirmHint');
  if (pw && pw2 && hint2) {
    pw2.addEventListener('input', () => {
      if (!pw2.value) { hint2.textContent=''; return; }
      hint2.textContent = pw2.value === pw.value ? '✓ Cocok' : '✗ Tidak cocok';
      hint2.style.color = pw2.value === pw.value ? '#34d399' : '#f87171';
    });
  }

  // Upload zone
  const fileInput = document.getElementById('imageInput');
  const fileLabel = document.getElementById('fileLabel');
  const uploadZone = document.querySelector('.upload-zone');
  if (fileInput && fileLabel && uploadZone) {
    fileInput.addEventListener('change', () => fileLabel.textContent = fileInput.files[0]?.name || 'Pilih file');
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.style.borderColor='var(--gold)'; });
    uploadZone.addEventListener('dragleave', () => uploadZone.style.borderColor='');
    uploadZone.addEventListener('drop', e => {
      e.preventDefault(); uploadZone.style.borderColor='';
      const dt = new DataTransfer(); dt.items.add(e.dataTransfer.files[0]);
      fileInput.files = dt.files;
      fileLabel.textContent = fileInput.files[0]?.name || 'File dijatuhkan';
    });
  }

});
