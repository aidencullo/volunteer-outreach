// ===== STATE =====
const state = {
  campaigns: JSON.parse(localStorage.getItem('ohq-campaigns') || '[]'),
  volunteers: JSON.parse(localStorage.getItem('ohq-volunteers') || '[]'),
  tasks: JSON.parse(localStorage.getItem('ohq-tasks') || '[]'),
  activity: JSON.parse(localStorage.getItem('ohq-activity') || '[]'),
  editingId: null,
};

function save() {
  localStorage.setItem('ohq-campaigns', JSON.stringify(state.campaigns));
  localStorage.setItem('ohq-volunteers', JSON.stringify(state.volunteers));
  localStorage.setItem('ohq-tasks', JSON.stringify(state.tasks));
  localStorage.setItem('ohq-activity', JSON.stringify(state.activity));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function logActivity(msg) {
  state.activity.unshift({ msg, time: new Date().toISOString() });
  if (state.activity.length > 50) state.activity.length = 50;
  save();
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ===== NAVIGATION =====
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.section).classList.add('active');
  });
});

// ===== THEME =====
const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('ohq-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ohq-theme', next);
});

// ===== MODALS =====
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.modal').classList.add('hidden');
  });
});

document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });
});

// ===== CAMPAIGNS =====
document.getElementById('add-campaign-btn').addEventListener('click', () => {
  state.editingId = null;
  document.getElementById('campaign-modal-title').textContent = 'New Campaign';
  document.getElementById('campaign-form').reset();
  openModal('campaign-modal');
});

document.getElementById('campaign-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const channels = [...document.querySelectorAll('#campaign-form .checkbox-group input:checked')]
    .map(cb => cb.value);

  const data = {
    name: document.getElementById('campaign-name').value.trim(),
    desc: document.getElementById('campaign-desc').value.trim(),
    target: parseInt(document.getElementById('campaign-target').value),
    deadline: document.getElementById('campaign-deadline').value,
    channels,
  };

  if (state.editingId) {
    const idx = state.campaigns.findIndex(c => c.id === state.editingId);
    if (idx !== -1) {
      state.campaigns[idx] = { ...state.campaigns[idx], ...data };
      logActivity(`Updated campaign: ${data.name}`);
      toast('Campaign updated');
    }
  } else {
    state.campaigns.push({ id: uid(), ...data, progress: 0 });
    logActivity(`Created campaign: ${data.name}`);
    toast('Campaign created');
  }

  save();
  closeModal('campaign-modal');
  renderCampaigns();
  renderDashboard();
  populateCampaignSelects();
  state.editingId = null;
});

function renderCampaigns() {
  const list = document.getElementById('campaign-list');
  if (state.campaigns.length === 0) {
    list.innerHTML = '<div class="empty-state">No campaigns yet. Create one to start organizing.</div>';
    return;
  }
  list.innerHTML = state.campaigns.map(c => {
    const doneTasks = state.tasks.filter(t => t.campaignId === c.id && t.status === 'done').length;
    const totalTasks = state.tasks.filter(t => t.campaignId === c.id).length;
    const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    return `
      <div class="campaign-card">
        <h4>${esc(c.name)}</h4>
        <p>${esc(c.desc || 'No description')}</p>
        <div class="campaign-meta">
          <span>Target: ${c.target} contacts</span>
          <span>Deadline: ${c.deadline}</span>
        </div>
        <div class="campaign-channels">
          ${c.channels.map(ch => `<span class="channel-badge ${ch}">${ch}</span>`).join('')}
        </div>
        <div class="campaign-progress"><div class="campaign-progress-fill" style="width:${pct}%"></div></div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.5rem">${doneTasks}/${totalTasks} tasks complete (${pct}%)</div>
        <div class="campaign-actions">
          <button class="btn-secondary" onclick="editCampaign('${c.id}')">Edit</button>
          <button class="btn-danger" onclick="deleteCampaign('${c.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

window.editCampaign = function(id) {
  const c = state.campaigns.find(x => x.id === id);
  if (!c) return;
  state.editingId = id;
  document.getElementById('campaign-modal-title').textContent = 'Edit Campaign';
  document.getElementById('campaign-name').value = c.name;
  document.getElementById('campaign-desc').value = c.desc;
  document.getElementById('campaign-target').value = c.target;
  document.getElementById('campaign-deadline').value = c.deadline;
  document.querySelectorAll('#campaign-form .checkbox-group input').forEach(cb => {
    cb.checked = c.channels.includes(cb.value);
  });
  openModal('campaign-modal');
};

window.deleteCampaign = function(id) {
  const c = state.campaigns.find(x => x.id === id);
  if (!c || !confirm(`Delete campaign "${c.name}"?`)) return;
  state.campaigns = state.campaigns.filter(x => x.id !== id);
  state.tasks = state.tasks.filter(t => t.campaignId !== id);
  logActivity(`Deleted campaign: ${c.name}`);
  save();
  renderCampaigns();
  renderTasks();
  renderDashboard();
  populateCampaignSelects();
  toast('Campaign deleted');
};

// ===== VOLUNTEERS =====
document.getElementById('add-volunteer-btn').addEventListener('click', () => {
  state.editingId = null;
  document.getElementById('volunteer-modal-title').textContent = 'Add Volunteer';
  document.getElementById('volunteer-form').reset();
  populateCampaignSelects();
  openModal('volunteer-modal');
});

document.getElementById('volunteer-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const channels = [...document.querySelectorAll('#volunteer-form .checkbox-group input:checked')]
    .map(cb => cb.value);

  const data = {
    name: document.getElementById('vol-name').value.trim(),
    email: document.getElementById('vol-email').value.trim(),
    channels,
    campaignId: document.getElementById('vol-campaign').value,
  };

  if (state.editingId) {
    const idx = state.volunteers.findIndex(v => v.id === state.editingId);
    if (idx !== -1) {
      state.volunteers[idx] = { ...state.volunteers[idx], ...data };
      logActivity(`Updated volunteer: ${data.name}`);
      toast('Volunteer updated');
    }
  } else {
    state.volunteers.push({ id: uid(), ...data });
    logActivity(`Added volunteer: ${data.name}`);
    toast('Volunteer added');
  }

  save();
  closeModal('volunteer-modal');
  renderVolunteers();
  renderDashboard();
  populateVolunteerSelects();
  state.editingId = null;
});

function renderVolunteers() {
  const tbody = document.getElementById('volunteer-tbody');
  if (state.volunteers.length === 0) {
    tbody.innerHTML = '<tr class="empty-state"><td colspan="5">No volunteers yet. Add one to start building your team.</td></tr>';
    return;
  }
  tbody.innerHTML = state.volunteers.map(v => {
    const camp = state.campaigns.find(c => c.id === v.campaignId);
    return `
      <tr>
        <td>${esc(v.name)}</td>
        <td>${esc(v.email)}</td>
        <td>${v.channels.map(ch => `<span class="channel-badge ${ch}">${ch}</span>`).join(' ')}</td>
        <td>${camp ? esc(camp.name) : '—'}</td>
        <td>
          <button class="btn-secondary" onclick="editVolunteer('${v.id}')" style="margin-right:0.25rem">Edit</button>
          <button class="btn-danger" onclick="deleteVolunteer('${v.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

window.editVolunteer = function(id) {
  const v = state.volunteers.find(x => x.id === id);
  if (!v) return;
  state.editingId = id;
  document.getElementById('volunteer-modal-title').textContent = 'Edit Volunteer';
  document.getElementById('vol-name').value = v.name;
  document.getElementById('vol-email').value = v.email;
  populateCampaignSelects();
  document.getElementById('vol-campaign').value = v.campaignId || '';
  document.querySelectorAll('#volunteer-form .checkbox-group input').forEach(cb => {
    cb.checked = v.channels.includes(cb.value);
  });
  openModal('volunteer-modal');
};

window.deleteVolunteer = function(id) {
  const v = state.volunteers.find(x => x.id === id);
  if (!v || !confirm(`Remove volunteer "${v.name}"?`)) return;
  state.volunteers = state.volunteers.filter(x => x.id !== id);
  logActivity(`Removed volunteer: ${v.name}`);
  save();
  renderVolunteers();
  renderDashboard();
  populateVolunteerSelects();
  toast('Volunteer removed');
};

// ===== TASKS =====
document.getElementById('add-task-btn').addEventListener('click', () => {
  state.editingId = null;
  document.getElementById('task-modal-title').textContent = 'New Task';
  document.getElementById('task-form').reset();
  populateCampaignSelects();
  populateVolunteerSelects();
  openModal('task-modal');
});

document.getElementById('task-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = {
    desc: document.getElementById('task-desc').value.trim(),
    channel: document.getElementById('task-channel').value,
    campaignId: document.getElementById('task-campaign').value,
    volunteerId: document.getElementById('task-volunteer').value,
    status: document.getElementById('task-status').value,
  };

  if (state.editingId) {
    const idx = state.tasks.findIndex(t => t.id === state.editingId);
    if (idx !== -1) {
      state.tasks[idx] = { ...state.tasks[idx], ...data };
      logActivity(`Updated task: ${data.desc}`);
      toast('Task updated');
    }
  } else {
    state.tasks.push({ id: uid(), ...data });
    logActivity(`Created task: ${data.desc}`);
    toast('Task created');
  }

  save();
  closeModal('task-modal');
  renderTasks();
  renderCampaigns();
  renderDashboard();
  state.editingId = null;
});

function renderTasks() {
  ['todo', 'progress', 'done'].forEach(status => {
    const container = document.getElementById(`kanban-${status}`);
    const tasks = state.tasks.filter(t => t.status === status);
    if (tasks.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem;font-style:italic;padding:0.5rem">No tasks</div>';
      return;
    }
    container.innerHTML = tasks.map(t => {
      const vol = state.volunteers.find(v => v.id === t.volunteerId);
      const camp = state.campaigns.find(c => c.id === t.campaignId);
      const buttons = [];
      if (status !== 'todo') buttons.push(`<button class="move-btn" onclick="moveTask('${t.id}','${status === 'done' ? 'progress' : 'todo'}')">&larr;</button>`);
      if (status !== 'done') buttons.push(`<button class="move-btn" onclick="moveTask('${t.id}','${status === 'todo' ? 'progress' : 'done'}')">&rarr;</button>`);
      return `
        <div class="kanban-card">
          <div>${esc(t.desc)}</div>
          <div class="card-meta">
            <span class="channel-badge ${t.channel}">${t.channel}</span>
            <span>${vol ? esc(vol.name) : 'Unassigned'}</span>
          </div>
          ${camp ? `<div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.25rem">${esc(camp.name)}</div>` : ''}
          <div class="card-actions">
            ${buttons.join('')}
            <button class="move-btn" onclick="editTask('${t.id}')">Edit</button>
            <button class="move-btn" onclick="deleteTask('${t.id}')" style="color:var(--accent)">Del</button>
          </div>
        </div>
      `;
    }).join('');
  });
}

window.moveTask = function(id, newStatus) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  t.status = newStatus;
  const label = newStatus === 'todo' ? 'To Do' : newStatus === 'progress' ? 'In Progress' : 'Done';
  logActivity(`Moved "${t.desc}" to ${label}`);
  save();
  renderTasks();
  renderCampaigns();
  renderDashboard();
};

window.editTask = function(id) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  state.editingId = id;
  document.getElementById('task-modal-title').textContent = 'Edit Task';
  document.getElementById('task-desc').value = t.desc;
  document.getElementById('task-channel').value = t.channel;
  populateCampaignSelects();
  populateVolunteerSelects();
  document.getElementById('task-campaign').value = t.campaignId || '';
  document.getElementById('task-volunteer').value = t.volunteerId || '';
  document.getElementById('task-status').value = t.status;
  openModal('task-modal');
};

window.deleteTask = function(id) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  state.tasks = state.tasks.filter(x => x.id !== id);
  logActivity(`Deleted task: ${t.desc}`);
  save();
  renderTasks();
  renderCampaigns();
  renderDashboard();
  toast('Task deleted');
};

// ===== TEMPLATES =====
document.querySelectorAll('.template-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.template-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.template-card').forEach(c => c.classList.add('hidden'));
    tab.classList.add('active');
    document.querySelector(`.template-card[data-channel="${tab.dataset.channel}"]`).classList.remove('hidden');
  });
});

document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.template-card');
    const text = card.querySelector('pre').textContent;
    navigator.clipboard.writeText(text).then(() => toast('Template copied to clipboard'));
  });
});

// ===== DASHBOARD =====
function renderDashboard() {
  document.getElementById('stat-campaigns').textContent = state.campaigns.length;
  document.getElementById('stat-volunteers').textContent = state.volunteers.length;
  document.getElementById('stat-tasks-done').textContent = state.tasks.filter(t => t.status === 'done').length;
  document.getElementById('stat-tasks-total').textContent = state.tasks.length;

  // Channel chart
  const channels = ['email', 'sms', 'social', 'phone'];
  const chart = document.getElementById('channel-chart');
  const counts = channels.map(ch => state.tasks.filter(t => t.channel === ch).length);
  const max = Math.max(...counts, 1);
  chart.innerHTML = channels.map((ch, i) => `
    <div class="bar-row">
      <span class="bar-label">${ch}</span>
      <div class="bar-track"><div class="bar-fill ${ch}" style="width:${(counts[i]/max)*100}%"></div></div>
      <span class="bar-count">${counts[i]}</span>
    </div>
  `).join('');

  // Activity feed
  const feed = document.getElementById('activity-feed');
  if (state.activity.length === 0) {
    feed.innerHTML = '<li class="empty-state">No activity yet. Create a campaign to get started.</li>';
  } else {
    feed.innerHTML = state.activity.slice(0, 20).map(a => {
      const d = new Date(a.time);
      const time = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `<li>${esc(a.msg)}<span class="timestamp">${time}</span></li>`;
    }).join('');
  }
}

// ===== SELECTS =====
function populateCampaignSelects() {
  ['vol-campaign', 'task-campaign'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = el.value;
    el.innerHTML = '<option value="">— None —</option>' +
      state.campaigns.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    el.value = val;
  });
}

function populateVolunteerSelects() {
  const el = document.getElementById('task-volunteer');
  if (!el) return;
  const val = el.value;
  el.innerHTML = '<option value="">— Unassigned —</option>' +
    state.volunteers.map(v => `<option value="${v.id}">${esc(v.name)}</option>`).join('');
  el.value = val;
}

// ===== UTILS =====
function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== INIT =====
renderCampaigns();
renderVolunteers();
renderTasks();
renderDashboard();
populateCampaignSelects();
populateVolunteerSelects();
