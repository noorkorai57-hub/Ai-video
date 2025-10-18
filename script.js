// script.js (frontend)
const API_PROXY = '/api/proxy'; // Vercel serverless proxy endpoint

const promptEl = document.getElementById('prompt');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const statusEl = document.getElementById('status');
const loader = document.getElementById('loader');
const progressText = document.getElementById('progressText');
const progressSub = document.getElementById('progressSub');
const resultArea = document.getElementById('resultArea');
const historyList = document.getElementById('historyList');

const STORAGE_KEY = 'hb_video_history_v2';

// helpers
const sleep = (ms)=> new Promise(r=>setTimeout(r,ms));
const loadHistory = ()=> JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const saveHistory = (list)=> localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
const addToHistory = (item)=>{
  const list = loadHistory();
  list.unshift(item);
  saveHistory(list.slice(0,25));
  renderHistory();
};

function escapeHtml(s){ return (s+'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]||c)); }

function renderHistory(){
  const list = loadHistory();
  if(!list.length){
    historyList.innerHTML = '<div style="color:#99a3aa;font-size:13px">No previous videos yet.</div>';
    return;
  }
  historyList.innerHTML = list.map(it=>{
    const t = new Date(it.ts).toLocaleString();
    return `
      <div class="history-item">
        <div class="thumb">▶</div>
        <div class="meta">
          <b>${escapeHtml(it.prompt).slice(0,60)}${it.prompt.length>60?'...':''}</b>
          <small style="color:#98a3aa">${t}</small>
        </div>
        <div class="actions">
          ${it.videoUrl?`<a class="link" href="${it.videoUrl}" target="_blank" data-action="play">Play</a>`:''}
          ${it.videoUrl?`<a class="link" href="${it.videoUrl}" target="_blank" download>Download</a>`:''}
          <button class="link" data-action="remove" data-ts="${it.ts}">Remove</button>
        </div>
      </div>
    `;
  }).join('');
  // attach events
  historyList.querySelectorAll('[data-action]').forEach(btn=>{
    btn.onclick = (e)=>{
      const a = btn.getAttribute('data-action');
      if(a==='remove'){
        const ts = btn.getAttribute('data-ts');
        const filtered = loadHistory().filter(x=>String(x.ts)!==String(ts));
        saveHistory(filtered);
        renderHistory();
      }else if(a==='play'){
        // anchor already goes to video
      }
    };
  });
}

function showLoader(msg, sub){
  loader.hidden = false;
  progressText.textContent = msg || 'Preparing...';
  progressSub.textContent = sub || 'We will check status automatically';
}
function hideLoader(){ loader.hidden = true; }

function showVideo(url, note){
  resultArea.innerHTML = `
    <div class="meta">
      <div style="color:#98a3aa">${note||'Result'}</div>
      <div><a class="link" href="${url}" target="_blank" download>Download</a></div>
    </div>
    <video controls src="${url}"></video>
  `;
}

// backend proxy calls
async function createTask(prompt){
  const url = API_PROXY + '?action=create&prompt=' + encodeURIComponent(prompt);
  const res = await fetch(url, { method:'GET' });
  if(!res.ok) throw new Error('Create failed: ' + res.status);
  return res.json();
}

async function checkStatus(taskId){
  const url = API_PROXY + '?action=status&taskId=' + encodeURIComponent(taskId);
  const res = await fetch(url, { method:'GET' });
  if(!res.ok) throw new Error('Status failed: ' + res.status);
  return res.json();
}

async function pollForVideo(taskId, onProgress){
  const maxChecks = 40;
  for(let i=0;i<maxChecks;i++){
    try{
      const st = await checkStatus(taskId);
      const videoUrl = st.videoUrl || st.url || st.result || st.output || (st.data && st.data.url);
      const statusText = st.status || st.state || st.message || '';
      onProgress({i,st,videoUrl, statusText});
      if(videoUrl) return {videoUrl, raw:st};
    }catch(e){
      onProgress({i,err:e});
    }
    await sleep(2000 + Math.min(i*300, 4000));
  }
  throw new Error('Timeout waiting for video');
}

generateBtn.addEventListener('click', async ()=>{
  const prompt = promptEl.value.trim();
  if(!prompt){ alert('Please write a prompt'); promptEl.focus(); return; }

  // UI reset
  statusEl.textContent = '';
  resultArea.innerHTML = '';

  generateBtn.disabled = true;
  clearBtn.disabled = true;
  try{
    showLoader('Creating video task...', 'Please wait while we create the job');
    const created = await createTask(prompt);
    const taskId = created.taskId || created.id || created.task || (created.data && created.data.taskId);
    if(!taskId){
      hideLoader();
      throw new Error('No task id returned. API response: ' + JSON.stringify(created));
    }
    statusEl.textContent = 'Task created — ID: ' + taskId;
    progressText.textContent = 'Task created. Polling for result...';

    const result = await pollForVideo(taskId, (p)=>{
      if(p.err){
        statusEl.textContent = 'Retrying status...';
        progressText.textContent = `Retrying (${p.i+1})`;
        return;
      }
      progressText.textContent = p.statusText ? p.statusText : `Processing... (${p.i+1})`;
      statusEl.textContent = `Checking status (${p.i+1})`;
    });

    hideLoader();
    statusEl.textContent = '✅ Video ready!';
    showVideo(result.videoUrl, 'Generated from your prompt');

    addToHistory({ prompt, videoUrl: result.videoUrl, ts: Date.now() });

  }catch(err){
    console.error(err);
    hideLoader();
    statusEl.textContent = '❌ Error: ' + (err.message || err);
    resultArea.innerHTML = `<div style="color:#ffb4b4;margin-top:12px">Kuch error hua. Console me details dekho.</div>`;
  }finally{
    generateBtn.disabled = false;
    clearBtn.disabled = false;
  }
});

clearBtn.addEventListener('click', ()=>{ promptEl.value=''; resultArea.innerHTML=''; statusEl.textContent=''; });

renderHistory();
